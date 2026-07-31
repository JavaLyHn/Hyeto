// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4319;
const PROBE_URL = `http://localhost:${PORT}/probe/weather-panel.html`;
// `npx vite` forks vite as its own child and this process's pid ends up
// referring only to the npx wrapper: killing it leaves the real vite server
// running as an orphan (confirmed — it does not exit, it just detaches).
// Spawn the local binary directly so there is exactly one process to kill.
const VITE_BIN = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', 'node_modules', '.bin', 'vite');

// Every wait in this script is bounded. Nothing here may block forever: a
// caller must never need to kill this process by hand.
const SERVER_ATTEMPTS = 40;
const SERVER_POLL_MS = 250;
const SERVER_FETCH_TIMEOUT_MS = 2000;
// --headless=old reliably writes its --dump-dom output within a couple of
// real seconds (the 8000ms budget is virtual time), but the Chrome process
// itself does not reliably exit afterwards — its own shutdown can hang
// indefinitely regardless of how quickly the dump finished. So this bound
// exists purely to detect a probe that never reaches idle at all (a runaway
// timer, or a promise that never settles); once the dump is visible in
// stdout, DOM_SETTLE_MS is all that is needed before it is safe to kill.
const CHROME_DUMP_BOUND_MS = 20_000;
const DOM_SETTLE_MS = 300;
const POLL_MS = 100;
const CHROME_KILL_GRACE_MS = 3_000;

function run(command, args) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  // A piped child whose stdout/stderr nobody reads can deadlock once the OS
  // pipe buffer fills: the child blocks on its own write() and never
  // progresses. Drain both streams unconditionally, even when the caller
  // also wants to capture stdout (chrome does, below, via its own listener
  // registered in addition to this drain-safe default).
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  // A spawn failure (missing binary, bad permissions, wrong CHROME_PATH...)
  // emits an 'error' event; with no listener, Node treats that as unhandled
  // and crashes the whole process immediately — before the try/finally
  // below ever runs — leaving the sibling child orphaned and printing a raw
  // ENOENT stack instead of this script's own message. Record it instead of
  // throwing, so the caller can fail in its own words and cleanup still runs.
  child.spawnError = null;
  child.on('error', error => { child.spawnError = error; });
  return child;
}

async function waitForServer(child, url, attempts = SERVER_ATTEMPTS) {
  for (let index = 0; index < attempts; index += 1) {
    if (child.spawnError) {
      throw new Error(`The dev server failed to start: ${child.spawnError.message}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS) });
      const ok = response.ok;
      // An unconsumed response body keeps its keep-alive socket open, which
      // keeps this process's event loop alive indefinitely — the script would
      // print its verdict and then simply never exit. Release it regardless
      // of status.
      await response.body?.cancel();
      if (ok) return;
    } catch {
      // not up yet, or this attempt's fetch timed out — either way, retry
    }
    await new Promise(resolve => setTimeout(resolve, SERVER_POLL_MS));
  }
  throw new Error(
    `The dev server did not answer at ${url} after ${attempts} attempts. `
    + 'It may have failed to start, or something else is already bound to this port.'
  );
}

// Poll for the child's own exit instead of awaiting its 'exit' event
// indefinitely: an event listener has no timeout of its own, so if the
// child hangs, so does the caller. Returns true if the child exited within
// `boundMs` on its own, false if the bound elapsed first.
async function waitForExit(child, boundMs, pollMs = POLL_MS) {
  const deadline = Date.now() + boundMs;
  while (child.exitCode === null && child.signalCode === null) {
    if (Date.now() >= deadline) return false;
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  return true;
}

// Wait until either the child exits on its own, its accumulated stdout
// contains a complete data-probe attribute and has held still for
// DOM_SETTLE_MS (so a value mid-write is never mistaken for the final one),
// `boundMs` elapses with none of that having happened, or the child never
// spawned at all. Never blocks past `boundMs` regardless of which is true.
async function waitForDumpOrExit(child, getDom, boundMs) {
  const deadline = Date.now() + boundMs;
  let verdictSeenAt = null;
  while (true) {
    if (child.spawnError) return { exited: true, settled: true, spawnError: child.spawnError };
    if (child.exitCode !== null || child.signalCode !== null) return { exited: true, settled: true, spawnError: null };
    if (/data-probe="[^"]*"/.test(getDom())) {
      verdictSeenAt ??= Date.now();
      if (Date.now() - verdictSeenAt >= DOM_SETTLE_MS) return { exited: false, settled: true, spawnError: null };
    } else {
      verdictSeenAt = null;
    }
    if (Date.now() >= deadline) return { exited: false, settled: false, spawnError: null };
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
}

const server = run(VITE_BIN, ['--port', String(PORT), '--strictPort']);
let chrome;
try {
  await waitForServer(server, PROBE_URL);

  // --headless=old is required: the new headless mode never returns from
  // --dump-dom with --virtual-time-budget on this setup.
  chrome = run(CHROME, [
    '--headless=old',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${process.env.TMPDIR ?? '/tmp'}/hyeto-probe-profile`,
    '--virtual-time-budget=8000',
    '--dump-dom',
    PROBE_URL
  ]);

  let dom = '';
  chrome.stdout.on('data', chunk => { dom += chunk; });

  const { exited, settled, spawnError } = await waitForDumpOrExit(chrome, () => dom, CHROME_DUMP_BOUND_MS);
  if (spawnError) {
    throw new Error(
      `Chrome failed to start (${spawnError.message}). Chrome may be missing; set CHROME_PATH.`
    );
  }
  if (!exited) {
    // Either the dump is visible and settled (the common case — Chrome's own
    // shutdown is not worth waiting for) or nothing appeared within the
    // bound at all. Either way, stop waiting on this process and use
    // whatever it already wrote.
    chrome.kill('SIGKILL');
    await waitForExit(chrome, CHROME_KILL_GRACE_MS);
  }

  const verdict = /data-probe="([^"]*)"/.exec(dom)?.[1];
  if (!verdict) {
    if (!settled) {
      throw new Error(
        `Chrome produced no DOM dump within ${CHROME_DUMP_BOUND_MS}ms and was killed. This means `
        + 'the page never reached idle (a runaway timer, or a promise that never resolves or '
        + 'rejects) — it is not the same failure as a missing browser.'
      );
    }
    throw new Error('The probe reported nothing. Chrome may be missing; set CHROME_PATH.');
  }
  if (verdict !== 'OK') {
    throw new Error(`Weather panel DOM probe failed: ${verdict}`);
  }
  console.log('Weather panel DOM probe passed.');
} finally {
  chrome?.kill('SIGKILL');
  server.kill('SIGKILL');
}
