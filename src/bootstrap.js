// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/

const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
const portraitMedia = window.matchMedia('(max-width: 760px) and (orientation: portrait)');

function isXEmbeddedLaunch() {
  const userAgent = navigator.userAgent || '';
  let referrerHost = '';

  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }

  return /Twitter(?:Android| for iPhone)?|com\.twitter|X\.com/i.test(userAgent)
    || /(^|\.)(?:x\.com|twitter\.com|t\.co)$/i.test(referrerHost);
}

const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
const preferredLanguage = requestedLanguage
  || (isXEmbeddedLaunch() ? 'en' : navigator.languages?.[0] || navigator.language || 'en');
const bootstrapLocale = /^zh(?:-|$)/i.test(preferredLanguage) ? 'zh-CN' : 'en';
const gateMessages = {
  'zh-CN': {
    documentTitle: 'Hyeto',
    rotateTitle: '请旋转至横屏',
    rotateDescription: '旋转手机以完整体验 Hyeto',
    rotateSoundSuggestion: '建议开启声音',
    rotateDesktopSuggestion: '电脑端体验更佳',
    rotateBrowserSuggestion: '如果当前页面无法旋转，请轻点“⋮”并选择“在浏览器中打开”'
  },
  en: {
    documentTitle: 'Hyeto · Data into Rain',
    rotateTitle: 'Rotate to landscape',
    rotateDescription: 'Turn your phone sideways for the complete Hyeto experience',
    rotateSoundSuggestion: 'Sound on recommended',
    rotateDesktopSuggestion: 'Best experienced on desktop',
    rotateBrowserSuggestion: 'If this page cannot rotate, tap “⋮” and choose “Open in Browser”'
  }
};

document.documentElement.lang = bootstrapLocale;
document.title = gateMessages[bootstrapLocale].documentTitle;
document.documentElement.dataset.appState = portraitMedia.matches ? 'waiting-landscape' : 'loading';
document.querySelectorAll('[data-i18n]').forEach(element => {
  const message = gateMessages[bootstrapLocale][element.dataset.i18n];
  if (message) element.textContent = message;
});

async function prepareRainAudio() {
  if (!AudioContextConstructor) return null;
  let context;
  try {
    context = new AudioContextConstructor({ latencyHint: 'interactive' });
  } catch {
    context = new AudioContextConstructor();
  }
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(context.destination);

  const response = await fetch('/audio/rain-loop.m4a');
  if (!response.ok) throw new Error(`Rain audio request failed: ${response.status}`);
  const encoded = await response.arrayBuffer();
  const buffer = await context.decodeAudioData(encoded);
  const autoplayPromise = context.state === 'running'
    ? Promise.resolve(true)
    : context.resume().then(() => context.state === 'running').catch(() => false);
  return { context, gain, buffer, autoplayPromise };
}

let bootPromise = null;

function bootHyeto() {
  if (bootPromise) return bootPromise;
  document.documentElement.dataset.appState = 'loading';
  // Expose the pending audio graph before importing the scene so both downloads
  // run concurrently. main.js awaits this promise at module scope instead of
  // reading an already-settled global, which used to serialise the two fetches.
  const audioPromise = prepareRainAudio().catch(() => null);
  window.__rainAudioBoot = audioPromise;

  bootPromise = Promise.all([audioPromise, import('./main.js')])
    .then(() => {
      document.documentElement.dataset.appState = 'ready';
    })
    .catch(error => {
      document.documentElement.dataset.appState = 'error';
      console.error('Hyeto failed to start', error);
    });
  return bootPromise;
}

function handleViewportChange() {
  if (portraitMedia.matches) {
    if (!bootPromise) document.documentElement.dataset.appState = 'waiting-landscape';
    return;
  }
  bootHyeto();
}

handleViewportChange();
if (portraitMedia.addEventListener) {
  portraitMedia.addEventListener('change', handleViewportChange);
} else {
  portraitMedia.addListener(handleViewportChange);
}
window.addEventListener('orientationchange', handleViewportChange, { passive: true });
