# Open-Meteo Weather Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a viewer load real precipitation into the scene — either today's live reading or any historical day — replacing the hand-authored demo curve.

**Architecture:** Two new ES modules. `src/weather-api.js` performs network access and pure response reduction, touching no DOM. `src/weather-panel.js` renders a section inside the existing rainfall editor dialog and touches no `fetch`. `src/main.js` wires them together, injecting `i18n` and callbacks so the dependency direction stays one-way.

**Tech Stack:** Vanilla ES modules, Vite 6, Open-Meteo REST APIs, Node's `node:assert` for the validation script. No new runtime dependencies, no test framework.

**Spec:** `docs/superpowers/specs/2026-07-31-weather-data-design.md`

## Global Constraints

- **No new runtime dependencies.** `package.json` keeps `three` as its only dependency.
- **No API keys.** The site is client-only with no server runtime and no secret environment variables. Only keyless endpoints are permitted.
- **`messages` must stay in `src/main.js`.** `scripts/check-project.mjs` parses it by literal markers `  'zh-CN': {`, `  en: {`, and the closing `\n  }\n};`. Nothing may be added to the object after the `en` block.
- **New i18n keys must be plain alphanumeric identifiers at exactly four-space indentation**, matching `^\s{4}([A-Za-z][A-Za-z0-9]*):`. Every key must exist in both `'zh-CN'` and `en`.
- **Magnitudes are never rescaled or normalised.** The axis displays real mm/h.
- **The 25-point contract is fixed.** `applyRainfallData` throws unless `values.length === 25`.
- **Startup auto-load must never block or delay boot.** The scene renders on the default curve first.
- **`ENABLE_TUNING_CONSOLE` must remain `import.meta.env.DEV`** — asserted by `check-project.mjs`.
- **Every `Required Notice:` line stays verbatim.** Asserted by `check-project.mjs` for `src/main.js` and `src/bootstrap.js`.
- **`build.target` stays `es2022`.** `src/main.js` uses top-level await.
- **Storage keys use the `rf-` prefix.** Do not add the weather key to the `STORAGE` object at `src/main.js:6476` — that object is scoped inside the dev-only tuning console initialiser. Use a module-level constant instead.
- **Run `npm run check` before every commit.** It must pass.

## File Structure

| File | Responsibility |
|---|---|
| `src/weather-api.js` | new — URL building, fetch with timeout/abort, HTTP status to error mapping, pure hourly-series reduction |
| `src/weather-panel.js` | new — the editor section's DOM, city search, date input, shortcuts; no network access |
| `scripts/check-weather-api.mjs` | new — `node:assert` cases driving `weather-api.js` with a fake `fetch` |
| `src/main.js` | i18n keys, panel mounting, startup auto-load, city persistence |
| `index.html` | container element for the panel, inside the editor scroll container |
| `src/styles.css` | panel styles following the `rainfall-editor__*` convention |
| `public/_headers` | three Open-Meteo hosts added to `connect-src` |
| `package.json` | `check` runs the new validation script |
| `THIRD_PARTY_NOTICES.md`, `README.md` | data-source attribution and feature documentation |

---

### Task 1: Pure hourly-series reduction

The reduction from an Open-Meteo hourly payload to the scene's 25 values is the only logic with real branching, so it lands first with tests.

**Files:**
- Create: `src/weather-api.js`
- Create: `scripts/check-weather-api.mjs`
- Modify: `package.json:26`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PRECIPITATION_POINT_COUNT` — the number `25`.
  - `class WeatherError extends Error` with `.code: 'network' | 'notFound' | 'empty' | 'range' | 'rateLimit' | 'shape'` and `.name === 'WeatherError'`.
  - `reduceHourlySeries(hourly, { source, timezone })` → `{ values: number[25], meta: { date: string, source: string, timezone: string, peak: number, gaps: number } }`.

Note: `'shape'` extends the spec's five error codes to six. The spec's validation list requires an error when a series is not 25 points long but does not name its code; Task 7 updates the spec's table to match.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-weather-api.mjs`:

```js
// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
import assert from 'node:assert/strict';
import { PRECIPITATION_POINT_COUNT, WeatherError, reduceHourlySeries } from '../src/weather-api.js';

function hourly(precipitation, startDate = '2026-07-18') {
  return {
    time: precipitation.map((_, index) => `${startDate}T${String(index % 24).padStart(2, '0')}:00`),
    precipitation
  };
}

function expectCode(code, run) {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof WeatherError, `expected a WeatherError, got ${error?.name}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected a WeatherError with code "${code}"`);
}

// 48 returned points reduce to the first 25.
{
  const values = Array.from({ length: 48 }, (_, index) => index * 0.1);
  const result = reduceHourlySeries(hourly(values), { source: 'archive', timezone: 'Asia/Shanghai' });
  assert.equal(result.values.length, PRECIPITATION_POINT_COUNT);
  assert.equal(result.values[0], 0);
  assert.equal(result.values[24].toFixed(1), '2.4');
  assert.equal(result.meta.source, 'archive');
  assert.equal(result.meta.timezone, 'Asia/Shanghai');
  assert.equal(result.meta.date, '2026-07-18');
  assert.equal(result.meta.gaps, 0);
  assert.equal(result.meta.peak.toFixed(1), '2.4');
}

// All-null input raises 'empty'.
expectCode('empty', () =>
  reduceHourlySeries(hourly(Array.from({ length: 25 }, () => null)), { source: 'archive', timezone: 'UTC' }));

// Partial nulls become zeros and are counted.
{
  const values = Array.from({ length: 25 }, (_, index) => (index < 3 ? null : 1.5));
  const result = reduceHourlySeries(hourly(values), { source: 'archive', timezone: 'UTC' });
  assert.equal(result.meta.gaps, 3);
  assert.deepEqual(result.values.slice(0, 3), [0, 0, 0]);
  assert.equal(result.meta.peak, 1.5);
}

// Too few points raises 'shape'.
expectCode('shape', () =>
  reduceHourlySeries(hourly(Array.from({ length: 24 }, () => 1)), { source: 'forecast', timezone: 'UTC' }));

// A negative value raises 'shape'.
{
  const values = Array.from({ length: 25 }, () => 1);
  values[7] = -2;
  expectCode('shape', () => reduceHourlySeries(hourly(values), { source: 'forecast', timezone: 'UTC' }));
}

// A malformed payload raises 'shape'.
expectCode('shape', () => reduceHourlySeries(null, { source: 'forecast', timezone: 'UTC' }));

console.log('Weather API checks passed.');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node scripts/check-weather-api.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/weather-api.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/weather-api.js`:

```js
// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/

export const PRECIPITATION_POINT_COUNT = 25;

export class WeatherError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }
}

// Open-Meteo returns whole days of hourly values. Both callers request two days
// and keep the first 25 points, which is exactly D 00:00-23:00 plus D+1 00:00 —
// the shape applyRainfallData expects. Nulls mean the model has no value for
// that hour; an entirely null day is reported rather than drawn as a clear day.
export function reduceHourlySeries(hourly, { source, timezone }) {
  const times = hourly?.time;
  const amounts = hourly?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(amounts) || amounts.length < PRECIPITATION_POINT_COUNT) {
    throw new WeatherError('shape', `Expected at least ${PRECIPITATION_POINT_COUNT} hourly precipitation points.`);
  }

  const slice = amounts.slice(0, PRECIPITATION_POINT_COUNT);
  if (slice.every(value => value === null || value === undefined)) {
    throw new WeatherError('empty', 'The weather service has no precipitation data for that day.');
  }

  let gaps = 0;
  const values = slice.map(value => {
    if (value === null || value === undefined) {
      gaps += 1;
      return 0;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new WeatherError('shape', 'Precipitation values must be finite and greater than or equal to 0.');
    }
    return numeric;
  });

  return {
    values,
    meta: {
      date: String(times[0] ?? '').slice(0, 10),
      source,
      timezone,
      peak: values.reduce((maximum, value) => Math.max(maximum, value), 0),
      gaps
    }
  };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `node scripts/check-weather-api.mjs`

Expected: `Weather API checks passed.`

- [ ] **Step 5: Wire it into the check pipeline**

In `package.json`, replace the `check` script so the new file runs first:

```json
"check:weather": "node scripts/check-weather-api.mjs",
"check": "npm run check:project && npm run check:weather && npm run build && npm run check:dist"
```

Run: `npm run check`

Expected: all four stages pass.

- [ ] **Step 6: Commit**

```bash
git add src/weather-api.js scripts/check-weather-api.mjs package.json
git commit -m "feat: add hourly precipitation reduction for weather data

Reduces an Open-Meteo hourly payload to the 25 points the scene needs.
An entirely null day raises 'empty' rather than rendering as a clear day,
because a data gap presented as real weather would be fabricated. Partial
nulls become zeros and are counted in meta.gaps so the UI can say so."
```

---

### Task 2: Network layer

**Files:**
- Modify: `src/weather-api.js`
- Modify: `scripts/check-weather-api.mjs`

**Interfaces:**
- Consumes: `WeatherError`, `reduceHourlySeries`, `PRECIPITATION_POINT_COUNT` from Task 1.
- Produces:
  - `geocodeCity(query, { language, signal, fetch })` → `Promise<Array<{ id, name, admin1, country, latitude, longitude }>>`
  - `fetchTodayPrecipitation({ latitude, longitude, signal, fetch })` → `Promise<Result>`
  - `fetchArchivePrecipitation({ latitude, longitude, date, signal, fetch })` → `Promise<Result>`
  - `findWettestRecentDay({ latitude, longitude, days, signal, fetch })` → `Promise<{ date: string, peak: number, total: number }>`

`Result` is Task 1's return shape. `fetch` defaults to `globalThis.fetch` and is a parameter purely so the validation script can drive these without network access.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/check-weather-api.mjs`, before the final `console.log`:

```js
import {
  geocodeCity,
  fetchTodayPrecipitation,
  fetchArchivePrecipitation,
  findWettestRecentDay
} from '../src/weather-api.js';

function fakeFetch({ status = 200, body = {} } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  impl.calls = calls;
  return impl;
}

async function expectAsyncCode(code, run) {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof WeatherError, `expected a WeatherError, got ${error?.name}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected a WeatherError with code "${code}"`);
}

// Geocoding maps results and preserves admin1 for disambiguation.
{
  const fetchImpl = fakeFetch({
    body: {
      results: [
        { id: 1, name: '杭州', admin1: '浙江', country: '中国', latitude: 30.29, longitude: 120.16 },
        { id: 2, name: '杭州', admin1: '四川', country: '中国', latitude: 30.06, longitude: 102.19 }
      ]
    }
  });
  const results = await geocodeCity('杭州', { language: 'zh', fetch: fetchImpl });
  assert.equal(results.length, 2);
  assert.equal(results[0].admin1, '浙江');
  assert.equal(results[1].admin1, '四川');
  assert.ok(fetchImpl.calls[0].startsWith('https://geocoding-api.open-meteo.com/v1/search?'));
  assert.ok(fetchImpl.calls[0].includes('language=zh'));
}

// A query shorter than two characters never reaches the network.
{
  const fetchImpl = fakeFetch();
  assert.deepEqual(await geocodeCity('杭', { fetch: fetchImpl }), []);
  assert.equal(fetchImpl.calls.length, 0);
}

// No geocoding results raises 'notFound'.
await expectAsyncCode('notFound', () =>
  geocodeCity('zzzzzz', { fetch: fakeFetch({ body: { results: [] } }) }));

// HTTP 429 raises 'rateLimit'.
await expectAsyncCode('rateLimit', () =>
  geocodeCity('shanghai', { fetch: fakeFetch({ status: 429 }) }));

// A rejecting fetch raises 'network'.
await expectAsyncCode('network', () =>
  geocodeCity('shanghai', { fetch: async () => { throw new TypeError('blocked'); } }));

// Today's reading uses the forecast host and asks for two days.
{
  const values = Array.from({ length: 48 }, () => 0.5);
  const fetchImpl = fakeFetch({
    body: { timezone: 'Asia/Shanghai', hourly: hourly(values, '2026-07-31') }
  });
  const result = await fetchTodayPrecipitation({ latitude: 31.23, longitude: 121.47, fetch: fetchImpl });
  assert.equal(result.meta.source, 'forecast');
  assert.equal(result.meta.timezone, 'Asia/Shanghai');
  assert.equal(result.values.length, 25);
  assert.ok(fetchImpl.calls[0].startsWith('https://api.open-meteo.com/v1/forecast?'));
  assert.ok(fetchImpl.calls[0].includes('forecast_days=2'));
  assert.ok(fetchImpl.calls[0].includes('timezone=auto'));
}

// A historical day uses the archive host and requests D through D+1.
{
  const values = Array.from({ length: 48 }, () => 1);
  const fetchImpl = fakeFetch({
    body: { timezone: 'Asia/Shanghai', hourly: hourly(values, '2026-07-18') }
  });
  const result = await fetchArchivePrecipitation({
    latitude: 31.23, longitude: 121.47, date: '2026-07-18', fetch: fetchImpl
  });
  assert.equal(result.meta.source, 'archive');
  assert.ok(fetchImpl.calls[0].startsWith('https://archive-api.open-meteo.com/v1/archive?'));
  assert.ok(fetchImpl.calls[0].includes('start_date=2026-07-18'));
  assert.ok(fetchImpl.calls[0].includes('end_date=2026-07-19'));
}

// Month and year rollover in the end_date.
{
  const values = Array.from({ length: 48 }, () => 1);
  const fetchImpl = fakeFetch({ body: { timezone: 'UTC', hourly: hourly(values, '2025-12-31') } });
  await fetchArchivePrecipitation({ latitude: 1, longitude: 1, date: '2025-12-31', fetch: fetchImpl });
  assert.ok(fetchImpl.calls[0].includes('end_date=2026-01-01'));
}

// A malformed date raises 'range' without touching the network.
{
  const fetchImpl = fakeFetch();
  await expectAsyncCode('range', () =>
    fetchArchivePrecipitation({ latitude: 1, longitude: 1, date: '18/07/2026', fetch: fetchImpl }));
  assert.equal(fetchImpl.calls.length, 0);
}

// The wettest-day scan skips incomplete days and returns the highest peak.
{
  const times = [];
  const amounts = [];
  const push = (date, hours) => {
    hours.forEach((value, index) => {
      times.push(`${date}T${String(index).padStart(2, '0')}:00`);
      amounts.push(value);
    });
  };
  push('2026-07-16', Array.from({ length: 24 }, () => 0.2));
  push('2026-07-17', Array.from({ length: 24 }, (_, index) => (index === 5 ? null : 9)));
  push('2026-07-18', Array.from({ length: 24 }, (_, index) => (index === 9 ? 11 : 1)));
  push('2026-07-19', Array.from({ length: 6 }, () => 30));

  const fetchImpl = fakeFetch({ body: { timezone: 'Asia/Shanghai', hourly: { time: times, precipitation: amounts } } });
  const best = await findWettestRecentDay({ latitude: 31.23, longitude: 121.47, days: 60, fetch: fetchImpl });
  assert.equal(best.date, '2026-07-18');
  assert.equal(best.peak, 11);
  assert.equal(best.total, 34);
  assert.ok(fetchImpl.calls[0].includes('past_days=60'));
}

// A dry window raises 'empty'.
{
  const times = Array.from({ length: 24 }, (_, index) => `2026-07-16T${String(index).padStart(2, '0')}:00`);
  const fetchImpl = fakeFetch({
    body: { timezone: 'UTC', hourly: { time: times, precipitation: times.map(() => 0) } }
  });
  await expectAsyncCode('empty', () => findWettestRecentDay({ latitude: 1, longitude: 1, fetch: fetchImpl }));
}
```

Move the two `import` statements to the top of the file, merging them into the existing import from `../src/weather-api.js`.

- [ ] **Step 2: Run to confirm it fails**

Run: `node scripts/check-weather-api.mjs`

Expected: FAIL with `SyntaxError` naming an export that does not exist, e.g. `geocodeCity`.

- [ ] **Step 3: Write the implementation**

Append to `src/weather-api.js`:

```js
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REQUEST_TIMEOUT_MS = 10_000;
const MINIMUM_QUERY_LENGTH = 2;

async function requestJson(url, { signal, fetch: fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetchImpl(url, { signal: controller.signal });
  } catch {
    throw new WeatherError('network', 'Could not reach the weather service.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }

  if (response.status === 429) {
    throw new WeatherError('rateLimit', 'The weather service is rate limiting this client.');
  }
  if (!response.ok) {
    throw new WeatherError('network', `The weather service returned ${response.status}.`);
  }
  return response.json();
}

// Calendar-label arithmetic only: parsing and formatting both happen in UTC, so
// no local timezone ever participates. The API resolves the real zone from the
// coordinates via timezone=auto.
function nextCalendarDay(date) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  if (!parts) {
    throw new WeatherError('range', 'The date must be formatted YYYY-MM-DD.');
  }
  const [, year, month, day] = parts;
  const stamp = Date.UTC(Number(year), Number(month) - 1, Number(day) + 1);
  if (!Number.isFinite(stamp)) {
    throw new WeatherError('range', 'The date is outside the queryable range.');
  }
  return new Date(stamp).toISOString().slice(0, 10);
}

export async function geocodeCity(query, { language = 'en', signal, fetch: fetchImpl } = {}) {
  const trimmed = String(query ?? '').trim();
  if (trimmed.length < MINIMUM_QUERY_LENGTH) return [];

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(trimmed)}`
    + `&count=5&language=${encodeURIComponent(language)}&format=json`;
  const payload = await requestJson(url, { signal, fetch: fetchImpl });
  const results = Array.isArray(payload?.results) ? payload.results : [];
  if (!results.length) {
    throw new WeatherError('notFound', 'No city matched that search.');
  }

  return results.map(result => ({
    id: result.id,
    name: result.name,
    admin1: result.admin1 ?? '',
    country: result.country ?? '',
    latitude: result.latitude,
    longitude: result.longitude
  }));
}

export async function fetchTodayPrecipitation({ latitude, longitude, signal, fetch: fetchImpl } = {}) {
  const url = `${FORECAST_URL}?latitude=${encodeURIComponent(latitude)}`
    + `&longitude=${encodeURIComponent(longitude)}`
    + '&hourly=precipitation&forecast_days=2&timezone=auto';
  const payload = await requestJson(url, { signal, fetch: fetchImpl });
  return reduceHourlySeries(payload?.hourly, {
    source: 'forecast',
    timezone: payload?.timezone ?? 'auto'
  });
}

export async function fetchArchivePrecipitation({ latitude, longitude, date, signal, fetch: fetchImpl } = {}) {
  const endDate = nextCalendarDay(date);
  const url = `${ARCHIVE_URL}?latitude=${encodeURIComponent(latitude)}`
    + `&longitude=${encodeURIComponent(longitude)}`
    + `&start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(endDate)}`
    + '&hourly=precipitation&timezone=auto';
  const payload = await requestJson(url, { signal, fetch: fetchImpl });
  return reduceHourlySeries(payload?.hourly, {
    source: 'archive',
    timezone: payload?.timezone ?? 'auto'
  });
}

export async function findWettestRecentDay({ latitude, longitude, days = 60, signal, fetch: fetchImpl } = {}) {
  const url = `${FORECAST_URL}?latitude=${encodeURIComponent(latitude)}`
    + `&longitude=${encodeURIComponent(longitude)}`
    + `&hourly=precipitation&past_days=${encodeURIComponent(days)}&forecast_days=1&timezone=auto`;
  const payload = await requestJson(url, { signal, fetch: fetchImpl });

  const times = payload?.hourly?.time;
  const amounts = payload?.hourly?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(amounts)) {
    throw new WeatherError('shape', 'The weather service returned an unrecognised hourly payload.');
  }

  const byDate = new Map();
  times.forEach((stamp, index) => {
    const day = String(stamp).slice(0, 10);
    if (!byDate.has(day)) byDate.set(day, []);
    byDate.get(day).push(amounts[index]);
  });

  let best = null;
  for (const [date, hours] of byDate) {
    // Partial days would understate their own peak, so they are skipped rather
    // than competing with complete ones.
    if (hours.length !== 24) continue;
    if (hours.some(value => value === null || value === undefined)) continue;
    const peak = hours.reduce((maximum, value) => Math.max(maximum, Number(value) || 0), 0);
    const total = hours.reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (!best || peak > best.peak) best = { date, peak, total };
  }

  if (!best || best.peak <= 0) {
    throw new WeatherError('empty', 'No rainfall was recorded in the recent window.');
  }
  return best;
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `node scripts/check-weather-api.mjs`

Expected: `Weather API checks passed.`

Then run: `npm run check`

Expected: all stages pass.

- [ ] **Step 5: Commit**

```bash
git add src/weather-api.js scripts/check-weather-api.mjs
git commit -m "feat: add Open-Meteo network layer

Today's reading comes from the forecast host, historical days from the
archive host, and both request two days so the first 25 points line up with
the scene's contract. The only date arithmetic is deriving end_date from
start_date, done entirely in UTC on a calendar label; timezone=auto leaves
the real zone resolution to the API.

findWettestRecentDay skips incomplete days so a partial day cannot
understate its own peak and win by accident."
```

---

### Task 3: CSP hosts and bilingual copy

The panel cannot reach the network until `connect-src` allows it, and cannot render text until the keys exist. Both land before the UI.

**Files:**
- Modify: `public/_headers:2`
- Modify: `src/main.js:29-136` (the `messages` object)

**Interfaces:**
- Consumes: nothing.
- Produces: 17 i18n keys, available through the existing `i18n(key, variables)` helper at `src/main.js:139`.

- [ ] **Step 1: Add the three hosts to the CSP**

In `public/_headers`, the `Content-Security-Policy` line currently contains:

```
connect-src 'self' https://cloudflareinsights.com;
```

Replace that fragment with:

```
connect-src 'self' https://cloudflareinsights.com https://api.open-meteo.com https://archive-api.open-meteo.com https://geocoding-api.open-meteo.com;
```

Change nothing else on the line. Without this the browser blocks every request before it leaves the page.

- [ ] **Step 2: Add the Chinese keys**

In `src/main.js`, inside the `'zh-CN': {` block, immediately before its closing `  },`, add:

```js
    weatherTitle: '天气数据',
    weatherCityLabel: '城市',
    weatherCityPlaceholder: '搜索城市……',
    weatherDateLabel: '日期',
    weatherToday: '今日实时',
    weatherWettest: '最近最强降雨日',
    weatherSearching: '正在搜索……',
    weatherLoading: '正在加载……',
    weatherLoaded: ({ city, date, peak }) => `已加载 ${city} · ${date} · 峰值 ${peak} mm/h`,
    weatherNoRain: '当日无降雨',
    weatherNoRainDefault: '当日无降雨，已显示默认数据',
    weatherGaps: ({ count }) => `${count} 小时数据缺失`,
    weatherErrorNetwork: '无法连接天气服务，请检查网络后重试',
    weatherErrorNotFound: '未找到该城市',
    weatherErrorEmpty: '该日期暂无数据，试试「今日实时」',
    weatherErrorRange: '日期超出可查询范围',
    weatherErrorRateLimit: '请求过于频繁，请稍后再试',
    weatherErrorShape: '天气服务返回了无法识别的数据',
```

- [ ] **Step 3: Add the English keys**

In the same file, inside the `en: {` block, immediately before its closing `  }`, add:

```js
    weatherTitle: 'Weather data',
    weatherCityLabel: 'City',
    weatherCityPlaceholder: 'Search for a city',
    weatherDateLabel: 'Date',
    weatherToday: 'Today, live',
    weatherWettest: 'Wettest recent day',
    weatherSearching: 'Searching…',
    weatherLoading: 'Loading…',
    weatherLoaded: ({ city, date, peak }) => `Loaded ${city} · ${date} · peak ${peak} mm/h`,
    weatherNoRain: 'No rain that day',
    weatherNoRainDefault: 'No rain that day, so the built-in data is shown',
    weatherGaps: ({ count }) => `${count} hours of data are missing`,
    weatherErrorNetwork: 'Could not reach the weather service. Check the network and try again.',
    weatherErrorNotFound: 'No city matched that search',
    weatherErrorEmpty: 'No data for that date. Try "Today, live".',
    weatherErrorRange: 'That date is outside the queryable range',
    weatherErrorRateLimit: 'Too many requests. Try again shortly.',
    weatherErrorShape: 'The weather service returned unrecognisable data',
```

Keys must sit at exactly four spaces of indentation and nothing may be added after the `en` block, or `check-project.mjs` stops finding the object.

- [ ] **Step 4: Verify locale parity**

Run: `npm run check:project`

Expected: `Project checks passed (69 complete translation keys per locale).` The count rises from 52 by 17. If it reports differing keys, one block is missing an entry or an indentation is wrong.

- [ ] **Step 5: Commit**

```bash
git add public/_headers src/main.js
git commit -m "feat: allow Open-Meteo hosts and add weather copy

connect-src gains the forecast, archive and geocoding hosts; without them
the browser blocks every request before it leaves the page.

Seventeen keys land in both locale blocks so check-project.mjs covers them
from the start rather than after the UI is built."
```

---

### Task 4: Panel shell and city search

**Files:**
- Create: `src/weather-panel.js`
- Modify: `index.html:133-138` (inside `.rainfall-editor__scroll`, before the existing `.rainfall-editor__section-heading`)
- Modify: `src/styles.css` (append at end of file)

**Interfaces:**
- Consumes: `geocodeCity` and `WeatherError` from Task 2; the i18n keys from Task 3.
- Produces: `createWeatherPanel({ mount, api, i18n, onApply, setStatus, setError })` → `{ destroy() }`. In this task `onApply` is not yet called; Task 5 adds the paths that call it.

- [ ] **Step 1: Add the mount point**

In `index.html`, directly after `<div class="rainfall-editor__scroll">` on line 133, insert:

```html
            <section
              id="weather-panel"
              class="weather-panel"
              aria-label="天气数据"
              data-i18n-aria-label="weatherTitle"
            ></section>
```

- [ ] **Step 2: Create the panel module**

Create `src/weather-panel.js`:

```js
// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/

const SEARCH_DEBOUNCE_MS = 300;

const ERROR_KEYS = {
  network: 'weatherErrorNetwork',
  notFound: 'weatherErrorNotFound',
  empty: 'weatherErrorEmpty',
  range: 'weatherErrorRange',
  rateLimit: 'weatherErrorRateLimit',
  shape: 'weatherErrorShape'
};

export function createWeatherPanel({ mount, api, i18n, onApply, setStatus, setError }) {
  let searchTimer = 0;
  let pending = null;
  let results = [];
  let activeIndex = -1;
  let selectedCity = null;

  mount.innerHTML = `
    <div class="weather-panel__heading"><h2 data-weather="title"></h2></div>
    <label class="weather-panel__field">
      <span data-weather="cityLabel"></span>
      <input
        type="text"
        class="weather-panel__input"
        data-weather="city"
        role="combobox"
        aria-expanded="false"
        aria-autocomplete="list"
        aria-controls="weather-panel-results"
        autocomplete="off"
      />
    </label>
    <ul id="weather-panel-results" class="weather-panel__results" role="listbox" hidden></ul>
  `;

  const title = mount.querySelector('[data-weather="title"]');
  const cityLabel = mount.querySelector('[data-weather="cityLabel"]');
  const cityInput = mount.querySelector('[data-weather="city"]');
  const resultList = mount.querySelector('#weather-panel-results');

  title.textContent = i18n('weatherTitle');
  cityLabel.textContent = i18n('weatherCityLabel');
  cityInput.placeholder = i18n('weatherCityPlaceholder');

  function reportError(error) {
    const key = error instanceof Error && ERROR_KEYS[error.code];
    setError(i18n(key || 'weatherErrorNetwork'));
  }

  function closeResults() {
    results = [];
    activeIndex = -1;
    resultList.replaceChildren();
    resultList.hidden = true;
    cityInput.setAttribute('aria-expanded', 'false');
    cityInput.removeAttribute('aria-activedescendant');
  }

  function describe(city) {
    return [city.name, city.admin1, city.country].filter(Boolean).join(' / ');
  }

  function paintActive() {
    [...resultList.children].forEach((node, index) => {
      const active = index === activeIndex;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) cityInput.setAttribute('aria-activedescendant', node.id);
    });
  }

  function selectCity(city) {
    selectedCity = city;
    cityInput.value = describe(city);
    closeResults();
    mount.dispatchEvent(new CustomEvent('weather-city-selected', { detail: city }));
  }

  function renderResults(cities) {
    results = cities;
    activeIndex = cities.length ? 0 : -1;
    resultList.replaceChildren(...cities.map((city, index) => {
      const item = document.createElement('li');
      item.id = `weather-panel-result-${index}`;
      item.className = 'weather-panel__result';
      item.setAttribute('role', 'option');
      item.textContent = describe(city);
      item.addEventListener('mousedown', event => {
        event.preventDefault();
        selectCity(city);
      });
      return item;
    }));
    resultList.hidden = cities.length === 0;
    cityInput.setAttribute('aria-expanded', cities.length ? 'true' : 'false');
    paintActive();
  }

  async function search(query) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    setError('');
    setStatus(i18n('weatherSearching'));
    try {
      const cities = await api.geocodeCity(query, {
        language: document.documentElement.lang || 'en',
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      renderResults(cities);
      setStatus('');
    } catch (error) {
      if (controller.signal.aborted) return;
      closeResults();
      setStatus('');
      reportError(error);
    }
  }

  cityInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    const query = cityInput.value.trim();
    if (query.length < 2) {
      closeResults();
      return;
    }
    searchTimer = window.setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
  });

  cityInput.addEventListener('keydown', event => {
    if (resultList.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + step + results.length) % results.length;
      paintActive();
      return;
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      selectCity(results[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeResults();
    }
  });

  return {
    getSelectedCity: () => selectedCity,
    setSelectedCity: city => {
      selectedCity = city;
      cityInput.value = city ? describe(city) : '';
    },
    reportError,
    destroy() {
      window.clearTimeout(searchTimer);
      pending?.abort();
      mount.replaceChildren();
    }
  };
}
```

- [ ] **Step 3: Add the styles**

Append to `src/styles.css`:

```css
.weather-panel {
  display: grid;
  margin-bottom: 18px;
  padding: 14px;
  gap: 10px;
  border: 1px solid rgba(250, 251, 255, 0.1);
  border-radius: 14px;
  background: rgba(250, 251, 255, 0.03);
}

.weather-panel__heading h2 {
  margin: 0;
  color: rgba(228, 234, 245, 0.9);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.weather-panel__field {
  display: grid;
  gap: 5px;
  color: rgba(194, 203, 219, 0.72);
  font-size: 11px;
}

.weather-panel__input,
.weather-panel__date {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(250, 251, 255, 0.14);
  border-radius: 9px;
  background: rgba(10, 12, 16, 0.5);
  color: #fff;
  font: inherit;
  font-size: 12px;
}

.weather-panel__input:focus-visible,
.weather-panel__date:focus-visible,
.weather-panel__button:focus-visible {
  outline: 2px solid rgba(120, 170, 255, 0.8);
  outline-offset: 2px;
}

.weather-panel__results {
  max-height: 168px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border: 1px solid rgba(250, 251, 255, 0.12);
  border-radius: 9px;
  background: rgba(10, 12, 16, 0.72);
  list-style: none;
}

.weather-panel__result {
  padding: 8px 10px;
  color: rgba(218, 225, 238, 0.82);
  font-size: 12px;
  cursor: pointer;
}

.weather-panel__result.is-active,
.weather-panel__result:hover {
  background: rgba(250, 251, 255, 0.09);
  color: #fff;
}

.weather-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weather-panel__button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(250, 251, 255, 0.16);
  border-radius: 999px;
  background: rgba(250, 251, 255, 0.05);
  color: rgba(228, 234, 245, 0.88);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.weather-panel__button:hover:not(:disabled) {
  background: rgba(250, 251, 255, 0.1);
  color: #fff;
}

.weather-panel__button:disabled {
  opacity: 0.45;
  cursor: default;
}
```

- [ ] **Step 4: Verify what is verifiable at this point**

`createWeatherPanel` is not called until Task 6, so the section renders empty for
now. Two things are checkable here:

Run: `npm run check`

Expected: all stages pass. In particular `check-project.mjs` must still find the
`messages` object, and the build must not fail on the new module.

Run: `npm run dev`, open the editor, and confirm the empty `#weather-panel`
element exists above the curve heading in the DOM inspector, with the editor's
scrolling and focus behaviour unchanged.

The search interaction is verified in Task 6, once the panel is mounted.

- [ ] **Step 5: Commit**

```bash
git add src/weather-panel.js index.html src/styles.css
git commit -m "feat: add weather panel shell and city search

The panel owns only its mount subtree and receives i18n, the api module and
status callbacks by injection, so it never queries the editor's status nodes
or imports from main.js.

Results show name / admin1 / country because disambiguation is required:
杭州 matches both 浙江 and 四川."
```

---

### Task 5: Date input, shortcuts and loading

**Files:**
- Modify: `src/weather-panel.js`

**Interfaces:**
- Consumes: `fetchTodayPrecipitation`, `fetchArchivePrecipitation`, `findWettestRecentDay` from Task 2; `createWeatherPanel` from Task 4.
- Produces: `onApply(values, meta)` is now called on every successful manual load. The returned object gains `loadToday(city)` → `Promise<boolean>`, used by Task 6's startup path, resolving `true` when data was applied.

- [ ] **Step 1: Extend the markup**

In `src/weather-panel.js`, append to the `mount.innerHTML` template, after the results `<ul>`:

```html
    <label class="weather-panel__field">
      <span data-weather="dateLabel"></span>
      <input type="date" class="weather-panel__date" data-weather="date" />
    </label>
    <div class="weather-panel__actions">
      <button type="button" class="weather-panel__button" data-weather="today"></button>
      <button type="button" class="weather-panel__button" data-weather="wettest"></button>
    </div>
```

- [ ] **Step 2: Wire the controls**

After the existing element lookups, add:

```js
  const dateLabel = mount.querySelector('[data-weather="dateLabel"]');
  const dateInput = mount.querySelector('[data-weather="date"]');
  const todayButton = mount.querySelector('[data-weather="today"]');
  const wettestButton = mount.querySelector('[data-weather="wettest"]');

  dateLabel.textContent = i18n('weatherDateLabel');
  todayButton.textContent = i18n('weatherToday');
  wettestButton.textContent = i18n('weatherWettest');

  // The archive holds data only through yesterday. This max is an input
  // affordance, not the authoritative check — that is the 'empty' error — so a
  // one-day skew between the browser's zone and the city's is harmless.
  const yesterday = new Date(Date.now() - 86_400_000);
  dateInput.max = yesterday.toISOString().slice(0, 10);

  function requireCity() {
    if (selectedCity) return selectedCity;
    setError(i18n('weatherErrorNotFound'));
    return null;
  }

  function busy(isBusy) {
    todayButton.disabled = isBusy;
    wettestButton.disabled = isBusy;
    dateInput.disabled = isBusy;
  }

  function announce(city, result) {
    const parts = [i18n('weatherLoaded', {
      city: city.name,
      date: result.meta.date,
      peak: result.meta.peak.toFixed(1)
    })];
    if (result.meta.gaps > 0) parts.push(i18n('weatherGaps', { count: result.meta.gaps }));
    if (result.meta.peak === 0) parts.push(i18n('weatherNoRain'));
    setStatus(parts.join(' · '));
  }

  async function run(task) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    setError('');
    setStatus(i18n('weatherLoading'));
    busy(true);
    try {
      return await task(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return null;
      setStatus('');
      reportError(error);
      return null;
    } finally {
      if (!controller.signal.aborted) busy(false);
    }
  }

  async function loadToday(city) {
    const target = city ?? requireCity();
    if (!target) return false;
    const result = await run(signal => api.fetchTodayPrecipitation({
      latitude: target.latitude,
      longitude: target.longitude,
      signal
    }));
    if (!result) return false;
    onApply(result.values, result.meta);
    announce(target, result);
    return true;
  }

  async function loadDate(date) {
    const target = requireCity();
    if (!target || !date) return false;
    const result = await run(signal => api.fetchArchivePrecipitation({
      latitude: target.latitude,
      longitude: target.longitude,
      date,
      signal
    }));
    if (!result) return false;
    onApply(result.values, result.meta);
    announce(target, result);
    return true;
  }

  todayButton.addEventListener('click', () => {
    dateInput.value = '';
    loadToday();
  });

  dateInput.addEventListener('change', () => {
    if (dateInput.value) loadDate(dateInput.value);
  });

  wettestButton.addEventListener('click', async () => {
    const target = requireCity();
    if (!target) return;
    const best = await run(signal => api.findWettestRecentDay({
      latitude: target.latitude,
      longitude: target.longitude,
      signal
    }));
    if (!best) return;
    dateInput.value = best.date;
    await loadDate(best.date);
  });

  mount.addEventListener('weather-city-selected', () => {
    dateInput.value = '';
  });
```

- [ ] **Step 3: Extend the returned object**

Replace Task 4's `return { ... }` block with this one, which adds `loadToday` and
disposes of the new controls:

```js
  return {
    loadToday,
    getSelectedCity: () => selectedCity,
    setSelectedCity: city => {
      selectedCity = city;
      cityInput.value = city ? describe(city) : '';
    },
    reportError,
    destroy() {
      window.clearTimeout(searchTimer);
      pending?.abort();
      mount.replaceChildren();
    }
  };
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open the editor, pick a city, then exercise each control.

Expected: "今日实时" loads today and the status line reports city, date and peak. Picking a past date loads that day. "最近最强降雨日" fills the date box and loads a day with visible rain. Typing today's date into the box produces `该日期暂无数据，试试「今日实时」`. Buttons disable while a request is in flight. Every load leaves the curve draggable.

- [ ] **Step 5: Confirm the pipeline still passes**

Run: `npm run check`

Expected: all stages pass.

- [ ] **Step 6: Commit**

```bash
git add src/weather-panel.js
git commit -m "feat: add date, live and wettest-day loading to the weather panel

Every request carries an AbortController so switching city or re-clicking a
shortcut cancels the previous one instead of racing it.

Typing the current date is not special-cased: the archive simply has no data
past yesterday, so it surfaces as 'empty' and the message points at the live
button. That keeps the timezone boundary out of the code entirely."
```

---

### Task 6: Wire the panel into the scene

**Files:**
- Modify: `src/main.js` — imports near line 5, and a call inside `initRainfallEditor()` at line 6010

**Interfaces:**
- Consumes: `createWeatherPanel` from Task 5, the whole of `weather-api.js`, and the existing `applyRainfallData(values)` at `src/main.js:1303`.
- Produces: nothing further; this is the final wiring.

- [ ] **Step 1: Import both modules**

In `src/main.js`, after the existing `OrbitControls` import on line 6, add:

```js
import * as weatherApi from './weather-api.js';
import { createWeatherPanel } from './weather-panel.js';
```

- [ ] **Step 2: Add the storage constant**

Immediately after `const defaultRainfall = Object.freeze([...]);` and its trailing `let activeRainfall` block (around line 224), add:

```js
// Only the city is remembered. The curve itself is never persisted, so every
// reload still starts from the built-in data. Deliberately not part of the
// STORAGE object further down: that one is scoped inside the dev-only tuning
// console initialiser.
const WEATHER_CITY_STORAGE_KEY = 'rf-weather-city';

function readStoredWeatherCity() {
  try {
    const raw = JSON.parse(localStorage.getItem(WEATHER_CITY_STORAGE_KEY) || 'null');
    if (!raw || typeof raw.name !== 'string') return null;
    if (!Number.isFinite(raw.latitude) || !Number.isFinite(raw.longitude)) return null;
    return {
      name: raw.name,
      admin1: typeof raw.admin1 === 'string' ? raw.admin1 : '',
      country: typeof raw.country === 'string' ? raw.country : '',
      latitude: raw.latitude,
      longitude: raw.longitude
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Mount the panel**

Inside `initRainfallEditor()` at `src/main.js:6010`, after the existing element lookups at the top of the function, add:

```js
  const weatherMount = document.querySelector('#weather-panel');
  let weatherPanel = null;
  if (weatherMount) {
    weatherPanel = createWeatherPanel({
      mount: weatherMount,
      api: weatherApi,
      i18n,
      onApply: values => {
        applyRainfallData(values);
        syncInputs(activeRainfall, false);
      },
      setStatus: message => { rainfallEditorStatus.textContent = message; },
      setError: message => {
        rainfallEditorErrors.textContent = message;
        rainfallEditorErrors.hidden = !message;
      }
    });

    weatherMount.addEventListener('weather-city-selected', event => {
      try {
        localStorage.setItem(WEATHER_CITY_STORAGE_KEY, JSON.stringify(event.detail));
      } catch {
        // Storage being unavailable must not break loading weather.
      }
    });

    const storedCity = readStoredWeatherCity();
    if (storedCity) {
      weatherPanel.setSelectedCity(storedCity);
      // Fire and forget: the scene is already rendering the default curve, and
      // this must never delay boot. A peak of 0 leaves the default curve alone
      // rather than opening on an empty scene.
      weatherPanel.loadToday(storedCity).then(applied => {
        if (applied && rainfallMax === 0) {
          applyRainfallData(defaultRainfall);
          syncInputs(activeRainfall, false);
          rainfallEditorStatus.textContent = i18n('weatherNoRainDefault');
        }
      });
    }
  }
```

- [ ] **Step 4: Add the toolbar failure marker**

The editor dialog is closed on load, so a failed startup request would otherwise
be invisible. Mark the toggle button instead, following the existing
`root.dataset.appState` convention rather than mutating inline styles.

Replace the `setError` callback passed to `createWeatherPanel` with:

```js
      setError: message => {
        rainfallEditorErrors.textContent = message;
        rainfallEditorErrors.hidden = !message;
        rainfallEditorToggle?.toggleAttribute('data-weather-failed', Boolean(message));
      },
```

`rainfallEditorToggle` is the existing module-level constant at `src/main.js:174`.

Append to `src/styles.css`:

```css
.rainfall-editor-toggle[data-weather-failed]::after {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff8080;
  content: '';
}

.rainfall-editor-toggle {
  position: relative;
}
```

Note the toolbar's buttons declare `position: static` at `src/styles.css:330`; the
second rule above overrides that so the dot can be positioned. Append it after the
existing rule so it wins, and do not edit line 330 — the toolbar's flex layout
depends on the buttons not being offset.

- [ ] **Step 5: Verify the startup path manually**

Run: `npm run dev`. Select a city, then reload the page.

Expected: the scene appears immediately on the default curve with no delay, then swaps to the city's data about a second later. Opening the editor shows the city prefilled and the status line naming it. With the network disabled in DevTools, reload: the default curve stays, a red dot appears on the editor toggle, and opening the editor shows the network message.

Confirm in the Network tab that `main.js` and `rain-loop.m4a` still start together — the weather request must not appear before them.

- [ ] **Step 6: Confirm the pipeline passes**

Run: `npm run check`

Expected: all stages pass.

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/styles.css
git commit -m "feat: load remembered city's weather on startup

The panel mounts inside the rainfall editor and writes through callbacks, so
main.js keeps ownership of the status and error elements.

Startup loading is fire-and-forget: the scene renders the default curve
first, protecting the transfer reduction landed in 7826eec. When the live
peak is 0 the default curve is restored instead, so the day's weather cannot
decide the artwork's first impression. A manual load keeps the empty scene,
which is the intended asymmetry recorded in the spec.

The stored city is validated on read, so a stale or hand-edited entry is
discarded rather than breaking boot."
```

---

### Task 7: Documentation and spec reconciliation

**Files:**
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-31-weather-data-design.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Credit the data source**

Append to `THIRD_PARTY_NOTICES.md`, after the existing dependency list:

```markdown
Live and historical precipitation come from [Open-Meteo](https://open-meteo.com/),
used under its free non-commercial terms. Open-Meteo requires no API key and is
queried directly from the browser; no weather data is bundled with this
repository.
```

- [ ] **Step 2: Document the feature**

In `README.md`, add to the `## 功能 / Highlights` list:

```markdown
- 可加载真实降雨数据：今日实时或 1940 年以来任意历史日期 / Load real precipitation: today's live reading or any historical day back to 1940
```

- [ ] **Step 3: Reconcile the spec's error table**

In `docs/superpowers/specs/2026-07-31-weather-data-design.md`, add a row to the error-handling table:

```markdown
| `shape` | the payload is malformed or has fewer than 25 points | the weather service returned unrecognisable data |
```

Also update the `WeatherError` code union in the architecture section to include `'shape'`. The spec's validation list already required an error for a wrong-length series without naming its code; this records the code that was used.

- [ ] **Step 4: Final verification**

Run: `npm run check`

Expected: all stages pass, with 69 translation keys per locale.

Then run `npm run dev` and confirm once more, in a real browser, that: the scene renders; sound still plays; the weather panel loads a live reading and a historical day; and a failed load leaves the curve untouched.

- [ ] **Step 5: Commit**

```bash
git add THIRD_PARTY_NOTICES.md README.md docs/superpowers/specs/2026-07-31-weather-data-design.md
git commit -m "docs: credit Open-Meteo and record the shape error code

The spec required an error for a wrong-length series without naming its
code; the table now lists the 'shape' code the implementation uses."
```

---

## Verification Summary

| Layer | How it is verified |
|---|---|
| Hourly reduction, error mapping, date rollover, wettest-day scan | `scripts/check-weather-api.mjs`, in `npm run check`, no network needed |
| Locale parity for the 17 new keys | existing `check-project.mjs` gate |
| Production safeguards, notices, bundle contents | existing `check-project.mjs` and `check-dist.mjs` |
| Panel interaction, startup timing, visual layout | manual, in a real browser — there is no DOM test environment |

## Risks Carried Forward From the Spec

1. **Reachability of `*.open-meteo.com` from mainland China is unverified.** Test before shipping if the audience is primarily there. The fallback — a keyed Chinese provider behind a proxy — would break the no-server architecture.
2. **The free tier is capped near 10,000 requests/day.** Startup loading means every visit with a saved city issues at least one request.
