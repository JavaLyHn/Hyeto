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
    documentTitle: 'Rainform · 数据成雨',
    rotateTitle: '请旋转至横屏',
    rotateDescription: '旋转手机以完整体验 Rainform 数据成雨',
    rotateSoundSuggestion: '建议开启声音',
    rotateDesktopSuggestion: '电脑端体验更佳',
    rotateBrowserSuggestion: '如果当前页面无法旋转，请轻点“⋮”并选择“在浏览器中打开”'
  },
  en: {
    documentTitle: 'Rainform · Data into Rain',
    rotateTitle: 'Rotate to landscape',
    rotateDescription: 'Turn your phone sideways for the complete Rainform experience',
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

  const response = await fetch('/audio/rain-loop.wav');
  if (!response.ok) throw new Error(`Rain audio request failed: ${response.status}`);
  const encoded = await response.arrayBuffer();
  const buffer = await context.decodeAudioData(encoded);
  const autoplayPromise = context.state === 'running'
    ? Promise.resolve(true)
    : context.resume().then(() => context.state === 'running').catch(() => false);
  return { context, gain, buffer, autoplayPromise };
}

let bootPromise = null;

function bootRainform() {
  if (bootPromise) return bootPromise;
  document.documentElement.dataset.appState = 'loading';
  bootPromise = prepareRainAudio()
    .catch(() => null)
    .then(prepared => {
      window.__rainAudioBoot = prepared;
      return import('./main.js');
    })
    .then(() => {
      document.documentElement.dataset.appState = 'ready';
    })
    .catch(error => {
      document.documentElement.dataset.appState = 'error';
      console.error('Rainform failed to start', error);
    });
  return bootPromise;
}

function handleViewportChange() {
  if (portraitMedia.matches) {
    if (!bootPromise) document.documentElement.dataset.appState = 'waiting-landscape';
    return;
  }
  bootRainform();
}

handleViewportChange();
if (portraitMedia.addEventListener) {
  portraitMedia.addEventListener('change', handleViewportChange);
} else {
  portraitMedia.addListener(handleViewportChange);
}
window.addEventListener('orientationchange', handleViewportChange, { passive: true });
