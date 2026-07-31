// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as weatherApi from './weather-api.js';
import { createWeatherPanel } from './weather-panel.js';

function isXEmbeddedLaunch() {
  const userAgent = navigator.userAgent || '';
  let referrerHost = '';

  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }

  const isXUserAgent = /Twitter(?:Android| for iPhone)?|com\.twitter|X\.com/i.test(userAgent);
  const isXReferrer = /(^|\.)(?:x\.com|twitter\.com|t\.co)$/i.test(referrerHost);
  return isXUserAgent || isXReferrer;
}

const isXEmbedded = isXEmbeddedLaunch();
const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
const preferredLanguage = requestedLanguage
  || (isXEmbedded ? 'en' : navigator.languages?.[0] || navigator.language || 'en');
const locale = /^zh(?:-|$)/i.test(preferredLanguage) ? 'zh-CN' : 'en';
const messages = {
  'zh-CN': {
    documentTitle: 'Hyeto',
    description: 'Hyeto将 24 小时逐时降雨数据转化为可交互的实时粒子雨景。拖动降雨曲线，观察雨幕随数据重塑。',
    socialDescription: 'Hyeto：拖动 24 小时降雨曲线，实时重塑由 Three.js 与 WebGL 驱动的粒子雨幕。',
    socialImageAlt: 'Hyeto生成的液态金属粒子雨幕',
    dashboardAria: 'Hyeto交互式粒子雨幕',
    sceneAria: '可交互的珍珠雨幕数据图',
    canvasAria: '可交互的珍珠雨幕降雨强度图',
    toolbarAria: '图表工具',
    editorToggle: '编辑降雨数据',
    soundEnable: '开启雨声',
    soundDisable: '关闭雨声',
    soundUnavailable: '当前浏览器不支持雨声音频',
    editorTitle: '编辑降雨数据',
    editorDescription: '拖动折线节点即可实时预览，松手后自动保存；也可以展开数字输入进行精确编辑。',
    editorCloseAria: '关闭降雨数据编辑器',
    close: '关闭',
    curveTitle: '逐时降雨曲线',
    liveSave: '实时保存',
    chartAria: '可拖拽降雨折线图',
    chartSvgAria: '00:00 至 24:00 降雨量折线，可上下拖动各小时节点',
    chartHint: '上下拖动节点调整雨量 · 方向键微调 · Shift + 方向键快速调整',
    preciseTitle: '精确输入 25 个时间点',
    preciseUnit: '单位：mm/h',
    inputGridAria: '00:00 至 24:00 的逐时降雨量',
    restoreDefault: '恢复默认',
    applyPrecise: '应用精确数据',
    axisTitle: '降雨强度',
    axisSubtitle: '每小时降水',
    axisUnit: '毫米/小时',
    rotateTitle: '请旋转至横屏',
    rotateDescription: '旋转手机以完整体验 Hyeto',
    rotateSoundSuggestion: '建议开启声音',
    rotateDesktopSuggestion: '电脑端体验更佳',
    rotateBrowserSuggestion: '如果当前页面无法旋转，请轻点“⋮”并选择“在浏览器中打开”',
    rainfallInputAria: ({ time }) => `${time} 降雨量，毫米每小时`,
    chartPointAria: ({ time }) => `${time} 降雨量`,
    rainfallValueText: ({ value }) => `${value} 毫米每小时`,
    savedHour: ({ time }) => `已保存 ${time} 的降雨量。`,
    savedValue: ({ time, value }) => `已保存 ${time} · ${value} mm/h`,
    editorReady: '拖动节点会实时更新雨幕，松手后自动保存。',
    emptyRainfall: '请输入降雨量',
    invalidRainfall: '请输入大于或等于 0 的有限数字',
    invalidCount: ({ count }) => `有 ${count} 个时间点需要修正，已定位到第一处。`,
    applying: '正在重建降雨效果…',
    applied: ({ count, maximum }) => `已应用并保存 ${count} 个时间点，当前最大值 ${maximum} mm/h。`,
    applyFailed: '应用降雨数据失败',
    restored: '已恢复并应用内置默认降雨数据。',
    dataLengthError: ({ count }) => `降雨数据必须包含 ${count} 个时间点`,
    dataValueError: '降雨量必须是大于或等于 0 的有限数字',
    webglTitle: '无法显示实时雨景',
    webglUnavailable: '此设备或浏览器无法创建 WebGL2 图形环境。请升级浏览器，或确认硬件加速已开启。',
    webglInterrupted: '图形环境暂时中断，正在等待浏览器恢复。',
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
    weatherErrorNoCity: '请先选择城市',
    weatherErrorEmpty: '该日期暂无数据，试试「今日实时」',
    weatherErrorRange: '日期超出可查询范围',
    weatherErrorRateLimit: '请求过于频繁，请稍后再试',
    weatherErrorShape: '天气服务返回了无法识别的数据'
  },
  en: {
    documentTitle: 'Hyeto · Data into Rain',
    description: 'Hyeto turns 24 hours of hourly rainfall data into an interactive real-time particle landscape. Drag the rainfall curve to reshape the rain curtain.',
    socialDescription: 'Hyeto turns a 24-hour rainfall curve into a real-time particle landscape powered by Three.js and WebGL.',
    socialImageAlt: 'Hyeto liquid-metal particle rain generated from 24 hours of rainfall data',
    dashboardAria: 'Hyeto interactive rainfall particle landscape',
    sceneAria: 'Interactive particle-based rainfall chart',
    canvasAria: 'Interactive particle-based rainfall intensity chart',
    toolbarAria: 'Chart tools',
    editorToggle: 'Edit rainfall data',
    soundEnable: 'Turn rain sound on',
    soundDisable: 'Turn rain sound off',
    soundUnavailable: 'Rain audio is not supported by this browser',
    editorTitle: 'Edit rainfall data',
    editorDescription: 'Drag a point for a live preview; changes save when released. Expand the fields below for precise input.',
    editorCloseAria: 'Close rainfall data editor',
    close: 'Close',
    curveTitle: 'Hourly rainfall curve',
    liveSave: 'Live save',
    chartAria: 'Draggable rainfall line chart',
    chartSvgAria: 'Rainfall from 00:00 to 24:00; drag each hourly point vertically to adjust it',
    chartHint: 'Drag points vertically · Arrow keys for fine control · Shift + arrow keys for larger steps',
    preciseTitle: 'Enter all 25 data points',
    preciseUnit: 'Unit: mm/h',
    inputGridAria: 'Hourly rainfall from 00:00 to 24:00',
    restoreDefault: 'Restore defaults',
    applyPrecise: 'Apply precise data',
    axisTitle: 'Rainfall intensity',
    axisSubtitle: 'Hourly rainfall',
    axisUnit: 'mm/h',
    rotateTitle: 'Rotate to landscape',
    rotateDescription: 'Turn your phone sideways for the complete Hyeto experience',
    rotateSoundSuggestion: 'Sound on recommended',
    rotateDesktopSuggestion: 'Best experienced on desktop',
    rotateBrowserSuggestion: 'If this page cannot rotate, tap “⋮” and choose “Open in Browser”',
    rainfallInputAria: ({ time }) => `${time} rainfall, millimeters per hour`,
    chartPointAria: ({ time }) => `${time} rainfall`,
    rainfallValueText: ({ value }) => `${value} millimeters per hour`,
    savedHour: ({ time }) => `Saved rainfall at ${time}.`,
    savedValue: ({ time, value }) => `Saved ${time} · ${value} mm/h`,
    editorReady: 'Dragging a point updates the rain live; releasing it saves the change.',
    emptyRainfall: 'Enter a rainfall value',
    invalidRainfall: 'Enter a finite number greater than or equal to 0',
    invalidCount: ({ count }) => `${count} data point${count === 1 ? '' : 's'} need correction. The first has been selected.`,
    applying: 'Rebuilding the rainfall effect…',
    applied: ({ count, maximum }) => `Applied and saved ${count} data points. Current maximum: ${maximum} mm/h.`,
    applyFailed: 'Failed to apply rainfall data',
    restored: 'Restored and applied the built-in rainfall data.',
    dataLengthError: ({ count }) => `Rainfall data must contain ${count} data points`,
    dataValueError: 'Rainfall must be a finite number greater than or equal to 0',
    webglTitle: 'Unable to display the live rain scene',
    webglUnavailable: 'This device or browser could not create a WebGL2 graphics context. Update the browser or make sure hardware acceleration is enabled.',
    webglInterrupted: 'The graphics context was interrupted. Waiting for the browser to restore it.',
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
    weatherErrorNoCity: 'Choose a city first',
    weatherErrorEmpty: 'No data for that date. Try "Today, live".',
    weatherErrorRange: 'That date is outside the queryable range',
    weatherErrorRateLimit: 'Too many requests. Try again shortly.',
    weatherErrorShape: 'The weather service returned unrecognisable data'
  }
};

function i18n(key, variables = {}) {
  const value = messages[locale][key] ?? messages.en[key] ?? key;
  return typeof value === 'function' ? value(variables) : value;
}

function applyDocumentLocale() {
  document.documentElement.lang = locale;
  document.title = i18n('documentTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n('description'));
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', locale === 'zh-CN' ? 'zh_CN' : 'en_US');
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', i18n('documentTitle'));
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', i18n('socialDescription'));
  document.querySelector('meta[property="og:image:alt"]')?.setAttribute('content', i18n('socialImageAlt'));
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', i18n('documentTitle'));
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', i18n('socialDescription'));
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = i18n(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', i18n(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.setAttribute('title', i18n(element.dataset.i18nTitle));
  });
}

applyDocumentLocale();

const root = document.querySelector('#scene-root');
const dashboard = document.querySelector('.rainfall-dashboard');
const sceneToolbar = document.querySelector('#scene-toolbar');
const readout = document.querySelector('#selection-readout');

const readoutTime = readout.querySelector('.readout-time');
const readoutValue = readout.querySelector('.readout-value');
const rainfallEditorToggle = document.querySelector('#rainfall-editor-toggle');
const rainSoundToggle = document.querySelector('#rain-sound-toggle');
const rainfallEditor = document.querySelector('#rainfall-editor');
const rainfallDataForm = document.querySelector('#rainfall-data-form');
const rainfallInputGrid = document.querySelector('#rainfall-input-grid');
const rainfallEditorStatus = document.querySelector('#rainfall-editor-status');
const rainfallEditorErrors = document.querySelector('#rainfall-editor-errors');
const rainfallLineChart = document.querySelector('#rainfall-line-chart');
const rainfallChartTime = document.querySelector('#rainfall-chart-time');
const rainfallChartValue = document.querySelector('#rainfall-chart-value');
const rainfallPreciseEditor = document.querySelector('#rainfall-precise-editor');
root.dataset.locale = locale;
root.dataset.launchContext = isXEmbedded ? 'x-embedded' : 'standard';

function showWebGLFallback(message) {
  let fallback = root.querySelector('.webgl-fallback');
  if (!fallback) {
    fallback = document.createElement('section');
    fallback.className = 'webgl-fallback';
    fallback.setAttribute('role', 'status');
    fallback.setAttribute('aria-live', 'polite');
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    title.textContent = i18n('webglTitle');
    fallback.append(title, detail);
    root.appendChild(fallback);
  }
  fallback.querySelector('span').textContent = message;
  fallback.hidden = false;
}

function hideWebGLFallback() {
  const fallback = root.querySelector('.webgl-fallback');
  if (fallback) fallback.hidden = true;
}

// The visual tuning console is strictly local-development tooling. Production
// builds always tree-shake the panel, its controls and stored tuning readers.
const ENABLE_TUNING_CONSOLE = import.meta.env.DEV;

const defaultRainfall = Object.freeze([
  2.1, 3.8, 4.6, 3.2, 2.5, 5.2, 7.7, 7.4,
  9.3, 9.8, 10.0, 6.7, 6.3, 1.6, 2.2, 3.8,
  5.9, 7.4, 9.1, 10.0, 8.8, 5.3, 3.1, 1.8,
  1.2
]);

// Rainfall edits are intentionally session-only. Every reload starts from the
// built-in curve so an older browser value cannot override the current demo.
let activeRainfall = [...defaultRainfall];
let rainfallMax = Math.max(...activeRainfall);
let axisMax = 12.8;
let peakWaterfallRanges = [];
let rainCeilingValue = axisMax;
let rainCeilingY = 0;

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

const BASE_AXIS_MAX = 12.8;
const VISUAL_RAINFALL_REFERENCE = 10;
const WATER_LEVEL = -0.14;
const RAIN_LAYOUT_SEED = 0x6d2b79f5;
const RAIN_CLUSTER_SEED = 0x2f6e2b1d;
const AMBIENT_RAIN_SEED = 0x53a91d7b;
const DOWNPOUR_RAIN_SEED = 0x31c7af59;
const WATER_LAYOUT_SEED = 0x7a4d31c9;
const IMPACT_LAYOUT_SEED = 0x4c8f6e27;
// Temporary master switch for foam, spray droplets and crown splashes.
// Set this back to true when the splash layer should return.
const SPLASH_IMPACTS_ENABLED = false;
const RAIN_ROLE = {
  BASE: 0,
  AMBIENT: 1,
  DOWNPOUR: 2
};
const CROWN_KIND = {
  RADIAL: 0,
  NEEDLE: 1
};
const WORLD = {
  width: 22.5,
  depth: 10.4,
  frontZ: 4.9,
  backZ: -4.2
};

// 雨幕深度(前后/z 方向)厚度。center=雨帘中心 z，thickness=半厚度。
// 调小 thickness → 从侧面看雨幕更薄、更像一片窄雨帘；调大 → 前后更立体。
const RAIN_DEPTH = { center: 0.2, thickness: 0.85, jitter: 0.22 };

const preparedRainAudio = await window.__rainAudioBoot;
const initialShortViewportEdge = Math.min(window.innerWidth, window.innerHeight);
const initialLongViewportEdge = Math.max(window.innerWidth, window.innerHeight);
const mobileSoundDefault = window.matchMedia('(pointer: coarse)').matches
  || (initialShortViewportEdge <= 500 && initialLongViewportEdge <= 1000);
const rainAudio = {
  enabled: preparedRainAudio?.context?.state === 'running' || mobileSoundDefault,
  started: false,
  context: preparedRainAudio?.context ?? null,
  gain: preparedRainAudio?.gain ?? null,
  buffer: preparedRainAudio?.buffer ?? null,
  preloadPromise: null,
  source: null,
  intentToken: 0,
  sourceToken: 0,
  contextObserved: false
};
const RAIN_SOUND_PLAYBACK_RATE = 1;
const RAIN_SOUND_VOLUME_SCALE = 4.8;
const RAIN_SOUND_MAX_GAIN = 1.8;

function rainSoundStrength() {
  if (rainfallMax <= 0) return 0;
  const mean = activeRainfall.reduce((sum, value) => sum + value, 0) / activeRainfall.length;
  const meanStrength = clamp(mean / VISUAL_RAINFALL_REFERENCE, 0, 1);
  const peakStrength = clamp(rainfallMax / VISUAL_RAINFALL_REFERENCE, 0, 1);
  return clamp(meanStrength * 0.76 + peakStrength * 0.24, 0, 1);
}

function rainSoundTargetVolume() {
  const strength = rainSoundStrength();
  root.dataset.rainSoundStrength = strength.toFixed(3);
  const baseVolume = strength > 0 ? 0.18 + Math.pow(strength, 0.62) * 0.4 : 0;
  return clamp(baseVolume * RAIN_SOUND_VOLUME_SCALE, 0, RAIN_SOUND_MAX_GAIN);
}

function ensureRainAudioGraph() {
  if (!rainAudio.context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    let context;
    try {
      context = new AudioContext({ latencyHint: 'interactive' });
    } catch {
      context = new AudioContext();
    }
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    rainAudio.context = context;
    rainAudio.gain = gain;
  }
  const { context } = rainAudio;
  if (rainAudio.contextObserved) return context;
  rainAudio.contextObserved = true;
  root.dataset.rainSoundEngine = 'web-audio-buffer-loop';
  root.dataset.rainSoundContext = context.state;
  root.dataset.rainSoundBaseLatency = Number.isFinite(context.baseLatency)
    ? context.baseLatency.toFixed(4)
    : 'unknown';
  context.addEventListener('statechange', () => {
    root.dataset.rainSoundContext = context.state;
    if (context.state === 'running' && rainAudio.enabled && rainAudio.source) {
      root.dataset.rainSoundAutoplay = 'playing';
    }
  });
  return context;
}

function setRainSoundVolumeImmediately(targetVolume) {
  const { context, gain } = rainAudio;
  if (!context || !gain) return;
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.value = targetVolume;
  gain.gain.setValueAtTime(targetVolume, now);
  root.dataset.rainSoundGain = targetVolume.toFixed(3);
}

function updateRainSoundFromData() {
  const targetVolume = rainAudio.enabled ? rainSoundTargetVolume() : 0;
  setRainSoundVolumeImmediately(targetVolume);
}

function syncRainSoundButton() {
  if (!rainSoundToggle) return;
  const label = i18n(rainAudio.enabled ? 'soundDisable' : 'soundEnable');
  rainSoundToggle.setAttribute('aria-pressed', String(rainAudio.enabled));
  rainSoundToggle.setAttribute('aria-label', label);
  rainSoundToggle.setAttribute('title', label);
  root.dataset.rainSound = rainAudio.enabled ? 'on' : 'off';
}

function preloadRainSound() {
  const context = ensureRainAudioGraph();
  if (!context) return Promise.reject(new Error('Web Audio is not supported'));
  if (rainAudio.buffer) return Promise.resolve(acceptRainSoundBuffer(rainAudio.buffer));
  if (rainAudio.preloadPromise) return rainAudio.preloadPromise;

  rainAudio.preloadPromise = fetch('/audio/rain-loop.m4a')
    .then(response => {
      if (!response.ok) throw new Error(`Rain audio request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(encoded => context.decodeAudioData(encoded))
    .then(acceptRainSoundBuffer)
    .catch(error => {
      rainAudio.preloadPromise = null;
      throw error;
    });
  return rainAudio.preloadPromise;
}

function acceptRainSoundBuffer(buffer) {
  rainAudio.buffer = buffer;
  root.dataset.rainSoundDuration = buffer.duration.toFixed(3);
  root.dataset.rainSoundLoop = 'seamless-buffer';
  root.dataset.rainSoundLoaded = 'true';
  ensureRainSoundSource(buffer);
  return buffer;
}

function ensureRainSoundSource(buffer = rainAudio.buffer) {
  if (rainAudio.source || !buffer || !rainAudio.context || !rainAudio.gain) {
    return rainAudio.source;
  }
  const source = rainAudio.context.createBufferSource();
  const sourceToken = ++rainAudio.sourceToken;
  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = RAIN_SOUND_PLAYBACK_RATE;
  source.connect(rainAudio.gain);
  source.onended = () => {
    if (sourceToken === rainAudio.sourceToken) rainAudio.source = null;
  };
  source.start();
  rainAudio.source = source;
  rainAudio.started = true;
  root.dataset.rainSoundStarted = 'true';
  root.dataset.rainSoundPlaybackRate = RAIN_SOUND_PLAYBACK_RATE.toFixed(1);

  const canBeAudible = rainAudio.enabled && rainAudio.context.state === 'running';
  setRainSoundVolumeImmediately(canBeAudible ? rainSoundTargetVolume() : 0);
  root.dataset.rainSoundAutoplay = canBeAudible ? 'playing' : 'waiting-for-gesture';
  return source;
}

function stopRainSoundPlayback() {
  const source = rainAudio.source;
  if (!source) return;
  rainAudio.source = null;
  ++rainAudio.sourceToken;
  source.onended = null;
  source.stop();
}

function startRainSoundPlayback(intentToken) {
  const context = ensureRainAudioGraph();
  if (!context) {
    rainAudio.enabled = false;
    syncRainSoundButton();
    return;
  }

  // Resume and loading begin in parallel inside the gesture task. A decoded
  // source is kept alive, so later toggles only touch the gain value.
  const resumePromise = context.state === 'running'
    ? Promise.resolve()
    : context.resume();
  const loadPromise = preloadRainSound();
  setRainSoundVolumeImmediately(rainSoundTargetVolume());

  Promise.all([resumePromise, loadPromise]).then(([, buffer]) => {
    if (intentToken !== rainAudio.intentToken || !rainAudio.enabled) return;
    ensureRainSoundSource(buffer);
    setRainSoundVolumeImmediately(rainSoundTargetVolume());
    root.dataset.rainSoundAutoplay = 'playing';
  }).catch(() => {
    if (intentToken !== rainAudio.intentToken) return;
    setRainSoundVolumeImmediately(0);
    root.dataset.rainSoundAutoplay = 'waiting-for-gesture';
  });
}

function setRainSoundEnabled(enabled) {
  const intentToken = ++rainAudio.intentToken;
  rainAudio.enabled = enabled;
  syncRainSoundButton();

  if (enabled) {
    startRainSoundPlayback(intentToken);
  } else {
    setRainSoundVolumeImmediately(0);
  }
}

function startDefaultRainSound() {
  if (!rainAudio.enabled) return;
  startRainSoundPlayback(rainAudio.intentToken);
}

function toggleRainSound() {
  if (!rainSoundToggle) return;
  setRainSoundEnabled(!rainAudio.enabled);
}

// Pointer activation happens earlier than `click`, which is especially
// noticeable on touch devices. Keep click only for keyboard activation.
rainSoundToggle?.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  toggleRainSound();
});
rainSoundToggle?.addEventListener('click', (event) => {
  if (event.detail === 0) toggleRainSound();
});
const startRainSoundOnFirstGesture = (event) => {
  if (event.target instanceof Element && event.target.closest('#rain-sound-toggle')) return;
  startDefaultRainSound();
};
document.addEventListener('pointerdown', startRainSoundOnFirstGesture, { capture: true, passive: true });
document.addEventListener('keydown', startRainSoundOnFirstGesture);
document.addEventListener('visibilitychange', () => {
  const { context } = rainAudio;
  if (!context) return;
  if (document.hidden) {
    context.suspend().catch(() => {});
  } else if (rainAudio.enabled && rainAudio.started) {
    context.resume().then(() => {
      if (rainAudio.enabled) setRainSoundVolumeImmediately(rainSoundTargetVolume());
    }).catch(() => {});
  }
});
window.addEventListener('pagehide', () => {
  setRainSoundVolumeImmediately(0);
  stopRainSoundPlayback();
}, { once: true });
root.dataset.rainSoundStarted = 'false';
root.dataset.rainSoundLoaded = 'false';
root.dataset.rainSoundProfile = 'procedurally-generated-rain-loop';
syncRainSoundButton();
root.dataset.rainSoundAutoplay = 'waiting-for-gesture';
preloadRainSound().catch(() => {});
preparedRainAudio?.autoplayPromise?.then(allowed => {
  const userAlreadyActed = navigator.userActivation?.hasBeenActive === true;
  if (!allowed || userAlreadyActed || rainAudio.intentToken !== 0 || rainAudio.enabled) return;
  rainAudio.enabled = true;
  syncRainSoundButton();
  setRainSoundVolumeImmediately(rainSoundTargetVolume());
  root.dataset.rainSoundAutoplay = 'playing';
});

const AXIS_CONFIG = {
  worldHeight: 6.6,
  plotWidth: 17,
  z: RAIN_DEPTH.center + RAIN_DEPTH.thickness + 0.32,
  fadeDuration: 0.2,
  dragThreshold: 5
};

// Runtime rainfall metrics are refreshed whenever the user applies a new day.
// The world-space height stays fixed so changing the data never breaks framing;
// only the value represented by that height and the generated rain layers change.
refreshRainfallMetrics();

// GPU ping-pong heightfield for water ripples — a 2D wave equation solved on the
// GPU (discrete Laplacian) so raindrop impacts spread, interfere and decay as
// real waves, instead of independent procedural arcs.
const RIPPLE_FIELD = {
  // Medium-density field: 2.25x the original texel count, with compact impacts.
  resX: 768,
  resZ: 384,
  xMin: -WORLD.width * 0.55,
  xMax: WORLD.width * 0.55,
  zMin: -WORLD.depth * 0.6,
  zMax: WORLD.frontZ * 1.5
};

const PALETTE = {
  fog: 0x000000,
  pearlBright: new THREE.Color(0xd2d8de),
  pearlMid: new THREE.Color(0x8492a2),
  pearlDark: new THREE.Color(0x424e5c),
  waterBright: new THREE.Color(0xa2b0bc),
  waterMid: new THREE.Color(0x5a6878),
  waterDark: new THREE.Color(0x283040)
};

// 把 JS 数字转成 GLSL 的 float 字面量(整数补 ".0")，用于把 TUNING 的值注入着色器。
const glf = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);
const glslVec3 = (rgb) => `vec3(${rgb.map(glf).join(', ')})`;

// ════════════════════════════════════════════════════════════════════════════
// 🎛️  视觉调参面板 TUNING
// ────────────────────────────────────────────────────────────────────────────
// 这里集中了常用视觉参数。改这里 → 保存 → 浏览器自动刷新即可看到效果。
// 每个参数后面都标了：它控制什么、调大会怎样、调小会怎样。
// 快速定位：
// camera 构图视角 | mist 水线雾霭 | pearls 雨珠大小/透明度 | rain 时间分布
// floorGlow 近水提亮 | glint 水面光点 | foam/spray 撞击水花 | water 水面/涟漪
// metalRain 液态金属材质 | waterfallBody 峰值瀑布体积 | waterfallFilaments 瀑布雨丝
// ripple 涟漪物理
// orbit 鼠标旋转/缩放范围
// ════════════════════════════════════════════════════════════════════════════
const TUNING = {
  // ── 图表读数位置 ── 使用世界坐标偏移定位右上角动态读数，随图表一起旋转。
  readout: {
    offsetX: 0,
    offsetY: 0
  },

  // ── 相机视角 ── 整体构图。按屏宽分三档，桌面端用 desktop。
  // pos: 相机位置 [x, y, z]。y 调大更俯视，调小更贴近水面；z 调大更远，调小更近。
  // target: 注视点 [x, y, z]。y 调大画面抬高，调小画面压低。
  // fov: 视野角。调大更广角、空间更夸张；调小更压缩、雨幕更平稳。
  camera: {
    frameTargetYOffset: 1.15,
    desktop: { pos: [-0.27, 3.6, 16.6], target: [-0.27, 2.45, 0.26], fov: 35 },
    tablet: { pos: [-0.27, 4.5, 20.4], target: [-0.27, 3.35, 0.2], fov: 37 },
    mobile: { pos: [-0.27, 4.9, 24.2], target: [-0.27, 3.75, 0.16], fov: 40 }
  },

  // ── 水线雾霭带 ── 水线处的薄雾辉光，跟随降雨强度变化。
  mist: {
    color: 0xabb6bf, // 雾色。调亮会偏银白发光；调暗会更冷、更隐入背景。
    opacity: 0.28, // 雾整体不透明度。调大会水线更亮更奶雾；调小会减少底部光带。
    height: 3.5, // 雾带高度。调大雾往上铺得更高；调小雾更贴近水面。
    reflectionOpacity: 0 // 水线倒影强度。调大会多一层竖向反光；调小会更干净克制。
  },

  // ── 雨珠尺寸 / 透明度 ── 控制珍珠雨点本身。
  pearls: {
    maxPointSize: 1.9, // 近景雨珠最大像素。调大会珠子更圆更显眼；调小会变成更细的雨丝。
    minPointSize: 25.3, // 远景雨珠最小像素。调大会远处仍有颗粒；调小会让远景更暗更轻。
    alpha: 3 // 雨珠整体透明度。调大会雨幕更实；调小会更稀薄、更像雾。
  },

  // ── 雨的时间分布 ── 连续响应真实雨量，控制雨集中在峰值时段，还是铺满全天。
  rain: {
    baseWeight: 0.62, // 低谷权重。只放大已有的小雨，不再给所有非零时段增加固定雨量。
    exponent: 0.05 // 强度曲线偏移。调大会雨更集中在峰值；调小会让分布更均匀。
  },

  // ── 液态金属雨 ── 程序反射带，同时驱动雨珠、雨丝与峰值瀑布。
  metalRain: {
    darkColor: 0x000000,
    midColor: 0xc2cbdb,
    brightColor: 0xfafbff,
    tintColor: 0x0091ff,
    pearlBandFrequency: 5.5,
    pearlBandSpeed: -2.55,
    pearlSpecularPower: 30,
    pearlFresnelStrength: 1.56,
    threadBandDensity: 0.081,
    threadBandSpeed: -0.9,
    threadMirrorStrength: 0.93,
    bodyBandDensity: 5.4,
    bodyBandSpeed: -1.1,
    bodyMirrorStrength: 0.78,
    filamentBandDensity: 2.35,
    filamentBandSpeed: 0.84,
    filamentMirrorStrength: 0.58,
    highlightMirrorStrength: 0.9
  },

  // ── 近水提亮 ── 雨珠靠近水线时的亮度补偿，主要影响底部是否发白。
  floorGlow: {
    base: -0.77, // 普通雨基础提亮。调大会水线附近更亮；调小会压暗底部光带。
    baseByStrength: 0.48, // 普通雨随雨强增加的提亮。调大会暴雨段底部更亮；调小会减少峰值发白。
    lowerCurtain: 0.13, // 低层雨帘额外提亮。调大会底部短雨帘更明显；调小会让它们更隐。
    lowerCurtainByStrength: -0.89, // 低层雨帘随雨强增加的提亮。调大会峰值下沿更亮；调小会更暗。
    downpour: -1.43, // 瀑布雨近水基础提亮。调大会瀑布底部更白；调小会保留暗部。
    downpourByStrength: 0.67, // 瀑布雨随雨强增加的提亮。调大会峰值底部更强；调小会更柔。
    ambient: -0.06 // 背景雨近水提亮。调大会背景水线更有雾光；调小会更干净。
  },

  // ── 水面光点 / 撞击泡沫 ── 水线附近的细碎反光与水花。
  glint: {
    opacity: 3, // 水面光点整体不透明度。调大会水面更闪；调小会更安静。
    alphaMax: 2.13, // 单个光点最亮上限。调大会出现更亮的闪点；调小会削掉刺眼高光。
    maxSize: 62 // 水面光点最大尺寸。调大会反光更大更软；调小会更碎更细。
  },
  foam: {
    opacity: 2.67, // 撞击泡沫透明度。调大会水花白沫更明显；调小会减少落点噪点。
    maxSize: 73.6 // 泡沫粒最大尺寸(px)。调大会白沫更大更软；调小会更细碎。
  },
  spray: {
    opacity: 2.33, // 溅起水滴透明度。调大会飞溅水珠更亮；调小会更低调。
    maxSize: 86.3 // 溅起水滴最大尺寸(px)。调大会飞溅更粗；调小会更针尖。
  },

  // ── 水面底色 / 涟漪显影 ──
  water: {
    deepColor: 0x000000,    // 深水底色。压到接近雾色，水面读作近黑镜面。
    surfaceColor: 0x2b3240, // 表层色，用于近端渐变。
    roughness: 1,           // 磨砂程度。0 接近镜面，1 更柔和、更漫反射。
    specularStrength: 2.5,  // 镜面高光强度。
    rippleHighlight: 3,     // 波峰反光强度。
    surfaceOpacity: 5,      // 水面基础浓度；过高会产生磨砂白雾感。
    wavePrimary: 0,         // 大波顶点位移幅度。
    waveSecondary: 0,       // 小波顶点位移幅度。
    reflStrength: 0.5,      // 雨柱倒影亮度。调大水面镜像更亮(竖条更明显)；调小更隐入黑底。
    reflFade: 2.15,         // 倒影长度(世界单位)。调大倒影拖得更远；调小更紧贴水线。
    rearFadeNearZ: -0.7,    // 后缘渐隐起点。
    rearFadeFarZ: -4.2      // 后缘完全透明的位置，与背景边界一致。
  },

  // ── 峰值瀑布体积 ── 暴雨峰值处的雾状水体和明暗纹理。
  waterfallBody: {
    deepColor: 0x1a1e23, // 暗部色。调亮会减少深色缝隙；调暗会瀑布更有阴影。
    midColor: 0xccd4db, // 中间色。调亮会瀑布整体更白；调暗会更冷灰。
    brightColor: 0x0a0c0f, // 亮部色。调亮会峰值更银白；调暗会减少发光感。
    broadSway: 0, // 大尺度摆动。调大会瀑布左右漂动更明显；调小会更垂直。
    fineSway: 0, // 细节摆动。调大会边缘更活；调小会更稳。
    streakFrequency: 38.1, // 主雨丝密度。调大会竖纹更细密；调小会变成更宽的水柱。
    fineStreakFrequency: 499.6, // 细雨丝密度。调大会细纹更多；调小会更干净。
    streakSharpness: 0.05, // 主雨丝锐度。调大会丝更硬更分明；调小会更糊。
    fineStreakSharpness: 40, // 细雨丝锐度。调大会细线更脆；调小会更柔。
    fineStreakWeight: -2, // 细雨丝占比。调大会纹理更碎；调小会只剩大体积。
    baseMass: 0, // 底部水体质量。调大会底部更厚更亮；调小会更轻。
    riseMass: 0.64, // 向上雾化质量。调大会雾体上升更满；调小会只亮底部。
    cloudLow: 0.68, // 云团暗部系数。调大会暗区变亮；调小会增强明暗对比。
    cloudHigh: 1.05, // 云团亮部系数。调大会亮团更亮；调小会更平。
    gapDarkness: 0.05, // 雨丝缝隙亮度。调大会缝隙变亮更糊；调小会黑缝更清楚。
    streakBrightness: 1.4, // 雨丝亮度。调大会竖向水流更亮；调小会削弱雨丝感。
    bottomFeather: 0.2, // 底边羽化。调大会底部更空、更少波浪伪影；调小会更贴水面。
    opacity: 3 // 体积整体透明度。调大会峰值更亮更密；调小会更轻更透。
  },

  // ── 峰值瀑布雨丝 ── 叠在体积上的竖向水流线。
  waterfallFilaments: {
    edgeWidth: 3, // 普通雨丝宽度。调大会雨丝更粗更软；调小会更细更锐。
    highlightEdgeWidth: 1.75, // 高光雨丝宽度。调大会高光更宽；调小会只留细亮线。
    opacity: 0, // 普通雨丝透明度。调大会瀑布线条更密；调小会体积感更软。
    highlightOpacity: 0.28, // 高光雨丝透明度。调大会前景亮线更强；调小会减少闪烁。
    bottomMistOpacity: 5 // 雨丝底部雾化。调大会落点更白雾；调小会底部更清爽。
  },

  // ── 水面涟漪(GPU 高度场波动) ──
  ripple: {
    gain: 0,       // 涟漪亮度增益。调大会环纹更亮更明显；调小会更隐。
    damping: 0.9999, // 波衰减。调大会波传播更久；调小会更快消失。
    dropRain: 1.51, // 普通雨滴涟漪强度。调大会每滴雨更容易出圈；调小会更平静。
    dropClick: 0.95, // 点击涟漪强度。
    displace: 0.012 // 涟漪顶点位移幅度，太大会在掠射角下产生条纹。
  },

  // ── 3D 轨道相机(鼠标拖拽旋转 + 滚轮缩放) ──
  orbit: {
    minDistance: 9, // 滚轮最近距离。调小可以拉得更近；调大会限制近距离观察。
    maxDistance: 30, // 滚轮最远距离。调大可以退得更远；调小会锁住构图。
    azimuthDeg: 60, // 左右旋转范围。调大会能转到更多侧面；调小会更接近固定正面。
    minPolarDeg: 52, // 最俯视角。调小更能从上往下看水面；调大更低视角。
    maxPolarDeg: 93, // 最仰视角。调大可更贴水面仰看；调小会限制低角度。
    damping: 0.08 // 旋转惯性阻尼。调大会拖拽更黏更慢；调小会更灵敏。
  }
};

const DEFAULT_TUNING = JSON.parse(JSON.stringify(TUNING));

// 面板保存的「需刷新生效」参数，在 shader 构建前覆盖
;(function () {
  if (!ENABLE_TUNING_CONSOLE) return;
  const saved = localStorage.getItem('rf-tuning');
  if (!saved) return;
  try {
    for (const [path, val] of Object.entries(JSON.parse(saved))) {
      // 旧版读数是屏幕悬浮层，不继承像素定位值到新的三维世界坐标。
      if (path === 'readout.right' || path === 'readout.bottom' || path === 'readout.top') continue;
      const p = path.split('.'); let o = TUNING;
      for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
      o[p[p.length - 1]] = val;
    }
    // Initial and reset views must remain exactly front-on even when an older
    // local tuning snapshot contains the former low, upward-looking camera.
    for (const profileName of ['desktop', 'tablet', 'mobile']) {
      const profile = TUNING.camera[profileName];
      profile.pos[0] = profile.target[0];
      profile.pos[1] = profile.target[1] + TUNING.camera.frameTargetYOffset;
    }
  } catch {}
})();

const GLOBAL_THEME_STORAGE_KEY = 'rf-global-theme-v1';

function normalizeThemeHex(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(0xffffff, Math.round(value)));
  }
  const text = String(value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(text) ? parseInt(text, 16) : 0x000000;
}

function themeHexCss(value) {
  return `#${(Number(value) >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
}

function themeRgb(value) {
  const numeric = Number(value) >>> 0;
  return `${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}`;
}

function mixThemeColor(from, to, amount) {
  return new THREE.Color(from).lerp(new THREE.Color(to), clamp(amount, 0, 1)).getHex();
}

function deriveGlobalTheme(baseColor) {
  const base = normalizeThemeHex(baseColor);
  if (base === 0x000000) {
    return {
      base,
      backgroundTop: 0x000000,
      backgroundMid: 0x000000,
      backgroundBottom: 0x000000,
      fog: 0x000000,
      shadow: 0x000000,
      panel: 0x080c14,
      panelTop: 0x1c2230,
      panelBottom: 0x060910,
      accent: 0x0091ff,
      textStrong: 0xfafbff,
      textMid: 0xc2cbdb,
      textSoft: 0x8f9db8,
      axisLine: 0xe5e9f0,
      axisTick: 0xc2cbdb,
      axisStrong: 0xffffff,
      axisTime: 0xdce2eb,
      axisValue: 0xf4f6fa,
      axisUnit: 0xb8c1cf,
      metalDark: 0x000000,
      metalMid: 0xc2cbdb,
      metalBright: 0xfafbff,
      metalTint: 0x0091ff,
      waterDeep: 0x000000,
      waterSurface: 0x2b3240,
      mist: 0xabb6bf,
      waterfallDeep: 0x1a1e23,
      waterfallMid: 0xccd4db,
      waterfallBright: 0x0a0c0f
    };
  }

  const linear = new THREE.Color(base);
  const luminance = linear.r * 0.2126 + linear.g * 0.7152 + linear.b * 0.0722;
  const contrast = luminance > 0.42 ? 0x000000 : 0xffffff;
  // Controls stay on a dark frosted surface even when the selected scene
  // color is bright; the chart itself still switches contrast automatically.
  const panel = mixThemeColor(base, 0x000000, 0.7);

  return {
    base,
    backgroundTop: mixThemeColor(base, contrast, 0.035),
    backgroundMid: base,
    backgroundBottom: mixThemeColor(base, 0x000000, 0.24),
    fog: mixThemeColor(base, 0x000000, 0.18),
    shadow: 0x000000,
    panel,
    panelTop: mixThemeColor(panel, 0xffffff, 0.09),
    panelBottom: mixThemeColor(panel, 0x000000, 0.38),
    accent: mixThemeColor(base, contrast, 0.56),
    textStrong: mixThemeColor(base, 0xffffff, 0.95),
    textMid: mixThemeColor(base, 0xffffff, 0.76),
    textSoft: mixThemeColor(base, 0xffffff, 0.58),
    axisLine: mixThemeColor(base, contrast, 0.9),
    axisTick: mixThemeColor(base, contrast, 0.72),
    axisStrong: mixThemeColor(base, contrast, 0.98),
    axisTime: mixThemeColor(base, contrast, 0.84),
    axisValue: mixThemeColor(base, contrast, 0.94),
    axisUnit: mixThemeColor(base, contrast, 0.66),
    metalDark: mixThemeColor(base, contrast, 0.08),
    metalMid: mixThemeColor(base, contrast, 0.64),
    metalBright: mixThemeColor(base, contrast, 0.96),
    metalTint: mixThemeColor(base, contrast, 0.34),
    waterDeep: mixThemeColor(base, contrast, 0.035),
    waterSurface: mixThemeColor(base, contrast, 0.24),
    mist: mixThemeColor(base, contrast, 0.62),
    waterfallDeep: mixThemeColor(base, contrast, 0.12),
    waterfallMid: mixThemeColor(base, contrast, 0.68),
    waterfallBright: mixThemeColor(base, contrast, 0.92)
  };
}

function loadGlobalThemeColor() {
  if (!ENABLE_TUNING_CONSOLE) return 0x000000;
  try {
    return normalizeThemeHex(localStorage.getItem(GLOBAL_THEME_STORAGE_KEY) || '#000000');
  } catch {
    return 0x000000;
  }
}

function globalThemeTuningValues(theme) {
  return {
    'metalRain.darkColor': theme.metalDark,
    'metalRain.midColor': theme.metalMid,
    'metalRain.brightColor': theme.metalBright,
    'metalRain.tintColor': theme.metalTint,
    'water.deepColor': theme.waterDeep,
    'water.surfaceColor': theme.waterSurface,
    'mist.color': theme.mist,
    'waterfallBody.deepColor': theme.waterfallDeep,
    'waterfallBody.midColor': theme.waterfallMid,
    'waterfallBody.brightColor': theme.waterfallBright
  };
}

function applyGlobalThemeCss(theme) {
  const style = document.documentElement.style;
  const themedSurfaceAlpha = theme.base === 0x000000 ? 0.72 : 0.9;
  const themedSurfaceBottomAlpha = theme.base === 0x000000 ? 0.8 : 0.94;
  style.setProperty('--background-top', themeHexCss(theme.backgroundTop));
  style.setProperty('--background-mid', themeHexCss(theme.backgroundMid));
  style.setProperty('--background-bottom', themeHexCss(theme.backgroundBottom));
  style.setProperty('--model-metal-dark', themeHexCss(theme.metalDark));
  style.setProperty('--model-metal-mid', themeHexCss(theme.metalMid));
  style.setProperty('--model-metal-bright', themeHexCss(theme.metalBright));
  style.setProperty('--model-metal-tint', themeHexCss(theme.metalTint));
  style.setProperty('--theme-highlight-rgb', themeRgb(theme.textMid));
  style.setProperty('--theme-shadow-rgb', themeRgb(theme.shadow));
  style.setProperty('--theme-panel-rgb', themeRgb(theme.panel));
  style.setProperty('--panel-surface-top', `rgba(${themeRgb(theme.panelTop)}, ${themedSurfaceAlpha})`);
  style.setProperty('--panel-surface-bottom', `rgba(${themeRgb(theme.panelBottom)}, ${themedSurfaceBottomAlpha})`);
  style.setProperty('--panel-border', `rgba(${themeRgb(theme.textStrong)}, 0.17)`);
  style.setProperty('--panel-divider', `rgba(${themeRgb(theme.textStrong)}, 0.1)`);
  style.setProperty('--panel-card-border', `rgba(${themeRgb(theme.textStrong)}, 0.13)`);
  style.setProperty('--panel-control-bg', `rgba(${themeRgb(theme.textStrong)}, 0.055)`);
  style.setProperty('--panel-control-hover', `rgba(${themeRgb(theme.textStrong)}, 0.1)`);
  style.setProperty('--panel-text-main', `rgba(${themeRgb(theme.textStrong)}, 0.94)`);
  style.setProperty('--panel-text-soft', `rgba(${themeRgb(theme.textMid)}, 0.58)`);
  style.setProperty('--panel-accent', `rgba(${themeRgb(theme.accent)}, 0.78)`);
  style.setProperty('--panel-accent-soft', `rgba(${themeRgb(theme.accent)}, 0.14)`);
}

function applyGlobalThemePalette(theme) {
  PALETTE.fog = theme.fog;
  PALETTE.pearlBright.setHex(theme.metalBright);
  PALETTE.pearlMid.setHex(theme.metalMid);
  PALETTE.pearlDark.setHex(theme.metalDark);
  PALETTE.waterBright.setHex(theme.mist);
  PALETTE.waterMid.setHex(theme.waterSurface);
  PALETTE.waterDark.setHex(theme.waterDeep);
}

let globalThemeColor = loadGlobalThemeColor();
let globalThemePalette = deriveGlobalTheme(globalThemeColor);
applyGlobalThemeCss(globalThemePalette);
applyGlobalThemePalette(globalThemePalette);

function applyReadoutPosition() {
  const offsetX = Number(TUNING.readout.offsetX) || 0;
  const offsetY = Number(TUNING.readout.offsetY) || 0;
  if (axisSystem?.readout) {
    axisSystem.readout.mesh.position.set(
      axisSystem.readout.anchorX + offsetX,
      axisSystem.readout.anchorY + offsetY,
      axisSystem.readout.anchorZ
    );
  }
  root.dataset.readoutMode = 'world-space-rotating';
  root.dataset.readoutOffsetX = String(offsetX);
  root.dataset.readoutOffsetY = String(offsetY);
  delete root.dataset.readoutBottom;
  delete root.dataset.readoutRight;
  delete root.dataset.readoutTop;
}

const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function isPhoneLandscapeViewport() {
  const shortEdge = Math.min(window.innerWidth, window.innerHeight);
  const longEdge = Math.max(window.innerWidth, window.innerHeight);
  return window.innerWidth > window.innerHeight && shortEdge <= 500 && longEdge <= 1000;
}

function targetRendererPixelRatio() {
  const cap = isPhoneLandscapeViewport() ? 2 : isCoarsePointer ? 1.65 : 1.75;
  return Math.min(window.devicePixelRatio || 1, cap);
}

// Mobile screens render far fewer pixels than the desktop canvas, so they can
// keep the same scene density without the old, visibly sparse particle tier.
// Only cap raster resolution slightly lower to control fill-rate and heat.
let pixelRatio = targetRendererPixelRatio();

// 🎛️ 粒子密度 / 性能参数。左边是触屏设备，右边是桌面设备。
// chains: 主雨串数量，调大会雨幕更密但更耗性能。
// ambientChains: 背景细雨数量，调大会全天氛围更满。
// downpourChains: 暴雨峰值雨串数量，调大会峰值段更像瀑布。
// waterfallFilaments: 瀑布竖向雨丝数量，调大会峰值线条更丰富。
// waterGlints: 水面反光点数量，调大会水面更闪。
// impactPearls: 撞击水花粒子池大小，调大会水花更不容易断档。
// impactEventsPerSecond: 每秒水花事件预算，调大会落点更热闹。
// rippleEventsPerSecond: 每秒涟漪事件预算，调大会水面环纹更多。
// maxRipples: 兼容旧数据标记，当前 GPU 涟漪系统主要使用 rippleEventsPerSecond。
const QUALITY = isCoarsePointer
  ? {
    chains: 2000,
    ambientChains: 800,
    downpourChains: 1400,
    waterfallFilaments: 1900,
    waterGlints: 0,
    impactPearls: 3100,
    impactEventsPerSecond: 160,
    rippleEventsPerSecond: 28,
    maxRipples: 22
  }
  : {
    chains: 2000,
    ambientChains: 800,
    downpourChains: 1400,
    waterfallFilaments: 1900,
    waterGlints: 0,
    impactPearls: 7600,
    impactEventsPerSecond: 520,
    rippleEventsPerSecond: 60,
    maxRipples: 42
  };

const DEFAULT_QUALITY = { ...QUALITY };
;(function () {
  if (!ENABLE_TUNING_CONSOLE) return;
  try {
    const saved = JSON.parse(localStorage.getItem('rf-quality') || '{}');
    for (const [key, value] of Object.entries(saved)) {
      if (key in QUALITY && Number.isFinite(Number(value))) {
        QUALITY[key] = Math.max(0, Math.round(Number(value)));
      }
    }
  } catch {}
})();

const FEATURES = {
  showAxes: true,
  showWater: true,
  showMist: true,
  showRainLines: true,
  showPearls: true,
  showWaterGlints: true,
  showImpacts: SPLASH_IMPACTS_ENABLED,
  showPeakWaterfall: false
};
const DEFAULT_FEATURES = { ...FEATURES };
;(function () {
  if (!ENABLE_TUNING_CONSOLE) return;
  try {
    const saved = JSON.parse(localStorage.getItem('rf-features') || '{}');
    for (const [key, value] of Object.entries(saved)) {
      if (key in FEATURES) FEATURES[key] = Boolean(value);
    }
  } catch {}
})();
FEATURES.showImpacts = FEATURES.showImpacts && SPLASH_IMPACTS_ENABLED;

const state = {
  pointerActive: false,
  pointerDown: false,
  pointerMoved: false,
  pointerHour: 18,
  pointerWorld: new THREE.Vector3(),
  pointerNdc: new THREE.Vector2(),
  pointerClient: { x: 0, y: 0 },
  downClient: { x: 0, y: 0 },
  downView: { x: 0, y: 0 },
  activePointerId: null,
  selectedHour: 18,
  selectedActive: false,
  burst: 0,
  lastHoverRippleAt: -1,
  view: { x: 0, y: 0, targetX: 0, targetY: 0 },
  readoutKey: ''
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  });
  root.dataset.webglStatus = 'ready';
} catch (error) {
  showWebGLFallback(i18n('webglUnavailable'));
  root.dataset.webglStatus = 'unavailable';
  throw error;
}
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
root.dataset.rendererPixelRatio = pixelRatio.toFixed(2);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label', i18n('canvasAria'));
root.appendChild(renderer.domElement);
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  root.dataset.webglStatus = 'lost';
  showWebGLFallback(i18n('webglInterrupted'));
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  root.dataset.webglStatus = 'ready';
  hideWebGLFallback();
});

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PALETTE.fog, isCoarsePointer ? 0.019 : 0.022);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 110);
const cameraBase = new THREE.Vector3();
const cameraTargetBase = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const CAMERA_FIT_MARGIN = 0.04;
let chartCameraFitBounds = null;
let controls = null;
applyCameraPreset();

// 3D 轨道相机：拖拽旋转 + 滚轮缩放，范围在 TUNING.orbit 限制以保持构图。
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = TUNING.orbit.damping;
controls.enablePan = false;
controls.enableZoom = true;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.8;
controls.minDistance = TUNING.orbit.minDistance;
controls.maxDistance = TUNING.orbit.maxDistance;
controls.minPolarAngle = THREE.MathUtils.degToRad(TUNING.orbit.minPolarDeg);
controls.maxPolarAngle = THREE.MathUtils.degToRad(TUNING.orbit.maxPolarDeg);
controls.minAzimuthAngle = -THREE.MathUtils.degToRad(TUNING.orbit.azimuthDeg);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(TUNING.orbit.azimuthDeg);
controls.target.copy(cameraTargetBase);
controls.update();

const raycaster = new THREE.Raycaster();
const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_LEVEL);
const chartPointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -AXIS_CONFIG.z);
const chartPointerWorld = new THREE.Vector3();
const clock = new THREE.Clock();
const rainPlotBounds = new THREE.Vector4(0, 1, 0, 1);
const rainPlotFeather = new THREE.Vector3(0.002, 0, 0.002);
const rainViewport = new THREE.Vector2();
const rainPlotClip = { value: 0 };

const worldGroup = new THREE.Group();
worldGroup.name = 'pearl-rainfall-visualization';
scene.add(worldGroup);

let axisSystem = createAxisSystem();
chartCameraFitBounds = axisSystem.fitBounds.clone();
applyCameraPreset();
applyReadoutPosition();
syncAxisLabelScale(axisSystem);
updateRainPlotMask();

const waterPlane = createWaterPlane();
const poolFloor = createPoolFloor();
let mistBand = createMistBand();
// 水面倒影复用 mistBand 的降雨强度 LUT，实现与上方雨柱逐列对齐的镜像
waterPlane.material.uniforms.uRainLut.value = mistBand.lut;
waterPlane.material.uniforms.uLutBounds.value.set(mistBand.lutXMin, mistBand.lutSpan);
const initialDry = rainfallMax <= 0;
const initialHasPeaks = peakWaterfallRanges.length > 0;
const initialCapacityScale = initialDry ? 0 : rainCapacityResponse(rainfallMax);
let rainChains = createRainChainSystem(
  initialDry ? 0 : Math.max(1, Math.round(QUALITY.chains * initialCapacityScale)),
  initialDry ? 0 : Math.max(1, Math.round(QUALITY.ambientChains * Math.pow(initialCapacityScale, 1.08))),
  initialDry || !initialHasPeaks ? 0 : QUALITY.downpourChains
);
let peakWaterfall = createPeakWaterfallSystem(
  initialDry || !initialHasPeaks ? 0 : QUALITY.waterfallFilaments,
  rainChains.data
);
let waterGlints = createWaterGlintSystem(initialDry ? 0 : QUALITY.waterGlints);
let impactPearls = createImpactPearlSystem(
  !initialDry && SPLASH_IMPACTS_ENABLED ? QUALITY.impactPearls : 0,
  !initialDry && SPLASH_IMPACTS_ENABLED ? QUALITY.impactEventsPerSecond : 0,
  QUALITY.rippleEventsPerSecond
);
const rippleSystem = createRippleFieldSystem(renderer);

// 峰值瀑布（平滑体积"雾柱"）会与点状雨形成前后分层，让雨幕显得"分开"。
// 关掉后整个降雨是一带统一的点状雨幕。需要时改回 true 即可恢复。
worldGroup.add(
  axisSystem.group,
  poolFloor,
  waterPlane,
  mistBand.mesh,
  rainChains.lines,
  rainChains.points,
  peakWaterfall.group,
  waterGlints.points,
  impactPearls.foam,
  impactPearls.droplets,
  impactPearls.crowns
);

applyFeatureVisibility();

if (prefersReducedMotion) {
  if (SPLASH_IMPACTS_ENABLED) seedReducedMotionImpacts(impactPearls);
  updateRainChains(rainChains, 0, 0);
  if (FEATURES.showPeakWaterfall) updatePeakWaterfall(peakWaterfall, 0);
  updateWaterGlints(waterGlints, 0, 0);
  if (SPLASH_IMPACTS_ENABLED) updateImpactPearls(impactPearls, 0, 0);
}

syncRuntimeDatasets();
updateDomState();

renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
renderer.domElement.addEventListener('pointerup', onPointerUp, { passive: true });
renderer.domElement.addEventListener('pointercancel', onPointerCancel, { passive: true });
renderer.domElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
renderer.domElement.addEventListener('dblclick', resetView);
document.addEventListener('pointermove', (event) => {
  if (event.target !== renderer.domElement) clearChartHover();
}, { passive: true });
sceneToolbar.addEventListener('pointerenter', clearChartHover);
rainfallEditor.addEventListener('pointerenter', clearChartHover);
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
window.visualViewport?.addEventListener('resize', onResize);
window.addEventListener('blur', onInteractionInterrupted);

initRainfallEditor();
if (ENABLE_TUNING_CONSOLE) initTuningPanelV2();
root.dataset.releaseChannel = ENABLE_TUNING_CONSOLE ? 'development' : 'public';
animate();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  state.burst = Math.max(0, state.burst - delta * 1.1);

  mistBand.material.uniforms.uTime.value = prefersReducedMotion ? 6.2 : elapsed;

  if (!prefersReducedMotion) {
    beginImpactFrame(impactPearls, elapsed, delta);
    updateRainChains(rainChains, elapsed, delta);
    updateWaterGlints(waterGlints, elapsed, delta);
    if (SPLASH_IMPACTS_ENABLED) updateImpactPearls(impactPearls, elapsed, delta);
  }

  if (FEATURES.showPeakWaterfall) {
    updatePeakWaterfall(peakWaterfall, prefersReducedMotion ? 0 : elapsed);
  }

  if (state.pointerActive && elapsed - state.lastHoverRippleAt > 0.18) {
    state.lastHoverRippleAt = elapsed;
    addRipple(
      rippleSystem,
      state.pointerWorld.x,
      state.pointerWorld.z,
      0.34 + sampleRainStrength(state.pointerHour) * 0.28,
      false,
      elapsed
    );
  }

  updateRippleField(rippleSystem, renderer, elapsed);
  updateWaterPlane(elapsed);
  updateCamera(delta);
  updateAxisSystem(axisSystem, elapsed);
  updateDomState();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function applyFeatureVisibility() {
  axisSystem.group.visible = FEATURES.showAxes;
  waterPlane.visible = FEATURES.showWater;
  poolFloor.visible = FEATURES.showWater;
  mistBand.mesh.visible = FEATURES.showMist;
  rainChains.lines.visible = FEATURES.showRainLines;
  rainChains.points.visible = FEATURES.showPearls;
  waterGlints.points.visible = FEATURES.showWaterGlints;
  const splashImpactsVisible = SPLASH_IMPACTS_ENABLED && FEATURES.showImpacts;
  impactPearls.foam.visible = splashImpactsVisible;
  impactPearls.droplets.visible = splashImpactsVisible;
  impactPearls.crowns.visible = splashImpactsVisible;
  peakWaterfall.group.visible = FEATURES.showPeakWaterfall;
  root.dataset.axisVisibility = FEATURES.showAxes ? 'visible' : 'hidden';
}

function syncRuntimeDatasets() {
  root.dataset.rainMaterial = 'procedural-liquid-metal';
  root.dataset.rainEdgeMode = isPhoneLandscapeViewport() ? 'mobile-crisp' : 'authored';
  root.dataset.rainfallMax = String(Number(rainfallMax.toFixed(3)));
  root.dataset.axisMax = String(Number(axisMax.toFixed(3)));
  root.dataset.rainfallValues = activeRainfall.join(',');
  root.dataset.rainfallPointCount = String(activeRainfall.length);
  const zeroRainfallHours = activeRainfall
    .map((value, hour) => value === 0 ? hour : null)
    .filter(hour => hour !== null);
  root.dataset.zeroRainfallCount = String(zeroRainfallHours.length);
  root.dataset.zeroRainfallHours = zeroRainfallHours.join(',');
  root.dataset.zeroRainSuppression = 'anchor-feathered';
  root.dataset.rainfallResponse = 'continuous-raw-hourly-v2';
  root.dataset.rainfallDry = String(rainfallMax <= 0);
  root.dataset.chainCount = String(rainChains.data.count);
  root.dataset.zeroSuppressedChainCount = String(
    rainChains.data.presence?.reduce((count, value) => count + (value <= 0.08 ? 1 : 0), 0) ?? 0
  );
  root.dataset.baseChainCount = String(rainChains.data.baseCount);
  root.dataset.ambientChainCount = String(rainChains.data.ambientCount);
  root.dataset.downpourChainCount = String(rainChains.data.downpourCount);
  root.dataset.pearlCount = String(rainChains.data.pearlCount);
  root.dataset.streakCount = String(rainChains.data.downpourCount);
  root.dataset.waterfallBodyCount = String(peakWaterfall.bodyCount);
  root.dataset.waterfallPeakCount = String(peakWaterfall.peakCount);
  root.dataset.waterfallFilamentCapacity = String(peakWaterfall.filamentCapacity);
  root.dataset.activeWaterfallFilaments = String(peakWaterfall.visibleFilamentCount);
  root.dataset.bridgeFilamentCount = String(peakWaterfall.bridgeFilamentCount);
  root.dataset.coreFilamentCount = String(peakWaterfall.coreFilamentCount);
  root.dataset.lowerFilamentCount = String(peakWaterfall.lowerFilamentCount);
  root.dataset.wideFilamentCount = String(peakWaterfall.wideFilamentCount);
  root.dataset.foregroundFilamentCount = String(peakWaterfall.foregroundFilamentCount);
  root.dataset.highlightFilamentCount = String(peakWaterfall.highlightFilamentCount);
  root.dataset.waterfallRibbonSegments = String(peakWaterfall.ribbonSegments);
  root.dataset.activeBridgeTrails = String(rainChains.data.activeBridgeTrailCount);
  root.dataset.waterfallPlotClip = 'off';
  root.dataset.baselineImpactCount = String(impactPearls.data.staticSeedCount);
  root.dataset.splashImpactsEnabled = String(SPLASH_IMPACTS_ENABLED);
  root.dataset.activeStormParticles = String(impactPearls.data.activeCount);
  root.dataset.activeFoamParticles = String(impactPearls.data.activeFoamCount);
  root.dataset.activeSprayDroplets = String(impactPearls.data.activeDropletCount);
  root.dataset.activeCrownLines = String(impactPearls.data.activeCrownCount);
  root.dataset.peakImpactCount = String(impactPearls.data.totalPeakCollisions);
  root.dataset.stormEmissionRate = impactPearls.data.currentEmissionRate.toFixed(1);
  root.dataset.activeRipples = '0';
  root.dataset.rainPlotClip = 'off';
  root.dataset.rainCeilingValue = String(Number(rainCeilingValue.toFixed(3)));
  root.dataset.rainCeilingWorldY = rainCeilingY.toFixed(3);
  root.dataset.ambientCurtainMode = 'data-driven-ceiling';
  root.dataset.axisMode = '3d-reference-labels';
  root.dataset.axisVisibility = axisSystem.group.visible ? 'visible' : 'hidden';
  root.dataset.timeTickCount = String(axisSystem.timeTickCount);
  root.dataset.valueTickCount = String(axisSystem.valueTickCount);
  root.dataset.axisLabelCount = String(axisSystem.labelCount);
}

function applyRainfallData(values) {
  if (!Array.isArray(values) || values.length !== defaultRainfall.length) {
    throw new TypeError(i18n('dataLengthError', { count: defaultRainfall.length }));
  }
  const nextValues = values.map((rawValue) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(i18n('dataValueError'));
    }
    return normalizeRainfallValue(value);
  });

  activeRainfall = nextValues;
  refreshRainfallMetrics();
  rebuildRainfallSystems();
  updateRainSoundFromData();
  state.readoutKey = '';
  updateDomState(true);
}

function rebuildRainfallSystems() {
  const dry = rainfallMax <= 0;
  const hasPeaks = peakWaterfallRanges.length > 0;
  const capacityScale = dry ? 0 : rainCapacityResponse(rainfallMax);
  const nextAxisSystem = createAxisSystem();
  const nextMistBand = createMistBand();
  const nextRainChains = createRainChainSystem(
    dry ? 0 : Math.max(1, Math.round(QUALITY.chains * capacityScale)),
    dry ? 0 : Math.max(1, Math.round(QUALITY.ambientChains * Math.pow(capacityScale, 1.08))),
    dry || !hasPeaks ? 0 : QUALITY.downpourChains
  );
  const nextPeakWaterfall = createPeakWaterfallSystem(
    dry || !hasPeaks ? 0 : QUALITY.waterfallFilaments,
    nextRainChains.data
  );
  const nextWaterGlints = createWaterGlintSystem(dry ? 0 : QUALITY.waterGlints);
  const nextImpactPearls = createImpactPearlSystem(
    !dry && SPLASH_IMPACTS_ENABLED ? QUALITY.impactPearls : 0,
    !dry && SPLASH_IMPACTS_ENABLED ? QUALITY.impactEventsPerSecond : 0,
    QUALITY.rippleEventsPerSecond
  );

  const oldObjects = [
    axisSystem.group,
    mistBand.mesh,
    rainChains.lines,
    rainChains.points,
    peakWaterfall.group,
    waterGlints.points,
    impactPearls.foam,
    impactPearls.droplets,
    impactPearls.crowns
  ];

  waterPlane.material.uniforms.uRainLut.value = nextMistBand.lut;
  waterPlane.material.uniforms.uLutBounds.value.set(nextMistBand.lutXMin, nextMistBand.lutSpan);
  worldGroup.remove(...oldObjects);
  oldObjects.forEach(disposeObject3D);

  axisSystem = nextAxisSystem;
  chartCameraFitBounds = axisSystem.fitBounds.clone();
  applyReadoutPosition();
  syncAxisLabelScale(axisSystem);
  mistBand = nextMistBand;
  rainChains = nextRainChains;
  peakWaterfall = nextPeakWaterfall;
  waterGlints = nextWaterGlints;
  impactPearls = nextImpactPearls;

  worldGroup.add(
    axisSystem.group,
    mistBand.mesh,
    rainChains.lines,
    rainChains.points,
    peakWaterfall.group,
    waterGlints.points,
    impactPearls.foam,
    impactPearls.droplets,
    impactPearls.crowns
  );

  clearRippleField(rippleSystem);
  applyFeatureVisibility();

  if (prefersReducedMotion) {
    if (SPLASH_IMPACTS_ENABLED) seedReducedMotionImpacts(impactPearls);
    updateRainChains(rainChains, 0, 0);
    if (FEATURES.showPeakWaterfall) updatePeakWaterfall(peakWaterfall, 0);
    updateWaterGlints(waterGlints, 0, 0);
    if (SPLASH_IMPACTS_ENABLED) updateImpactPearls(impactPearls, 0, 0);
  }

  syncRuntimeDatasets();
}

function disposeObject3D(object) {
  if (!object) return;
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.filter(Boolean).forEach(material => materials.add(material));
  });

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value);
    }
    for (const uniform of Object.values(material.uniforms || {})) {
      if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  }

  textures.forEach(texture => texture.dispose());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

function clearRippleField(system) {
  const previousTarget = renderer.getRenderTarget();
  const previousAutoClear = renderer.autoClear;
  renderer.autoClear = true;
  renderer.setRenderTarget(system.rtA);
  renderer.clear();
  renderer.setRenderTarget(system.rtB);
  renderer.clear();
  renderer.setRenderTarget(previousTarget);
  renderer.autoClear = previousAutoClear;
  system.dropCount = 0;
  system.dropGeometry.setDrawRange(0, 0);
  system.texture = system.rtA.texture;
  waterPlane.material.uniforms.uHeightField.value = system.texture;
  root.dataset.activeRipples = '0';
}

function drawAxisReadout(readoutPanel, displayHour) {
  const roundedHour = clamp(Math.round(displayHour), 0, 24);
  const valueText = sampleRainfall(displayHour).toFixed(1);
  const key = `${roundedHour}-${valueText}-${globalThemeColor}`;
  if (readoutPanel.key === key) return;

  const { canvas, context, texture } = readoutPanel;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  const rightEdge = canvas.width - 12;
  const unitText = i18n('axisUnit');
  context.font = '450 32px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
  const unitWidth = context.measureText(unitText).width;
  const lineX = 18;
  const lineWidth = 8;
  const lineGap = 48;
  const lineTop = 26;
  const lineBottom = 218;
  const contentLeft = lineX + lineWidth + lineGap;
  const valueUnitGap = 16;
  let valueFontSize = 116;
  context.font = `350 ${valueFontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
  let valueWidth = context.measureText(valueText).width;
  const availableValueWidth = rightEdge - unitWidth - valueUnitGap - contentLeft;
  if (valueWidth > availableValueWidth) {
    valueFontSize = Math.max(72, valueFontSize * availableValueWidth / valueWidth);
    context.font = `350 ${valueFontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
    valueWidth = context.measureText(valueText).width;
  }
  const valueX = contentLeft;
  const unitX = Math.min(rightEdge - unitWidth, valueX + valueWidth + valueUnitGap);

  context.globalAlpha = 0.92;
  context.fillStyle = themeHexCss(globalThemePalette.axisTick);
  context.fillRect(lineX, lineTop, lineWidth, lineBottom - lineTop);

  context.globalAlpha = 1;
  context.fillStyle = themeHexCss(globalThemePalette.axisTime);
  context.font = '550 42px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(`${String(roundedHour).padStart(2, '0')}:00`, valueX, 48);

  context.fillStyle = themeHexCss(globalThemePalette.axisStrong);
  context.font = `350 ${valueFontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.fillText(valueText, valueX, 158);

  context.fillStyle = themeHexCss(globalThemePalette.axisTick);
  context.font = '450 32px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(unitText, unitX, 166);

  texture.needsUpdate = true;
  readoutPanel.key = key;
}

function createAxisReadoutPanel(anchorX, anchorY, anchorZ, opacity) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 260;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const worldHeight = 0.98;
  const worldWidth = worldHeight * canvas.width / canvas.height;
  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  // 让画布右边缘固定在图表的最右端，内容自然向图表内部展开。
  geometry.translate(-worldWidth * 0.5, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'axis-dynamic-readout';
  mesh.position.set(anchorX, anchorY, anchorZ);
  mesh.renderOrder = 9.6;
  mesh.visible = false;

  const panel = {
    mesh,
    material,
    canvas,
    context,
    texture,
    anchorX,
    anchorY,
    anchorZ,
    key: ''
  };
  drawAxisReadout(panel, state.selectedHour);
  return panel;
}

function createAxisSystem() {
  const group = new THREE.Group();
  group.name = 'rainfall-3d-axes';
  const axisGraphicOpacity = 0.85;

  const axisMaterial = new THREE.MeshBasicMaterial({
    color: globalThemePalette.axisLine,
    // Keep this in Three.js' transparent pass so it is drawn after the water.
    transparent: true,
    opacity: axisGraphicOpacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const tickMaterial = new THREE.MeshBasicMaterial({
    color: globalThemePalette.axisTick,
    transparent: true,
    opacity: axisGraphicOpacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const selectedMaterial = new THREE.MeshBasicMaterial({
    color: globalThemePalette.axisStrong,
    transparent: true,
    opacity: axisGraphicOpacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const hoverMaterial = new THREE.MeshBasicMaterial({
    color: globalThemePalette.axisStrong,
    transparent: true,
    opacity: axisGraphicOpacity,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });

  const xMin = hourToX(0);
  const xMax = hourToX(24);
  const xAxisY = WATER_LEVEL - 0.18;
  const yMax = rainCeilingY;
  const z = AXIS_CONFIG.z;
  // 信息架构统一使用同一条顶线：左侧标题与右侧动态读数互为镜像。
  const headerTop = yMax + 1.42;

  const axisVertices = [
    xMin, xAxisY, z,
    xMax, xAxisY, z,
    xMin, xAxisY, z,
    xMin, yMax, z
  ];
  const timeTickPositions = [];
  const labelGroup = new THREE.Group();
  labelGroup.name = 'axis-labels';
  const labelOpacityEntries = [];
  for (let hour = 0; hour <= 24; hour += 2) {
    const x = hourToX(hour);
    timeTickPositions.push(x, xAxisY, z);
    const label = createAxisLabel(`${String(hour).padStart(2, '0')}:00`, {
      height: 0.2,
      fontSize: 54,
      fontWeight: 400,
      mobileScale: 1.55,
      color: themeHexCss(globalThemePalette.axisTime)
    });
    label.sprite.position.set(x, xAxisY - 0.27, z + 0.04);
    labelGroup.add(label.sprite);
    labelOpacityEntries.push({ material: label.material, baseOpacity: label.opacity });
  }

  const valueTickVertices = [];
  const tickValues = rainfallAxisTicks();
  // Keep the complete Y-axis text column clear of the longest tick label.
  // Keep the left-aligned value/unit column clear of the Y-axis and its ticks,
  // including after the mobile label scale is applied.
  const yAxisLabelLeft = xMin - 0.72;
  for (const value of tickValues) {
    const y = rainfallToAxisY(value);
    // The X axis already marks zero; drawing another horizontal Y tick here
    // creates a misleading stationary cross beside the cursor marker.
    if (value > 0) {
      valueTickVertices.push(xMin - 0.08, y, z, xMin + 0.08, y, z);
    }

    const valueLabel = createAxisLabel(formatRainfallTick(value), {
      height: 0.27,
      fontSize: 64,
      fontWeight: 350,
      mobileOffsetX: -0.32,
      anchorX: 0,
      color: themeHexCss(globalThemePalette.axisValue)
    });
    valueLabel.sprite.position.set(yAxisLabelLeft, y + 0.02, z + 0.04);
    labelGroup.add(valueLabel.sprite);
    labelOpacityEntries.push({ material: valueLabel.material, baseOpacity: valueLabel.opacity });

    const unitLabel = createAxisLabel(i18n('axisUnit'), {
      height: 0.14,
      fontSize: 44,
      fontWeight: 450,
      mobileScale: 1.9,
      mobileOffsetX: -0.32,
      anchorX: 0,
      color: themeHexCss(globalThemePalette.axisUnit)
    });
    unitLabel.sprite.position.set(yAxisLabelLeft, y - 0.22, z + 0.04);
    labelGroup.add(unitLabel.sprite);
    labelOpacityEntries.push({ material: unitLabel.material, baseOpacity: unitLabel.opacity });
  }

  const yAxisHeadingLeft = yAxisLabelLeft;
  const titleLabels = locale === 'zh-CN'
    ? [
        { text: i18n('axisTitle'), y: headerTop - 0.22, height: 0.44, fontSize: 76, fontWeight: 550, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisStrong) },
        { text: i18n('axisSubtitle'), y: headerTop - 0.57, height: 0.22, fontSize: 52, fontWeight: 450, mobileScale: 1.55, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisTime) },
        { text: i18n('axisUnit'), y: headerTop - 0.82, height: 0.15, fontSize: 44, fontWeight: 450, mobileScale: 1.9, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisUnit) }
      ]
    : [
        { text: i18n('axisTitle'), y: headerTop - 0.22, height: 0.4, fontSize: 76, fontWeight: 550, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisStrong) },
        { text: i18n('axisSubtitle'), y: headerTop - 0.57, height: 0.19, fontSize: 46, fontWeight: 450, mobileScale: 1.55, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisTime) },
        { text: i18n('axisUnit'), y: headerTop - 0.82, height: 0.15, fontSize: 44, fontWeight: 450, mobileScale: 1.9, mobileOffsetX: -0.32, color: themeHexCss(globalThemePalette.axisUnit) }
      ];
  for (const entry of titleLabels) {
    const titleLabel = createAxisLabel(entry.text, {
      height: entry.height,
      fontSize: entry.fontSize,
      fontWeight: entry.fontWeight,
      mobileScale: entry.mobileScale,
      mobileOffsetX: entry.mobileOffsetX,
      anchorX: 0,
      color: entry.color
    });
    titleLabel.sprite.position.set(yAxisHeadingLeft, entry.y, z + 0.04);
    titleLabel.material.opacity = axisGraphicOpacity;
    labelGroup.add(titleLabel.sprite);
    labelOpacityEntries.push({ material: titleLabel.material, baseOpacity: axisGraphicOpacity });
  }

  const readoutPanel = createAxisReadoutPanel(
    xMax,
    headerTop - 0.49,
    z + 0.05,
    axisGraphicOpacity
  );
  readoutPanel.mesh.position.x += Number(TUNING.readout.offsetX) || 0;
  readoutPanel.mesh.position.y += Number(TUNING.readout.offsetY) || 0;
  labelOpacityEntries.push({ material: readoutPanel.material, baseOpacity: axisGraphicOpacity });

  const axes = createAxisBars('axis-lines', axisVertices, axisMaterial, 0.009, 9);
  const timeTicks = createAxisDots('time-ticks', timeTickPositions, tickMaterial, 0.011, 9.1);
  const valueTickMeshes = createAxisBars('value-ticks', valueTickVertices, tickMaterial, 0.008, 9.1);
  const selectedMarker = createAxisBars(
    'selected-time-marker',
    [0, xAxisY, z + 0.012, 0, xAxisY + 0.48, z + 0.012],
    selectedMaterial,
    0.01,
    9.3
  );
  const hoverMarker = createAxisBars(
    'hover-time-marker',
    [0, xAxisY, z + 0.018, 0, xAxisY + 0.34, z + 0.018],
    hoverMaterial,
    0.008,
    9.4
  );
  selectedMarker.visible = false;
  hoverMarker.visible = false;

  group.add(axes, timeTicks, valueTickMeshes, labelGroup, readoutPanel.mesh, selectedMarker, hoverMarker);
  group.updateMatrixWorld(true);
  const fitBounds = new THREE.Box3().setFromObject(group, true);

  return {
    group,
    fitBounds,
    labelGroup,
    readout: readoutPanel,
    selectedMarker,
    hoverMarker,
    opacityEntries: [
      { material: axisMaterial, baseOpacity: axisGraphicOpacity },
      { material: tickMaterial, baseOpacity: axisGraphicOpacity },
      { material: selectedMaterial, baseOpacity: axisGraphicOpacity },
      { material: hoverMaterial, baseOpacity: axisGraphicOpacity },
      ...labelOpacityEntries
    ],
    opacity: 1,
    dragging: false,
    fadeStartedAt: -1,
    timeTickCount: 13,
    valueTickCount: valueTickVertices.length / 6,
    labelCount: 13 + tickValues.length * 2 + titleLabels.length + 1
  };
}

function createAxisDots(name, positions, material, radius, renderOrder) {
  const group = new THREE.Group();
  group.name = name;
  const geometry = new THREE.SphereGeometry(radius, 16, 10);

  for (let index = 0; index < positions.length; index += 3) {
    const dot = new THREE.Mesh(geometry, material);
    dot.position.set(positions[index], positions[index + 1], positions[index + 2]);
    dot.renderOrder = renderOrder;
    group.add(dot);
  }

  return group;
}

function createAxisLabel(text, {
  height,
  fontSize,
  fontWeight = 300,
  mobileScale = 1.28,
  mobileOffsetX = 0,
  anchorX = 0.5,
  color = '#ffffff'
}) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const resolutionScale = 3;
  const renderFontSize = fontSize * resolutionScale;
  const font = `${fontWeight} ${renderFontSize}px Inter, "PingFang SC", "Microsoft YaHei", sans-serif`;
  context.font = font;
  const width = Math.ceil(context.measureText(text).width + 24 * resolutionScale);
  const canvasHeight = Math.ceil(renderFontSize * 1.45);
  canvas.width = width;
  canvas.height = canvasHeight;

  context.clearRect(0, 0, width, canvasHeight);
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width * 0.5, canvasHeight * 0.5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const worldWidth = height * width / canvasHeight;
  const geometry = new THREE.PlaneGeometry(worldWidth, height);
  // PlaneGeometry stays in the axis' XY plane. Unlike THREE.Sprite it does not
  // billboard toward the camera, so axis text keeps one fixed world orientation.
  geometry.translate((0.5 - anchorX) * worldWidth, 0, 0);
  const sprite = new THREE.Mesh(geometry, material);
  sprite.renderOrder = 9.5;
  sprite.userData.mobileScale = mobileScale;
  sprite.userData.mobileOffsetX = mobileOffsetX;

  return { sprite, material, opacity: 1 };
}

function syncAxisLabelScale(system) {
  const mobile = isPhoneLandscapeViewport();
  for (const label of system?.labelGroup?.children || []) {
    const scale = mobile ? label.userData.mobileScale || 1.28 : 1;
    if (!Number.isFinite(label.userData.basePositionX)) {
      label.userData.basePositionX = label.position.x;
    }
    label.scale.setScalar(scale);
    label.position.x = label.userData.basePositionX
      + (mobile ? label.userData.mobileOffsetX || 0 : 0);
  }
  root.dataset.axisLabelScale = mobile ? '1.28-1.90' : '1.00';
}

function createAxisBars(name, vertices, material, thickness, renderOrder) {
  const group = new THREE.Group();
  group.name = name;
  const xAxis = new THREE.Vector3(1, 0, 0);

  for (let index = 0; index < vertices.length; index += 6) {
    const start = new THREE.Vector3(vertices[index], vertices[index + 1], vertices[index + 2]);
    const end = new THREE.Vector3(vertices[index + 3], vertices[index + 4], vertices[index + 5]);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const geometry = new THREE.BoxGeometry(length, thickness, thickness);
    const bar = new THREE.Mesh(geometry, material);
    bar.position.copy(start).add(end).multiplyScalar(0.5);
    bar.quaternion.setFromUnitVectors(xAxis, direction.normalize());
    bar.renderOrder = renderOrder;
    group.add(bar);
  }

  return group;
}

function rainfallToAxisY(value) {
  return WATER_LEVEL + clamp(value / axisMax, 0, 1) * AXIS_CONFIG.worldHeight;
}

function setAxisOpacity(system, opacity) {
  system.opacity = opacity;
  for (const entry of system.opacityEntries) {
    entry.material.opacity = entry.baseOpacity * opacity;
  }
}

function updateAxisSystem(system) {
  // Keep click selection for the readout/highlight, but do not draw a second,
  // stationary X-axis marker beside the cursor-following hover marker.
  system.selectedMarker.visible = false;
  system.hoverMarker.position.x = hourToX(state.pointerHour);
  system.hoverMarker.visible = state.pointerActive;
  system.readout.mesh.visible = state.pointerActive;
  if (state.pointerActive) drawAxisReadout(system.readout, state.pointerHour);
  root.dataset.readoutVisibility = state.pointerActive ? 'visible' : 'hidden';
  root.dataset.cursorLineVisibility = state.pointerActive ? 'visible' : 'hidden';

}

function hideAxisForDrag() {
  if (axisSystem.dragging) return;
  axisSystem.dragging = true;
  axisSystem.fadeStartedAt = -1;
  axisSystem.group.visible = false;
  setAxisOpacity(axisSystem, 0);
  root.dataset.axisVisibility = 'hidden';
}

function restoreAxisAfterDrag(immediate = false) {
  if (!axisSystem.dragging && !immediate) return;
  axisSystem.dragging = false;
  axisSystem.group.visible = FEATURES.showAxes;
  axisSystem.fadeStartedAt = -1;
  setAxisOpacity(axisSystem, FEATURES.showAxes ? 1 : 0);
  root.dataset.axisVisibility = FEATURES.showAxes ? 'visible' : 'hidden';
}

function createRainChainSystem(baseCount, ambientCount = 0, downpourCount = 0) {
  const count = baseCount + ambientCount + downpourCount;
  const chain = {
    count,
    baseCount,
    ambientCount,
    downpourCount,
    role: new Uint8Array(count),
    style: new Uint8Array(count),
    resetSeed: new Uint32Array(count),
    seedIndex: new Uint32Array(count),
    hour: new Float32Array(count),
    strength: new Float32Array(count),
    presence: new Float32Array(count),
    stormWeight: new Float32Array(count),
    waterfallTop: new Float32Array(count),
    waterfallBlendTop: new Float32Array(count),
    waterfallFeather: new Float32Array(count),
    baseX: new Float32Array(count),
    z: new Float32Array(count),
    pathX: new Float32Array(count),
    pathZ: new Float32Array(count),
    top: new Float32Array(count),
    length: new Float32Array(count),
    headY: new Float32Array(count),
    speed: new Float32Array(count),
    near: new Float32Array(count),
    curtainLayer: new Uint8Array(count),
    driftX: new Float32Array(count),
    driftZ: new Float32Array(count),
    phase: new Float32Array(count),
    windSpeed: new Float32Array(count),
    alpha: new Float32Array(count),
    pearlStart: new Uint32Array(count),
    strandPearlCount: new Uint8Array(count),
    lineStart: new Uint32Array(count),
    lineCount: new Uint8Array(count),
    respawnCycle: new Uint32Array(count)
  };

  const random = createSeededRandom(RAIN_LAYOUT_SEED);
  const hourSampler = createHourSampler(TUNING.rain.baseWeight, TUNING.rain.exponent, random, true);
  const ambientRandom = createSeededRandom(AMBIENT_RAIN_SEED);
  // Even, low-opacity coverage supplies a restrained background curtain in
  // dry hours without changing the existing data-driven peak distribution.
  const ambientHourSampler = () => randomRange(0.04, 23.96, ambientRandom);
  const downpourRandom = createSeededRandom(DOWNPOUR_RAIN_SEED);
  const downpourHourSampler = createIntegratedDownpourHourSampler(downpourRandom);
  let pearlCount = 0;
  let lineCount = 0;

  for (let i = 0; i < baseCount; i += 1) {
    const hour = hourSampler();
    const strength = sampleRainStrength(hour);
    const visibility = rainVisibilityResponse(strength);
    const presence = sampleRainPresence(hour);
    const heightStrength = sampleRainHeightStrength(hour);
    const near = sampleNearness(random);
    const clusterHeight = lerp(0.88, 1.12, valueNoise(hour * 1.55, RAIN_CLUSTER_SEED ^ 0x51f2a93d));
    const strandScatter = randomRange(
      -0.32 - strength * 0.34,
      0.38 + strength * 0.68,
      random
    );
    const top = Math.min(
      rainCeilingY,
      WATER_LEVEL + clamp(
        0.95
          + Math.pow(heightStrength, 0.92) * 5.8 * clusterHeight
          + strandScatter,
        0.76,
        8.8
      )
    );
    const layerPick = random();
    const curtainLayer = layerPick < 0.5 ? 0 : layerPick < 0.85 ? 1 : 2;
    const columnHeight = Math.max(0.8, top - WATER_LEVEL);
    const baseLength = randomRange(0.78, 1.14, random)
      + strength * randomRange(0.62, 1.08, random)
      + near * randomRange(0.12, 0.32, random);
    const length = curtainLayer === 1
      ? Math.max(0.42, Math.min(
        baseLength * randomRange(0.64, 0.9, random),
        columnHeight * randomRange(0.24, 0.42, random)
      ))
      : baseLength;
    // Restrained bead spacing — pearls read as distinct beads strung along a
    // thread (bound by the faint connecting line), not a dense mush.
    const beads = Math.round(
      lerp(20, 34, Math.pow(strength, 0.55))
      + near * randomRange(0, 4, random)
      + (curtainLayer === 1 ? 1 : 0)
    );

    chain.hour[i] = hour;
    assignWaterfallEnvelope(chain, i, hour);
    chain.role[i] = RAIN_ROLE.BASE;
    chain.resetSeed[i] = RAIN_LAYOUT_SEED;
    chain.seedIndex[i] = i;
    chain.strength[i] = strength;
    chain.presence[i] = presence;
    chain.near[i] = near;
    chain.top[i] = top;
    chain.length[i] = length;
    chain.curtainLayer[i] = curtainLayer;
    chain.pearlStart[i] = pearlCount;
    chain.strandPearlCount[i] = clamp(beads, 16, 40);
    chain.lineStart[i] = lineCount;
    chain.lineCount[i] = chain.strandPearlCount[i] - 1;
    chain.speed[i] = randomRange(1.5, 2.45, random)
      + strength * randomRange(1.15, 2.55, random)
      + near * 0.42;
    chain.driftX[i] = randomRange(0.004, 0.014, random) + near * randomRange(0.003, 0.009, random);
    chain.driftZ[i] = randomRange(0.003, 0.01, random) + near * randomRange(0.002, 0.006, random);
    chain.phase[i] = random() * Math.PI * 2;
    chain.windSpeed[i] = randomRange(0.22, 0.58, random);
    chain.alpha[i] = randomRange(0.54, 0.96, random)
      * (0.22 + visibility * 1.18)
      * (0.76 + near * 0.72)
      * (curtainLayer === 1 ? 1.12 : 1)
      * presence;

    resetChainPosition(chain, i, true);

    pearlCount += chain.strandPearlCount[i];
    lineCount += chain.lineCount[i];
  }

  for (let localIndex = 0; localIndex < ambientCount; localIndex += 1) {
    const i = baseCount + localIndex;
    const hour = ambientHourSampler();
    const strength = sampleRainStrength(hour);
    const visibility = rainVisibilityResponse(strength);
    const presence = sampleRainPresence(hour);
    const near = sampleNearness(ambientRandom);
    const beads = Math.round(randomRange(28, 38, ambientRandom));

    chain.hour[i] = hour;
    assignWaterfallEnvelope(chain, i, hour);
    chain.role[i] = RAIN_ROLE.AMBIENT;
    chain.resetSeed[i] = AMBIENT_RAIN_SEED;
    chain.seedIndex[i] = localIndex;
    chain.strength[i] = strength;
    chain.presence[i] = presence;
    chain.near[i] = near;
    chain.top[i] = rainCeilingY;
    chain.length[i] = rainCeilingY - WATER_LEVEL + randomRange(0.12, 0.3, ambientRandom);
    chain.curtainLayer[i] = 2;
    chain.pearlStart[i] = pearlCount;
    chain.strandPearlCount[i] = beads;
    chain.lineStart[i] = lineCount;
    chain.lineCount[i] = beads - 1;
    chain.speed[i] = 0;
    chain.driftX[i] = randomRange(0.002, 0.008, ambientRandom);
    chain.driftZ[i] = randomRange(0.002, 0.006, ambientRandom);
    chain.phase[i] = ambientRandom() * Math.PI * 2;
    chain.windSpeed[i] = randomRange(0.18, 0.46, ambientRandom);
    chain.alpha[i] = randomRange(0.08, 0.2, ambientRandom)
      * (0.08 + visibility * 0.92)
      * presence;

    resetChainPosition(chain, i, true);
    pearlCount += beads;
    lineCount += beads - 1;
  }

  for (let localIndex = 0; localIndex < downpourCount; localIndex += 1) {
    const i = baseCount + ambientCount + localIndex;
    const hour = downpourHourSampler();
    const strength = sampleRainStrength(hour);
    const presence = sampleRainPresence(hour);
    const heightStrength = sampleRainHeightStrength(hour);
    const near = sampleNearness(downpourRandom);
    const clusterHeight = lerp(0.9, 1.12, valueNoise(hour * 1.55, RAIN_CLUSTER_SEED ^ 0x51f2a93d));
    const dataHeight = clamp(
      0.95
        + Math.pow(heightStrength, 0.92) * 5.8 * clusterHeight
        + randomRange(-0.22, 0.62, downpourRandom),
      1.2,
      8.8
    );
    const fullHeight = downpourRandom() < 0.45;
    const lowerRatio = downpourRandom() < 0.7
      ? randomRange(0.08, 0.38, downpourRandom)
      : randomRange(0.38, 0.58, downpourRandom);
    const topHeight = fullHeight
      ? dataHeight + randomRange(-0.12, 0.48, downpourRandom)
      : Math.max(0.82, dataHeight * lowerRatio + randomRange(-0.08, 0.24, downpourRandom));
    const stylePick = downpourRandom();
    const style = stylePick < 0.7 ? 0 : stylePick < 0.94 ? 1 : 2;
    const beads = Math.round(style === 0
      ? randomRange(13, 19, downpourRandom)
      : style === 1 ? randomRange(15, 21, downpourRandom) : randomRange(16, 22, downpourRandom));
    const length = fullHeight
      ? randomRange(0.82, 1.5, downpourRandom) + strength * randomRange(0.52, 1.02, downpourRandom)
      : Math.min(
        randomRange(0.38, 1.04, downpourRandom),
        topHeight * randomRange(0.48, 0.86, downpourRandom)
      );

    chain.hour[i] = hour;
    assignWaterfallEnvelope(chain, i, hour);
    chain.role[i] = RAIN_ROLE.DOWNPOUR;
    chain.style[i] = style;
    chain.resetSeed[i] = DOWNPOUR_RAIN_SEED;
    chain.seedIndex[i] = localIndex;
    chain.strength[i] = strength;
    chain.presence[i] = presence;
    chain.near[i] = near;
    chain.top[i] = Math.min(rainCeilingY, WATER_LEVEL + topHeight);
    chain.length[i] = Math.max(0.34, length);
    chain.curtainLayer[i] = 0;
    chain.pearlStart[i] = pearlCount;
    chain.strandPearlCount[i] = beads;
    chain.lineStart[i] = lineCount;
    chain.lineCount[i] = beads - 1;
    chain.speed[i] = randomRange(2.65, 4.35, downpourRandom) + strength * 0.72;
    chain.driftX[i] = 0;
    chain.driftZ[i] = 0;
    chain.phase[i] = downpourRandom() * Math.PI * 2;
    chain.windSpeed[i] = 0;
    chain.alpha[i] = randomRange(
      style === 0 ? 0.26 : 0.32,
      style === 2 ? 0.62 : 0.52,
      downpourRandom
    ) * (0.88 + strength * 0.34) * presence;

    resetChainPosition(chain, i, true);
    pearlCount += beads;
    lineCount += beads - 1;
  }

  for (let i = 0; i < count; i += 1) {
    chain.waterfallBlendTop[i] = chain.waterfallTop[i]
      + Math.sin(chain.phase[i] * 2.17 + chain.hour[i] * 0.41) * 0.2;
  }

  const pearlPositions = new Float32Array(pearlCount * 3);
  const pearlColors = new Float32Array(pearlCount * 3);
  const pearlAlphas = new Float32Array(pearlCount);
  const pearlBaseAlpha = new Float32Array(pearlCount);
  const pearlSizes = new Float32Array(pearlCount);
  const pearlUpperScales = new Float32Array(pearlCount);
  const pearlUpperProgress = new Float32Array(pearlCount);
  const pearlUpperSeed = new Float32Array(pearlCount);
  const pearlTopRetention = new Float32Array(pearlCount);
  const pearlTopSize = new Float32Array(pearlCount);
  const pearlTopAlpha = new Float32Array(pearlCount);
  const pearlAspects = new Float32Array(pearlCount);
  const pearlHighlights = new Float32Array(pearlCount);
  const pearlChain = new Uint16Array(pearlCount);
  const pearlFraction = new Float32Array(pearlCount);
  const pearlOffsetY = new Float32Array(pearlCount);
  const pearlShimmer = new Float32Array(pearlCount);
  const pearlStorm = new Float32Array(pearlCount);
  const pearlWaterfallTop = new Float32Array(pearlCount);
  const pearlWaterfallFeather = new Float32Array(pearlCount);

  const linePositions = new Float32Array(lineCount * 2 * 3);
  const lineColors = new Float32Array(lineCount * 2 * 3);
  const lineBandPhases = new Float32Array(lineCount * 2);
  const lineAlphas = new Float32Array(lineCount * 2);
  const lineBaseAlpha = new Float32Array(lineCount);
  const linePearlA = new Uint32Array(lineCount);
  const linePearlB = new Uint32Array(lineCount);
  const lineChain = new Uint16Array(lineCount);
  const lineStorm = new Float32Array(lineCount * 2);

  for (let i = 0; i < baseCount; i += 1) {
    const start = chain.pearlStart[i];
    const beads = chain.strandPearlCount[i];
    const strength = chain.strength[i];
    const near = chain.near[i];
    const baseSize = randomRange(1.15, 1.7, random)
      + near * randomRange(0.3, 0.82, random)
      + strength * randomRange(0.1, 0.4, random);

    for (let bead = 0; bead < beads; bead += 1) {
      const pearl = start + bead;
      const index = pearl * 3;
      const fraction = beads <= 1 ? 0 : bead / (beads - 1);
      const type = random();

      pearlChain[pearl] = i;
      pearlFraction[pearl] = fraction;
      pearlOffsetY[pearl] = randomRange(-0.006, 0.006, random);
      pearlShimmer[pearl] = random() * Math.PI * 2;
      pearlUpperScales[pearl] = 1;
      pearlUpperSeed[pearl] = random();
      pearlTopRetention[pearl] = 0.3;
      pearlTopSize[pearl] = randomRange(0.35, 0.55, random);
      pearlTopAlpha[pearl] = randomRange(0.18, 0.4, random);

      // Pearls within a strand stay near-uniform in size for a restrained,
      // precise look — only their "weight" (brightness/sheen) varies. A few
      // pearls read as independent and bright, most are quieter, but all are
      // about the same size; thickness varies between strands, not within one.
      pearlSizes[pearl] = baseSize * randomRange(0.92, 1.08, random);
      pearlAspects[pearl] = randomRange(1.04, 1.26, random);
      let weight;
      if (type < 0.14) {
        // independent bright pearl — the strand's luminous accents
        pearlHighlights[pearl] = randomRange(0.18, 0.32, random);
        weight = randomRange(0.95, 1.22, random);
      } else if (type < 0.46) {
        pearlHighlights[pearl] = randomRange(0.06, 0.16, random);
        weight = randomRange(0.56, 0.86, random);
      } else {
        // quiet thread pearl — dimmer, but still carries the dense curtain
        pearlHighlights[pearl] = randomRange(0.02, 0.08, random);
        weight = randomRange(0.26, 0.52, random);
      }

      pearlBaseAlpha[pearl] = clamp(
        weight * (0.68 + near * 0.5 + strength * 0.4),
        0,
        1.1
      );
      pearlAlphas[pearl] = pearlBaseAlpha[pearl];

      writeRainColor(
        pearlColors,
        index,
        strength,
        randomRange(0.72, 1.12, random) * (0.82 + near * 0.3) * (0.78 + weight * 0.36),
        random
      );
    }

    for (let segment = 0; segment < beads - 1; segment += 1) {
      const line = chain.lineStart[i] + segment;
      const colorIndex = line * 6;
      linePearlA[line] = start + segment;
      linePearlB[line] = start + segment + 1;
      lineChain[line] = i;
      lineBaseAlpha[line] = randomRange(0.009, 0.026, random)
        * (0.54 + strength * 0.44)
        * (0.6 + near * 0.42);
      writeRainColor(
        lineColors,
        colorIndex,
        strength,
        randomRange(0.2, 0.36, random) * (0.78 + near * 0.24),
        random
      );
      lineColors[colorIndex + 3] = lineColors[colorIndex] * 1.12;
      lineColors[colorIndex + 4] = lineColors[colorIndex + 1] * 1.12;
      lineColors[colorIndex + 5] = lineColors[colorIndex + 2] * 1.12;
    }
  }

  for (let localIndex = 0; localIndex < ambientCount; localIndex += 1) {
    const i = baseCount + localIndex;
    const start = chain.pearlStart[i];
    const beads = chain.strandPearlCount[i];
    const strength = chain.strength[i];
    const near = chain.near[i];
    const baseSize = randomRange(0.58, 1.02, ambientRandom) + near * randomRange(0.08, 0.28, ambientRandom);

    for (let bead = 0; bead < beads; bead += 1) {
      const pearl = start + bead;
      const index = pearl * 3;
      const fraction = beads <= 1 ? 0 : bead / (beads - 1);

      pearlChain[pearl] = i;
      pearlFraction[pearl] = fraction;
      pearlOffsetY[pearl] = randomRange(-0.004, 0.004, ambientRandom);
      pearlShimmer[pearl] = ambientRandom() * Math.PI * 2;
      pearlBaseAlpha[pearl] = randomRange(0.22, 0.5, ambientRandom) * (0.88 + near * 0.22);
      pearlAlphas[pearl] = pearlBaseAlpha[pearl];
      pearlUpperScales[pearl] = 1;
      pearlUpperSeed[pearl] = ambientRandom();
      pearlTopRetention[pearl] = randomRange(0.72, 0.84, ambientRandom);
      pearlTopSize[pearl] = randomRange(0.58, 0.78, ambientRandom);
      pearlTopAlpha[pearl] = randomRange(0.55, 0.75, ambientRandom);
      pearlSizes[pearl] = baseSize * randomRange(0.54, 0.88, ambientRandom);
      pearlAspects[pearl] = randomRange(1.35, 2.0, ambientRandom);
      pearlHighlights[pearl] = randomRange(0.04, 0.14, ambientRandom);
      writeExtensionRainColor(
        pearlColors,
        index,
        strength,
        randomRange(0.34, 0.62, ambientRandom),
        RAIN_ROLE.AMBIENT,
        0,
        ambientRandom
      );
    }

    for (let segment = 0; segment < beads - 1; segment += 1) {
      const line = chain.lineStart[i] + segment;
      const colorIndex = line * 6;
      linePearlA[line] = start + segment;
      linePearlB[line] = start + segment + 1;
      lineChain[line] = i;
      lineBaseAlpha[line] = randomRange(0.003, 0.009, ambientRandom) * (0.72 + strength * 0.24);
      writeExtensionRainColor(
        lineColors,
        colorIndex,
        strength,
        randomRange(0.1, 0.2, ambientRandom),
        RAIN_ROLE.AMBIENT,
        0,
        ambientRandom
      );
      lineColors[colorIndex + 3] = lineColors[colorIndex] * 1.08;
      lineColors[colorIndex + 4] = lineColors[colorIndex + 1] * 1.08;
      lineColors[colorIndex + 5] = lineColors[colorIndex + 2] * 1.08;
    }
  }

  for (let localIndex = 0; localIndex < downpourCount; localIndex += 1) {
    const i = baseCount + ambientCount + localIndex;
    const start = chain.pearlStart[i];
    const beads = chain.strandPearlCount[i];
    const strength = chain.strength[i];
    const near = chain.near[i];
    const style = chain.style[i];
    const styleScale = style === 0
      ? randomRange(0.35, 0.5, downpourRandom)
      : style === 1 ? randomRange(0.5, 0.7, downpourRandom) : randomRange(0.75, 0.95, downpourRandom);
    const baseSize = (
      randomRange(1.05, 1.72, downpourRandom)
        + near * randomRange(0.28, 0.82, downpourRandom)
        + strength * randomRange(0.1, 0.38, downpourRandom)
    ) * styleScale;

    for (let bead = 0; bead < beads; bead += 1) {
      const pearl = start + bead;
      const index = pearl * 3;
      const fraction = beads <= 1 ? 0 : bead / (beads - 1);
      const type = downpourRandom();

      pearlChain[pearl] = i;
      pearlFraction[pearl] = fraction;
      pearlOffsetY[pearl] = randomRange(-0.004, 0.004, downpourRandom);
      pearlShimmer[pearl] = downpourRandom() * Math.PI * 2;
      pearlBaseAlpha[pearl] = randomRange(0.2, style === 2 ? 0.64 : 0.5, downpourRandom)
        * (0.88 + near * 0.24 + strength * 0.2);
      pearlAlphas[pearl] = pearlBaseAlpha[pearl];
      pearlUpperScales[pearl] = 1;
      pearlUpperSeed[pearl] = downpourRandom();
      pearlTopRetention[pearl] = randomRange(0.34, 0.48, downpourRandom);
      pearlTopSize[pearl] = randomRange(0.48, 0.7, downpourRandom);
      pearlTopAlpha[pearl] = randomRange(0.32, 0.58, downpourRandom);
      pearlSizes[pearl] = baseSize * (type < 0.7
        ? randomRange(0.68, 0.94, downpourRandom)
        : randomRange(0.88, 1.14, downpourRandom));
      pearlAspects[pearl] = style === 0
        ? randomRange(1.28, 1.82, downpourRandom)
        : randomRange(1.05, 1.48, downpourRandom);
      pearlHighlights[pearl] = style === 2
        ? randomRange(0.3, 0.52, downpourRandom)
        : randomRange(0.08, 0.24, downpourRandom);
      writeExtensionRainColor(
        pearlColors,
        index,
        strength,
        randomRange(0.38, style === 2 ? 0.86 : 0.68, downpourRandom),
        RAIN_ROLE.DOWNPOUR,
        style,
        downpourRandom
      );
    }

    for (let segment = 0; segment < beads - 1; segment += 1) {
      const line = chain.lineStart[i] + segment;
      const colorIndex = line * 6;
      linePearlA[line] = start + segment;
      linePearlB[line] = start + segment + 1;
      lineChain[line] = i;
      lineBaseAlpha[line] = randomRange(0.008, style === 2 ? 0.025 : 0.021, downpourRandom)
        * (0.78 + strength * 0.34)
        * (0.82 + near * 0.22);
      writeExtensionRainColor(
        lineColors,
        colorIndex,
        strength,
        randomRange(0.2, style === 2 ? 0.42 : 0.34, downpourRandom),
        RAIN_ROLE.DOWNPOUR,
        style,
        downpourRandom
      );
      lineColors[colorIndex + 3] = lineColors[colorIndex] * 1.1;
      lineColors[colorIndex + 4] = lineColors[colorIndex + 1] * 1.1;
      lineColors[colorIndex + 5] = lineColors[colorIndex + 2] * 1.1;
    }
  }

  let bridgeTrailCapacity = 0;
  for (let pearl = 0; pearl < pearlCount; pearl += 1) {
    const chainIndex = pearlChain[pearl];
    pearlStorm[pearl] = chain.stormWeight[chainIndex];
    pearlWaterfallTop[pearl] = chain.waterfallBlendTop[chainIndex];
    pearlWaterfallFeather[pearl] = chain.waterfallFeather[chainIndex];
    if (pearlStorm[pearl] > 0.08 && pearlUpperSeed[pearl] > 0.55) {
      bridgeTrailCapacity += 1;
    }
  }
  for (let segment = 0; segment < lineCount; segment += 1) {
    const stormWeight = chain.stormWeight[lineChain[segment]];
    const bandPhaseSeed = Math.sin((lineChain[segment] + 1) * 12.9898) * 43758.5453;
    const bandPhase = (bandPhaseSeed - Math.floor(bandPhaseSeed)) * Math.PI * 2;
    lineStorm[segment * 2] = stormWeight;
    lineStorm[segment * 2 + 1] = stormWeight;
    lineBandPhases[segment * 2] = bandPhase;
    lineBandPhases[segment * 2 + 1] = bandPhase;
  }

  const pearlGeometry = new THREE.BufferGeometry();
  pearlGeometry.setAttribute('position', new THREE.BufferAttribute(pearlPositions, 3).setUsage(THREE.DynamicDrawUsage));
  pearlGeometry.setAttribute('aColor', new THREE.BufferAttribute(pearlColors, 3));
  pearlGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(pearlAlphas, 1).setUsage(THREE.DynamicDrawUsage));
  pearlGeometry.setAttribute('aSize', new THREE.BufferAttribute(pearlSizes, 1));
  pearlGeometry.setAttribute('aUpperScale', new THREE.BufferAttribute(pearlUpperScales, 1).setUsage(THREE.DynamicDrawUsage));
  pearlGeometry.setAttribute('aUpperProgress', new THREE.BufferAttribute(pearlUpperProgress, 1).setUsage(THREE.DynamicDrawUsage));
  pearlGeometry.setAttribute('aAspect', new THREE.BufferAttribute(pearlAspects, 1));
  pearlGeometry.setAttribute('aHighlight', new THREE.BufferAttribute(pearlHighlights, 1));
  pearlGeometry.setAttribute('aStorm', new THREE.BufferAttribute(pearlStorm, 1));
  pearlGeometry.setAttribute('aWaterfallTop', new THREE.BufferAttribute(pearlWaterfallTop, 1));
  pearlGeometry.setAttribute('aWaterfallFeather', new THREE.BufferAttribute(pearlWaterfallFeather, 1));
  pearlGeometry.setAttribute('aMorphSeed', new THREE.BufferAttribute(pearlUpperSeed, 1));

  const pearlMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uFogDensity: { value: scene.fog.density },
      uMetalDark: { value: new THREE.Color(TUNING.metalRain.darkColor) },
      uMetalMid: { value: new THREE.Color(TUNING.metalRain.midColor) },
      uMetalBright: { value: new THREE.Color(TUNING.metalRain.brightColor) },
      uMetalTint: { value: new THREE.Color(TUNING.metalRain.tintColor) },
      uPearlBandFrequency: { value: TUNING.metalRain.pearlBandFrequency },
      uPearlBandSpeed: { value: TUNING.metalRain.pearlBandSpeed },
      uPearlSpecularPower: { value: TUNING.metalRain.pearlSpecularPower },
      uPearlFresnelStrength: { value: TUNING.metalRain.pearlFresnelStrength },
      uViewport: { value: rainViewport },
      uPlotBounds: { value: rainPlotBounds },
      uPlotFeather: { value: rainPlotFeather },
      uPlotClip: rainPlotClip,
      uMobileCrisp: { value: isPhoneLandscapeViewport() ? 1 : 0 },
      uMinPointSize: { value: TUNING.pearls.minPointSize },
      uMaxPointSize: { value: TUNING.pearls.maxPointSize }
    },
    vertexShader: `
      uniform float uPixelRatio;
      uniform float uBeadScale;
      uniform float uMobileCrisp;
      uniform float uMinPointSize;
      uniform float uMaxPointSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aSize;
      attribute float aUpperScale;
      attribute float aUpperProgress;
      attribute float aAspect;
      attribute float aHighlight;
      attribute float aStorm;
      attribute float aWaterfallTop;
      attribute float aWaterfallFeather;
      attribute float aMorphSeed;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAspect;
      varying float vHighlight;
      varying float vUpperProgress;
      varying float vTrailScale;
      varying float vFogDepth;
      varying float vStorm;
      varying float vWaterfall;

      void main() {
        float waterfallTransition = aStorm * (
          1.0 - smoothstep(
            aWaterfallTop - aWaterfallFeather,
            aWaterfallTop + aWaterfallFeather,
            position.y
          )
        );
        float massEntry = smoothstep(0.22, 0.92, waterfallTransition);
        float morphEligibility = mix(
          smoothstep(0.55, 0.82, aMorphSeed),
          0.62 + smoothstep(0.12, 0.98, aMorphSeed) * 0.38,
          massEntry
        );
        float trailEntry = smoothstep(0.04, 0.5, waterfallTransition);
        float lowerTrailRetention = 1.0 - smoothstep(0.96, 1.0, waterfallTransition) * 0.08;
        float trailScale = morphEligibility * trailEntry * lowerTrailRetention;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float depthScale = clamp(20.0 / max(5.2, -mvPosition.z), 0.82, 2.42);
        vColor = aColor;
        vAlpha = aAlpha;
        vAspect = aAspect
          * (1.0 + trailScale * mix(0.9, 2.2, massEntry))
          * mix(1.0, 0.72, massEntry);
        vHighlight = aHighlight;
        vUpperProgress = aUpperProgress;
        vTrailScale = trailScale;
        vFogDepth = -mvPosition.z;
        vStorm = aStorm;
        vWaterfall = waterfallTransition;
        gl_PointSize = mix(1.0, 0.5, uMobileCrisp) * uBeadScale * clamp(
          aSize * aUpperScale * (1.0 + trailScale * mix(0.7, 1.75, massEntry)) * uPixelRatio * depthScale,
          uMinPointSize * uPixelRatio,
          uMaxPointSize * uPixelRatio
        );
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFogDensity;
      uniform vec3 uMetalDark;
      uniform vec3 uMetalMid;
      uniform vec3 uMetalBright;
      uniform vec3 uMetalTint;
      uniform float uPearlBandFrequency;
      uniform float uPearlBandSpeed;
      uniform float uPearlSpecularPower;
      uniform float uPearlFresnelStrength;
      uniform float uMobileCrisp;
      uniform vec2 uViewport;
      uniform vec4 uPlotBounds;
      uniform vec3 uPlotFeather;
      uniform float uPlotClip;
      uniform float uBeadAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAspect;
      varying float vHighlight;
      varying float vUpperProgress;
      varying float vTrailScale;
      varying float vFogDepth;
      varying float vStorm;
      varying float vWaterfall;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        vec2 pearlPoint = vec2(point.x * vAspect, point.y);
        float distanceToEdge = length(pearlPoint);
        float waterfallMass = smoothstep(0.28, 1.0, vWaterfall);
        float edge = mix(
          1.0 - smoothstep(0.46, 0.5, distanceToEdge),
          1.0 - smoothstep(0.28, 0.58, distanceToEdge),
          waterfallMass
        );
        float crispEdge = 1.0 - smoothstep(0.44, 0.5, distanceToEdge);
        edge = mix(edge, crispEdge, uMobileCrisp);
        float sheetEdge = 1.0 - smoothstep(
          0.42,
          0.62,
          length(vec2(point.x * 0.94, point.y * 0.62))
        );
        edge = max(edge, sheetEdge * waterfallMass * mix(0.32, 0.08, uMobileCrisp));
        if (edge < 0.01) discard;

        float body = exp(-dot(pearlPoint, pearlPoint) * mix(4.6, 2.6, waterfallMass));
        float verticalSheet = exp(-(point.x * point.x * mix(18.0, 5.8, waterfallMass) + point.y * point.y * mix(6.0, 1.36, waterfallMass)))
          * waterfallMass;
        float lowerGlow = smoothstep(-0.34, 0.42, point.y) * mix(0.12, 0.28, waterfallMass);
        // Soft satin pearl sheen instead of a tight gem specular.
        vec2 sheenPoint = pearlPoint - vec2(-0.12, 0.18);
        float highlight = exp(-dot(sheenPoint, sheenPoint) * 40.0)
          * vHighlight
          * mix(1.0, 0.4, vUpperProgress);
        // Cool rim light on the lower/shadow side gives pearls roundness + weight.
        float opticalDetail = mix(1.0, 0.15, uMobileCrisp);
        float rimLight = smoothstep(0.32, 0.5, distanceToEdge)
          * smoothstep(0.05, -0.4, point.y) * vHighlight * 0.28 * opticalDetail;
        float rim = smoothstep(0.36, 0.5, distanceToEdge) * 0.08 * opticalDetail;
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        vec2 screenUv = vec2(
          gl_FragCoord.x / uViewport.x,
          1.0 - gl_FragCoord.y / uViewport.y
        );
        float horizontalMask = smoothstep(
          uPlotBounds.x,
          uPlotBounds.x + uPlotFeather.x,
          screenUv.x
        ) * (1.0 - smoothstep(
          uPlotBounds.y - uPlotFeather.x,
          uPlotBounds.y,
          screenUv.x
        ));
        horizontalMask = mix(1.0, horizontalMask, uPlotClip);
        float lowerMask = 1.0 - smoothstep(
          uPlotBounds.w - uPlotFeather.z,
          uPlotBounds.w,
          screenUv.y
        );
        lowerMask = mix(1.0, lowerMask, uPlotClip);
        float plotMask = horizontalMask * lowerMask;

        // Reconstruct a soft sphere normal from the point sprite. Alternating
        // dark and bright reflection bands make the pearl read as mercury
        // without converting every drop to a costly lit mesh.
        vec2 metalPoint = clamp(pearlPoint / 0.5, vec2(-1.0), vec2(1.0));
        float metalZ = sqrt(max(0.0, 1.0 - dot(metalPoint, metalPoint)));
        vec3 metalNormal = normalize(vec3(metalPoint, metalZ));
        vec3 keyDirection = normalize(vec3(-0.42, 0.62, 1.0));
        float metalSpecular = pow(
          max(0.0, dot(metalNormal, keyDirection)),
          max(0.01, uPearlSpecularPower)
        );
        float metalFresnel = pow(1.0 - clamp(metalNormal.z, 0.0, 1.0), 2.4);
        float reflectionWave = 0.5 + 0.5 * sin(
          metalNormal.y * uPearlBandFrequency
          + metalNormal.x * 2.4
          - uTime * uPearlBandSpeed
          + vStorm * 2.2
        );
        float mirrorBand = smoothstep(0.34, 0.86, reflectionWave);
        float shadowBand = smoothstep(0.68, 0.98, 1.0 - reflectionWave);
        vec3 color = mix(uMetalDark, uMetalMid, mirrorBand * 0.82 + body * 0.12);
        color = mix(color, uMetalBright, clamp(
          metalSpecular * 1.2 + metalFresnel * uPearlFresnelStrength,
          0.0,
          1.0
        ));
        float tintStrength = (verticalSheet * 0.2 + lowerGlow * 0.08)
          * mix(1.0, 0.62, uMobileCrisp);
        color = mix(color, uMetalTint, tintStrength);
        color = mix(color, uMetalDark, shadowBand * 0.56 + rim * 0.16);
        color += uMetalBright * (highlight * 0.18 + rimLight * 0.2);
        color *= mix(1.0, 0.78, vUpperProgress);
        color = mix(color, vec3(0.0, 0.0, 0.0), fogFactor * 0.48);
        float alpha = uBeadAlpha * edge * vAlpha * plotMask
          * mix(1.0, 0.45, uMobileCrisp)
          * (0.78 + highlight * 0.05 * opticalDetail + rimLight * 0.18 + verticalSheet * mix(0.16, 0.04, uMobileCrisp))
          * (1.0 - fogFactor * 0.38);
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(color, min(0.94, alpha));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeometry.setAttribute('aColor', new THREE.BufferAttribute(lineColors, 3));
  lineGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlphas, 1).setUsage(THREE.DynamicDrawUsage));
  lineGeometry.setAttribute('aStorm', new THREE.BufferAttribute(lineStorm, 1));
  lineGeometry.setAttribute('aBandPhase', new THREE.BufferAttribute(lineBandPhases, 1));

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFogDensity: { value: scene.fog.density },
      uMetalDark: { value: new THREE.Color(TUNING.metalRain.darkColor) },
      uMetalMid: { value: new THREE.Color(TUNING.metalRain.midColor) },
      uMetalBright: { value: new THREE.Color(TUNING.metalRain.brightColor) },
      uThreadBandDensity: { value: TUNING.metalRain.threadBandDensity },
      uThreadBandSpeed: { value: TUNING.metalRain.threadBandSpeed },
      uThreadMirrorStrength: { value: TUNING.metalRain.threadMirrorStrength },
      uViewport: { value: rainViewport },
      uPlotBounds: { value: rainPlotBounds },
      uPlotFeather: { value: rainPlotFeather },
      uPlotClip: rainPlotClip,
      uMobileCrisp: { value: isPhoneLandscapeViewport() ? 1 : 0 }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aStorm;
      attribute float aBandPhase;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vFogDepth;
      varying float vStorm;
      varying float vBandPhase;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vColor = aColor;
        vAlpha = aAlpha;
        vFogDepth = -mvPosition.z;
        vStorm = aStorm;
        vBandPhase = aBandPhase;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFogDensity;
      uniform vec3 uMetalDark;
      uniform vec3 uMetalMid;
      uniform vec3 uMetalBright;
      uniform float uThreadBandDensity;
      uniform float uThreadBandSpeed;
      uniform float uThreadMirrorStrength;
      uniform float uMobileCrisp;
      uniform vec2 uViewport;
      uniform vec4 uPlotBounds;
      uniform vec3 uPlotFeather;
      uniform float uPlotClip;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vFogDepth;
      varying float vStorm;
      varying float vBandPhase;

      void main() {
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        vec2 screenUv = vec2(
          gl_FragCoord.x / uViewport.x,
          1.0 - gl_FragCoord.y / uViewport.y
        );
        float horizontalMask = smoothstep(
          uPlotBounds.x,
          uPlotBounds.x + uPlotFeather.x,
          screenUv.x
        ) * (1.0 - smoothstep(
          uPlotBounds.y - uPlotFeather.x,
          uPlotBounds.y,
          screenUv.x
        ));
        horizontalMask = mix(1.0, horizontalMask, uPlotClip);
        float lowerMask = 1.0 - smoothstep(
          uPlotBounds.w - uPlotFeather.z,
          uPlotBounds.w,
          screenUv.y
        );
        lowerMask = mix(1.0, lowerMask, uPlotClip);
        float alpha = vAlpha * horizontalMask * lowerMask
          * mix(1.0, 5.0, uMobileCrisp)
          * (1.0 - fogFactor * 0.42);
        if (alpha < 0.0005) discard;
        float reflectionWave = 0.5 + 0.5 * sin(
          gl_FragCoord.y * uThreadBandDensity
          + gl_FragCoord.x * uThreadBandDensity * 0.1777778
          + vBandPhase
          - uTime * uThreadBandSpeed
          + vStorm * 2.6
        );
        float mirrorBand = smoothstep(0.42, 0.86, reflectionWave);
        float darkBand = smoothstep(0.7, 0.98, 1.0 - reflectionWave);
        vec3 color = mix(uMetalDark, uMetalMid, mirrorBand);
        color = mix(
          color,
          uMetalBright,
          mirrorBand * mirrorBand * (uThreadMirrorStrength + vStorm * 0.26)
        );
        color = mix(color, uMetalDark, darkBand * 0.58);
        color = mix(color, vec3(0.0, 0.0, 0.0), fogFactor * 0.55);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const points = new THREE.Points(pearlGeometry, pearlMaterial);
  points.renderOrder = 3;
  pearlMaterial.uniforms.uBeadScale = { value: 1.0 };
  pearlMaterial.uniforms.uBeadAlpha = { value: TUNING.pearls.alpha };

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.renderOrder = 2;

  const data = {
    ...chain,
    pearlCount,
    lineTotal: lineCount,
    pearlPositions,
    pearlAlphas,
    pearlBaseAlpha,
    pearlUpperScales,
    pearlUpperProgress,
    pearlUpperSeed,
    pearlTopRetention,
    pearlTopSize,
    pearlTopAlpha,
    pearlChain,
    pearlFraction,
    pearlOffsetY,
    pearlShimmer,
    linePositions,
    lineAlphas,
    lineBaseAlpha,
    linePearlA,
    linePearlB,
    lineChain,
    activeBridgeTrailCount: bridgeTrailCapacity
  };

  return { points, lines, data };
}

function updateRainChains(system, elapsed, delta) {
  const data = system.data;
  system.points.material.uniforms.uTime.value = elapsed;
  system.lines.material.uniforms.uTime.value = elapsed;

  for (let chain = 0; chain < data.count; chain += 1) {
    const isAmbientCurtain = data.role[chain] === RAIN_ROLE.AMBIENT;
    const previousTail = data.headY[chain] - data.length[chain];
    if (isAmbientCurtain) {
      data.headY[chain] = rainCeilingY - 0.03;
    } else {
      data.headY[chain] -= data.speed[chain] * delta * 0.58 * (0.92 + state.burst * 0.08);
    }
    const tail = data.headY[chain] - data.length[chain];
    const phase = data.phase[chain];
    const wind = Math.sin(elapsed * data.windSpeed[chain] + phase);
    const counterWind = Math.cos(elapsed * data.windSpeed[chain] * 0.72 + phase * 0.7);
    const pathX = data.baseX[chain] + wind * data.driftX[chain];
    const pathZ = data.z[chain] + counterWind * data.driftZ[chain];
    data.pathX[chain] = pathX;
    data.pathZ[chain] = pathZ;

    if (
      !isAmbientCurtain
      && data.presence[chain] > 0.08
      && previousTail >= WATER_LEVEL
      && tail < WATER_LEVEL
    ) {
      const stormWeight = queueRainImpact(
        impactPearls,
        pathX,
        pathZ,
        data.hour[chain],
        data.strength[chain],
        data.near[chain],
        data.role[chain],
        elapsed
      );
      tryEmitImpactRipple(
        impactPearls,
        rippleSystem,
        pathX,
        pathZ,
        data.strength[chain],
        stormWeight,
        data.role[chain],
        elapsed
      );
    }

    // Recycle at the impact plane. The water shader supplies the reflection;
    // the actual rain geometry must never continue into the water volume.
    if (!isAmbientCurtain && tail < WATER_LEVEL) {
      resetChainPosition(data, chain, false);
    }
  }

  for (let pearl = 0; pearl < data.pearlCount; pearl += 1) {
    const chain = data.pearlChain[pearl];
    const fraction = data.pearlFraction[pearl];
    const positionIndex = pearl * 3;
    const rawY = data.headY[chain] - fraction * data.length[chain] + data.pearlOffsetY[pearl];
    const y = Math.min(rawY, rainCeilingY);
    const ceilingFade = 1 - smoothstep(
      rainCeilingY - 0.055,
      rainCeilingY,
      rawY
    );
    const columnHeight = Math.max(0.8, data.top[chain] - WATER_LEVEL);
    const heightRatio = (y - WATER_LEVEL) / columnHeight;
    const nearWater = 1 - clamp(heightRatio, 0, 1);
    const pathX = data.pathX[chain];
    const pathZ = data.pathZ[chain];
    const focus = chainFocus(data.hour[chain], data.baseX[chain], data.z[chain]);
    const shimmer = 0.9 + Math.sin(elapsed * 4.2 + data.pearlShimmer[pearl]) * 0.12;
    const upperProgress = smoothstep(0.55, 1, heightRatio);
    const retention = lerp(1, data.pearlTopRetention[pearl], Math.pow(upperProgress, 1.15));
    const densityVisibility = upperProgress <= 0
      ? 1
      : 1 - smoothstep(retention - 0.06, retention + 0.06, data.pearlUpperSeed[pearl]);
    const upperSizeScale = lerp(1, data.pearlTopSize[pearl], Math.pow(upperProgress, 1.05));
    const upperAlphaScale = lerp(1, data.pearlTopAlpha[pearl], Math.pow(upperProgress, 1.1))
      * densityVisibility;
    const role = data.role[chain];
    const stormWeight = data.stormWeight[chain];
    const transitionTop = data.waterfallBlendTop[chain];
    const transitionWidth = data.waterfallFeather[chain];
    const waterfallTransition = stormWeight * (
      1 - smoothstep(transitionTop - transitionWidth, transitionTop + transitionWidth, y)
    );
    const morphRetention = clamp((data.pearlUpperSeed[pearl] - 0.55) / 0.27, 0, 1);
    const finalPearlScale = role === RAIN_ROLE.DOWNPOUR
      ? lerp(0.5, 0.82, morphRetention)
      : lerp(0.4, 0.68, morphRetention);
    const curtainFloorScale = lerp(
      1,
      finalPearlScale,
      waterfallTransition
    );
    const sizeWaterfallScale = lerp(
      1,
      role === RAIN_ROLE.DOWNPOUR
        ? lerp(0.96, 1.62, morphRetention)
        : lerp(0.78, 1.36, morphRetention),
      smoothstep(0.22, 1, waterfallTransition)
    );
    const deepWaterfallFade = lerp(
      1,
      role === RAIN_ROLE.DOWNPOUR
        ? lerp(0.76, 0.98, morphRetention)
        : lerp(0.62, 0.86, morphRetention),
      smoothstep(0.48, 1, waterfallTransition)
    );
    // Fade the bead before its screen-space body reaches the water. Mist and
    // impact particles bridge the contact, while the rain itself stays above.
    const rainFloorFade = role === RAIN_ROLE.DOWNPOUR
      ? smoothstep(WATER_LEVEL + 0.015, WATER_LEVEL + 0.1, y)
      : smoothstep(WATER_LEVEL + 0.02, WATER_LEVEL + 0.12, y);
    const lowerCurtain = data.curtainLayer[chain] === 1 ? 1 : 0;
    // 🎛️ 近水提亮对应 TUNING.floorGlow。数值越大，雨珠接近水面时越亮。
    const bottomGlow = role === RAIN_ROLE.BASE
      ? 1
        + smoothstep(0.02, 0.5, nearWater)
          * (TUNING.floorGlow.base + data.strength[chain] * TUNING.floorGlow.baseByStrength)
          * (1 - stormWeight)
        + lowerCurtain
          * (TUNING.floorGlow.lowerCurtain + data.strength[chain] * TUNING.floorGlow.lowerCurtainByStrength)
          * (1 - stormWeight)
      : role === RAIN_ROLE.DOWNPOUR
        ? 1 + smoothstep(0.02, 0.54, nearWater)
          * (TUNING.floorGlow.downpour + data.strength[chain] * TUNING.floorGlow.downpourByStrength)
          * (1 - stormWeight)
        : 1 + smoothstep(0.02, 0.5, nearWater) * TUNING.floorGlow.ambient;

    data.pearlPositions[positionIndex] = pathX;
    data.pearlPositions[positionIndex + 1] = y;
    data.pearlPositions[positionIndex + 2] = pathZ;
    data.pearlUpperScales[pearl] = upperSizeScale * sizeWaterfallScale;
    data.pearlUpperProgress[pearl] = upperProgress;
    data.pearlAlphas[pearl] = clamp(
      data.pearlBaseAlpha[pearl]
        * data.alpha[chain]
        * shimmer
        * ceilingFade
        * upperAlphaScale
        * rainFloorFade
        * bottomGlow
        * curtainFloorScale
        * deepWaterfallFade
        * (1 + focus * 0.56 + state.burst * localHourFocus(data.hour[chain], state.selectedHour) * 0.38),
      0,
      0.96
    );
  }

  for (let segment = 0; segment < data.lineTotal; segment += 1) {
    const a = data.linePearlA[segment] * 3;
    const b = data.linePearlB[segment] * 3;
    const lineIndex = segment * 6;
    const alphaIndex = segment * 2;
    const chain = data.lineChain[segment];
    const role = data.role[chain];
    const segmentY = (data.pearlPositions[a + 1] + data.pearlPositions[b + 1]) * 0.5;
    const stormWeight = data.stormWeight[chain];
    const transitionTop = data.waterfallBlendTop[chain];
    const transitionWidth = data.waterfallFeather[chain];
    const waterfallTransition = stormWeight * (
      1 - smoothstep(
        transitionTop - transitionWidth,
        transitionTop + transitionWidth,
        segmentY
      )
    );
    const bridgeBoost = 1 + 4 * waterfallTransition * (1 - waterfallTransition) * 0.88;
    const lineFloorScale = lerp(
      1,
      role === RAIN_ROLE.DOWNPOUR ? 0.12 : 0.2,
      waterfallTransition
    ) * bridgeBoost;
    const focus = chainFocus(data.hour[chain], data.baseX[chain], data.z[chain]);
    const endpointVisibility = clamp(
      (data.pearlAlphas[data.linePearlA[segment]] + data.pearlAlphas[data.linePearlB[segment]]) * 0.86,
      0,
      1
    );
    const lineRoleBoost = role === RAIN_ROLE.DOWNPOUR
      ? 2.45
      : role === RAIN_ROLE.AMBIENT ? 1.2 : 1;
    const alpha = data.lineBaseAlpha[segment]
      * endpointVisibility
      * (0.76 + focus * 0.52)
      * lineRoleBoost
      * lineFloorScale;

    data.linePositions[lineIndex] = data.pearlPositions[a];
    data.linePositions[lineIndex + 1] = Math.max(WATER_LEVEL + 0.006, data.pearlPositions[a + 1]);
    data.linePositions[lineIndex + 2] = data.pearlPositions[a + 2];
    data.linePositions[lineIndex + 3] = data.pearlPositions[b];
    data.linePositions[lineIndex + 4] = Math.max(WATER_LEVEL + 0.006, data.pearlPositions[b + 1]);
    data.linePositions[lineIndex + 5] = data.pearlPositions[b + 2];
    data.lineAlphas[alphaIndex] = alpha * 0.58;
    data.lineAlphas[alphaIndex + 1] = alpha;
  }

  system.points.geometry.attributes.position.needsUpdate = true;
  system.points.geometry.attributes.aAlpha.needsUpdate = true;
  system.points.geometry.attributes.aUpperScale.needsUpdate = true;
  system.points.geometry.attributes.aUpperProgress.needsUpdate = true;
  system.lines.geometry.attributes.position.needsUpdate = true;
  system.lines.geometry.attributes.aAlpha.needsUpdate = true;
}

function createWaterPlane() {
  const geometry = new THREE.PlaneGeometry(WORLD.width * 1.16, WORLD.depth * 2.3, 150, 92);
  geometry.rotateX(-Math.PI / 2);
  // Keep the rendered surface on the same height as the rain impact plane.
  // A lower offset exposed a dark horizontal slit in near-frontal views.
  geometry.translate(0, WATER_LEVEL, 1.25);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color(TUNING.water.deepColor) },
      uColorSurface: { value: new THREE.Color(TUNING.water.surfaceColor) },
      uRoughness: { value: TUNING.water.roughness },
      uSpecularStrength: { value: TUNING.water.specularStrength },
      uRippleHighlight: { value: TUNING.water.rippleHighlight },
      uSurfaceOpacity: { value: TUNING.water.surfaceOpacity },
      uHeightField: { value: null },
      uFieldBounds: {
        value: new THREE.Vector4(
          RIPPLE_FIELD.xMin,
          RIPPLE_FIELD.xMax,
          RIPPLE_FIELD.zMin,
          RIPPLE_FIELD.zMax
        )
      },
      uFieldTexel: { value: new THREE.Vector2(1 / RIPPLE_FIELD.resX, 1 / RIPPLE_FIELD.resZ) },
      uRippleGain: { value: TUNING.ripple.gain },
      uRippleDisplace: { value: TUNING.ripple.displace },
      uWavePrimary: { value: TUNING.water.wavePrimary },
      uWaveSecondary: { value: TUNING.water.waveSecondary },
      // 降雨强度 LUT（与 mistBand 共享）：按世界 X 给出该列真实雨量，
      // 让水面倒影与上方雨柱逐列对齐。值在场景装配后注入。
      uRainLut: { value: null },
      uLutBounds: { value: new THREE.Vector2(hourToX(0), hourToX(24) - hourToX(0)) },
      // 倒影外观（面板实时可调）
      uReflStrength: { value: TUNING.water.reflStrength },
      uReflFade: { value: TUNING.water.reflFade },
      uRearFadeNearZ: { value: TUNING.water.rearFadeNearZ },
      uRearFadeFarZ: { value: TUNING.water.rearFadeFarZ }
    },
    vertexShader: `
      uniform float uTime;
      uniform sampler2D uHeightField;
      uniform vec4 uFieldBounds;
      uniform float uRippleDisplace;
      uniform float uWavePrimary;
      uniform float uWaveSecondary;
      varying vec2 vUv;
      varying vec3 vWorld;

      void main() {
        vec3 transformed = position;
        float wave = sin(uTime * 1.2 + position.x * 0.55 + position.z * 0.34) * uWavePrimary;
        wave += sin(-uTime * 0.86 + position.x * 0.18 - position.z * 0.9) * uWaveSecondary;
        // GPU 高度场驱动真实顶点起伏 — 雨滴落点在水面上顶出凹坑并向外扩散
        vec2 fUv = vec2(
          (position.x - uFieldBounds.x) / (uFieldBounds.y - uFieldBounds.x),
          (position.z - uFieldBounds.z) / (uFieldBounds.w - uFieldBounds.z)
        );
        if (fUv.x > 0.0 && fUv.x < 1.0 && fUv.y > 0.0 && fUv.y < 1.0) {
          wave += texture2D(uHeightField, fUv).r * uRippleDisplace;
        }
        transformed.y += wave;
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vWorld = worldPosition.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorDeep;
      uniform vec3 uColorSurface;
      uniform float uRoughness;
      uniform float uSpecularStrength;
      uniform float uRippleHighlight;
      uniform float uSurfaceOpacity;
      uniform sampler2D uHeightField;
      uniform vec4 uFieldBounds;
      uniform vec2 uFieldTexel;
      uniform float uRippleGain;
      uniform sampler2D uRainLut;
      uniform vec2 uLutBounds;
      uniform float uReflStrength;
      uniform float uReflFade;
      uniform float uRearFadeNearZ;
      uniform float uRearFadeFarZ;
      varying vec2 vUv;
      varying vec3 vWorld;

      void main() {
        // Sample GPU height field neighbours → per-pixel surface normal
        vec2 fUv = vec2(
          (vWorld.x - uFieldBounds.x) / (uFieldBounds.y - uFieldBounds.x),
          (vWorld.z - uFieldBounds.z) / (uFieldBounds.w - uFieldBounds.z)
        );
        float hC = 0.0, hL = 0.0, hR = 0.0, hT = 0.0, hB = 0.0;
        if (fUv.x > 0.01 && fUv.x < 0.99 && fUv.y > 0.01 && fUv.y < 0.99) {
          hC = texture2D(uHeightField, fUv).r;
          hL = texture2D(uHeightField, fUv - vec2(uFieldTexel.x, 0.0)).r;
          hR = texture2D(uHeightField, fUv + vec2(uFieldTexel.x, 0.0)).r;
          hT = texture2D(uHeightField, fUv + vec2(0.0, uFieldTexel.y)).r;
          hB = texture2D(uHeightField, fUv - vec2(0.0, uFieldTexel.y)).r;
        }

        // Surface normal from finite-difference height gradients.
        // Fixed scale: gradient of ~0.08 → ~15° tilt — subtle but visible.
        // uRippleGain only controls reflected light energy, not geometry height.
        float nScale = 3.5;
        vec3 normal = normalize(vec3((hL - hR) * nScale, 1.0, (hB - hT) * nScale));

        // Physical water lighting: Fresnel + specular + diffuse
        vec3 viewDir   = normalize(cameraPosition - vWorld);
        vec3 lightDir  = normalize(vec3(-0.35, 0.88, 0.42));
        float diffuse  = max(dot(normal, lightDir), 0.0);
        float fresnel  = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.5);
        vec3 reflDir   = reflect(-lightDir, normal);
        float specularPower = mix(150.0, 28.0, uRoughness);
        float specular = pow(max(dot(reflDir, viewDir), 0.0), specularPower);

        // Use local slope + curvature instead of broad height values. This keeps
        // highlights on the moving ripple rings rather than whitening the whole
        // surface into a frosted sheet.
        float neighbourAverage = (hL + hR + hT + hB) * 0.25;
        float rippleSlope = length(vec2(hL - hR, hB - hT));
        float rippleCurvature = abs(hC - neighbourAverage);
        float rippleSignal = (rippleSlope * 1.7 + rippleCurvature * 2.8) * uRippleGain;
        float rippleEnergy = smoothstep(0.08, 0.68, rippleSignal);
        float rippleHighlight = pow(rippleEnergy, 1.65);
        float rippleGlow = rippleHighlight * (0.42 + diffuse * 0.48);

        // Keep the base water dark and mirror-like; reserve the pale blue-white
        // energy for narrow specular and ripple highlights.
        vec3 edgeColor = vec3(0.58, 0.69, 0.82);
        vec3 rippleColor = vec3(0.72, 0.84, 0.96);
        float surfaceFill = mix(0.12, 0.34, uRoughness);
        float fresnelFill = mix(0.42, 0.24, uRoughness);
        float diffuseFill = mix(0.025, 0.2, uRoughness);
        vec3 color = mix(
          uColorDeep,
          uColorSurface,
          surfaceFill + fresnel * fresnelFill + diffuse * diffuseFill
        );
        color += edgeColor * specular * uSpecularStrength;
        color += rippleColor * rippleGlow * uRippleHighlight;

        // Rain-column reflection: rain above mirrors into the dark water surface
        float dz        = vWorld.z - 1.15;
        float depthFade = smoothstep(-0.7, 0.0, dz) * (1.0 - smoothstep(0.2, uReflFade, dz));
        float wobX      = vWorld.x + (hL - hR) * 1.15;
        float lutX      = clamp((wobX - uLutBounds.x) / uLutBounds.y, 0.0, 1.0);
        float colRain   = pow(texture2D(uRainLut, vec2(lutX, 0.5)).r, 1.3);
        float hMask     = smoothstep(-0.01, 0.05, lutX) * (1.0 - smoothstep(0.95, 1.01, lutX));
        // Gentle shimmer driven by height field, not synthetic sine stripes
        float shimmer = 0.7 + 0.3 * sin(uTime * 0.9 + wobX * 1.4 + dz * 2.2 + hC * 4.0);
        // Grey-blue reflection matches pearl colour → bridges rain-to-water
        float rippleReflection = 1.0 + rippleHighlight * 0.62;
        color += vec3(0.56, 0.66, 0.78)
          * colRain * depthFade * hMask * shimmer * uReflStrength * rippleReflection;

        // Broad waterline seam: soft grey-blue glow where rain meets water
        float seam = colRain * exp(-pow(dz * 1.4, 2.0)) * 0.5 * hMask;
        color += vec3(0.44, 0.54, 0.66) * seam;

        // Clamp the physical surface opacity first, then apply the rear mask.
        // This matters when surfaceOpacity > 1: otherwise the clamp keeps most
        // of the fade fully opaque and produces a sudden edge near the back.
        float frontFade = smoothstep(0.0, 0.14, vUv.y);
        float rearFade = smoothstep(
          min(uRearFadeFarZ, uRearFadeNearZ),
          max(uRearFadeFarZ, uRearFadeNearZ),
          vWorld.z
        );
        float surfaceAlpha = min(
          0.88,
          uSurfaceOpacity + fresnel * 0.18 + rippleGlow * 0.3
        );
        // Feather both physical side edges so rotating the scene never reveals
        // the water plane as a hard rectangular wall.
        float sideFade = smoothstep(0.0, 0.16, vUv.x)
          * smoothstep(0.0, 0.16, 1.0 - vUv.x);
        float alpha = surfaceAlpha * frontFade * rearFade * sideFade;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 0;
  return mesh;
}

// A thin, dark-teal floor sitting 0.28 units below the water surface, visible
// through the semi-transparent water plane. Creates the "shallow pool" depth cue
// — you can almost see the bottom through the water.
function createPoolFloor() {
  const geometry = new THREE.PlaneGeometry(WORLD.width * 1.16, WORLD.depth * 2.3);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, WATER_LEVEL - 0.28, 1.25);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(TUNING.water.deepColor) },
      uRearFadeNearZ: { value: TUNING.water.rearFadeNearZ },
      uRearFadeFarZ: { value: TUNING.water.rearFadeFarZ }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vUv = uv;
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uRearFadeNearZ;
      uniform float uRearFadeFarZ;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        float frontFade = smoothstep(0.0, 0.12, vUv.y);
        float rearFade = smoothstep(
          min(uRearFadeFarZ, uRearFadeNearZ),
          max(uRearFadeFarZ, uRearFadeNearZ),
          vWorld.z
        );
        float sideFade = smoothstep(0.0, 0.18, vUv.x)
          * smoothstep(0.0, 0.18, 1.0 - vUv.x);
        float alpha = 0.75 * frontFade * rearFade * sideFade;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;
  return mesh;
}

// Soft, continuous glowing mist hovering at the waterline. Its horizontal
// intensity follows the rainfall curve via a precomputed lookup texture, so the
// haze is brightest beneath heavy rain and fades where there is little — exactly
// the milky band in the reference, instead of scattered dots.
function createMistBand() {
  const N = 256;
  const xMin = hourToX(0);
  const xMax = hourToX(24);
  const span = xMax - xMin;

  const acc = new Float32Array(N);
  const wsum = new Float32Array(N);
  for (let h = 0; h <= 24; h += 0.04) {
    const frac = clamp((hourToX(h) - xMin) / span, 0, 1);
    const s = sampleRainStrength(h);
    const center = frac * (N - 1);
    const radius = 7;
    const lo = Math.max(0, Math.floor(center - radius));
    const hi = Math.min(N - 1, Math.ceil(center + radius));
    for (let j = lo; j <= hi; j += 1) {
      const d = (j - center) / radius;
      const w = Math.exp(-d * d * 1.3);
      acc[j] += s * w;
      wsum[j] += w;
    }
  }
  const packed = new Float32Array(N * 4);
  for (let j = 0; j < N; j += 1) {
    const hour = j / (N - 1) * 24;
    const presence = sampleRainPresence(hour);
    const intensity = (wsum[j] > 0 ? Math.pow(acc[j] / wsum[j], 1.12) : 0) * presence;
    packed[j * 4] = intensity;
    packed[j * 4 + 1] = intensity;
    packed[j * 4 + 2] = intensity;
    packed[j * 4 + 3] = 1;
  }
  const lut = new THREE.DataTexture(packed, N, 1, THREE.RGBAFormat, THREE.FloatType);
  lut.minFilter = THREE.LinearFilter;
  lut.magFilter = THREE.LinearFilter;
  lut.wrapS = THREE.ClampToEdgeWrapping;
  lut.wrapT = THREE.ClampToEdgeWrapping;
  lut.needsUpdate = true;

  const height = TUNING.mist.height;
  const geometry = new THREE.PlaneGeometry(span * 1.01, height, 1, 1);
  geometry.translate((xMin + xMax) * 0.5, WATER_LEVEL + height * 0.5 - 0.42, 1.15);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLut: { value: lut },
      uColor: { value: new THREE.Color(TUNING.mist.color) },
      uOpacity: { value: TUNING.mist.opacity },
      uReflOpacity: { value: TUNING.mist.reflectionOpacity },
      uViewport: { value: rainViewport },
      uPlotBounds: { value: rainPlotBounds },
      uPlotFeather: { value: rainPlotFeather }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uLut;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uReflOpacity;
      uniform vec2 uViewport;
      uniform vec4 uPlotBounds;
      uniform vec3 uPlotFeather;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.21, 289.7))) * 43758.5453);
      }

      void main() {
        float intensity = texture2D(uLut, vec2(vUv.x, 0.5)).r;
        // Vertical profile: a bright core right at the waterline that fades up
        // into a low haze, and fades OUT below the waterline so the band never
        // shows as a panel beneath the axis.
        float core = exp(-pow((vUv.y - 0.14) * 6.4, 2.0));
        float haze = exp(-pow((vUv.y - 0.2) * 2.4, 2.0)) * 0.5;
        float lowerCut = smoothstep(0.05, 0.14, vUv.y);
        float yb = (core + haze) * lowerCut;
        // Gentle breathing + fine grain so the band reads as drifting vapour.
        float drift = 0.88 + 0.12 * sin(uTime * 0.5 + vUv.x * 7.3);
        float grain = 0.9 + 0.1 * hash(floor(vUv * vec2(120.0, 92.0)) + floor(uTime * 1.3));
        intensity *= drift * grain;

        vec2 screenUv = vec2(
          gl_FragCoord.x / uViewport.x,
          1.0 - gl_FragCoord.y / uViewport.y
        );
        float horizontalMask = smoothstep(
          uPlotBounds.x,
          uPlotBounds.x + uPlotFeather.x,
          screenUv.x
        ) * (1.0 - smoothstep(
          uPlotBounds.y - uPlotFeather.x,
          uPlotBounds.y,
          screenUv.x
        ));

        // Reflection of the rain in the water just below the waterline — a dim,
        // vertically-streaked glow that fades down with depth.
        float reflBand = smoothstep(0.0, 0.11, vUv.y) * (1.0 - smoothstep(0.1, 0.135, vUv.y));
        float reflStreak = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(vUv.x * 240.0 + hash(vec2(floor(vUv.x * 60.0), 1.0)) * 7.0), 1.8);
        float reflWobble = 0.85 + 0.15 * sin(uTime * 1.2 + vUv.x * 30.0);
        float refl = reflBand * reflStreak * reflWobble;

        float sideFade = smoothstep(0.0, 0.08, vUv.x)
          * smoothstep(0.0, 0.08, 1.0 - vUv.x);
        float a = intensity * (yb + refl * uReflOpacity) * uOpacity * horizontalMask * sideFade;
        if (a < 0.002) discard;
        vec3 color = uColor * (0.7 + intensity * 0.6);
        gl_FragColor = vec4(color, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rain-mist-band';
  mesh.renderOrder = 1.7;
  mesh.frustumCulled = false;

  return { mesh, material, lut, lutXMin: xMin, lutSpan: span };
}

function updateMistBandHeight(system, height) {
  const safeHeight = Math.max(0.001, height);
  const centerX = system.lutXMin + system.lutSpan * 0.5;
  const geometry = new THREE.PlaneGeometry(system.lutSpan * 1.01, safeHeight, 1, 1);
  geometry.translate(centerX, WATER_LEVEL + safeHeight * 0.5 - 0.42, 1.15);
  system.mesh.geometry.dispose();
  system.mesh.geometry = geometry;
}

function createPeakWaterfallSystem(filamentCount, rainData) {
  const group = new THREE.Group();
  group.name = 'peak-waterfall-system';

  const bodyGeometry = createPeakWaterfallBodyGeometry();
  const bodyMaterial = createPeakWaterfallBodyMaterial();
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.name = 'peak-waterfall-density-body';
  body.renderOrder = 1.5;
  body.frustumCulled = false;

  const filamentSet = createPeakWaterfallFilamentGeometry(filamentCount, rainData);
  const filamentMaterial = createPeakWaterfallFilamentMaterial(false);
  const filaments = new THREE.Mesh(filamentSet.geometry, filamentMaterial);
  filaments.name = 'peak-waterfall-filaments';
  filaments.renderOrder = 2.45;
  filaments.frustumCulled = false;

  const highlightMaterial = createPeakWaterfallFilamentMaterial(true);
  const highlights = new THREE.Mesh(filamentSet.highlightGeometry, highlightMaterial);
  highlights.name = 'peak-waterfall-filament-highlights';
  highlights.renderOrder = 2.75;
  highlights.frustumCulled = false;

  group.add(body, filaments, highlights);

  return {
    group,
    materials: [bodyMaterial, filamentMaterial, highlightMaterial],
    bodyCount: peakWaterfallRanges.length,
    peakCount: peakWaterfallRanges.length,
    filamentCapacity: filamentCount,
    visibleFilamentCount: filamentCount,
    bridgeFilamentCount: filamentSet.bridgeCount,
    coreFilamentCount: filamentSet.coreCount,
    lowerFilamentCount: filamentSet.lowerCount,
    wideFilamentCount: filamentSet.wideCount,
    foregroundFilamentCount: filamentSet.foregroundCount,
    highlightFilamentCount: filamentSet.highlightCount,
    ribbonSegments: filamentSet.ribbonSegments
  };
}

function createPeakWaterfallBodyGeometry() {
  const xSegments = 76;
  const ySegments = 30;
  const verticesPerPeak = (xSegments + 1) * (ySegments + 1);
  const vertexCount = verticesPerPeak * peakWaterfallRanges.length;
  const positions = new Float32Array(vertexCount * 3);
  const local = new Float32Array(vertexCount * 2);
  const storm = new Float32Array(vertexCount);
  const seed = new Float32Array(vertexCount);
  const indices = new Uint16Array(
    peakWaterfallRanges.length * xSegments * ySegments * 6
  );
  let vertexCursor = 0;
  let indexCursor = 0;

  for (let peak = 0; peak < peakWaterfallRanges.length; peak += 1) {
    const [startHour, endHour] = peakWaterfallRanges[peak];
    const peakVertexOffset = vertexCursor;

    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xProgress = xIndex / xSegments;
      const hour = lerp(startHour, endHour, xProgress);
      const topY = sampleWaterfallTopY(hour);
      const stormWeight = sampleStormWeight(hour);
      const bottomY = WATER_LEVEL;
      const baseZ = 0.18 + (valueNoise(hour * 2.1, RAIN_CLUSTER_SEED ^ 0x71e503ab) - 0.5) * 0.16;

      for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
        const yProgress = yIndex / ySegments;
        const positionIndex = vertexCursor * 3;
        const localIndex = vertexCursor * 2;
        positions[positionIndex] = hourToX(hour);
        positions[positionIndex + 1] = lerp(bottomY, topY, yProgress);
        positions[positionIndex + 2] = baseZ
          + (valueNoise(hour * 3.2 + yProgress * 1.7, RAIN_CLUSTER_SEED ^ 0x4f9a6d31) - 0.5) * 0.08;
        local[localIndex] = xProgress;
        local[localIndex + 1] = yProgress;
        storm[vertexCursor] = stormWeight;
        seed[vertexCursor] = peak * 17.3 + xProgress * 4.7;
        vertexCursor += 1;
      }
    }

    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
        const column = ySegments + 1;
        const a = peakVertexOffset + xIndex * column + yIndex;
        const b = a + column;
        indices[indexCursor++] = a;
        indices[indexCursor++] = b;
        indices[indexCursor++] = a + 1;
        indices[indexCursor++] = b;
        indices[indexCursor++] = b + 1;
        indices[indexCursor++] = a + 1;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLocal', new THREE.BufferAttribute(local, 2));
  geometry.setAttribute('aStorm', new THREE.BufferAttribute(storm, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  if (vertexCount > 0) geometry.computeBoundingSphere();
  return geometry;
}

function createPeakWaterfallBodyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: prefersReducedMotion ? 0 : 1 },
      uDeep: { value: new THREE.Color(TUNING.metalRain.darkColor) },
      uMid: { value: new THREE.Color(TUNING.metalRain.midColor) },
      uBright: { value: new THREE.Color(TUNING.metalRain.brightColor) },
      uBodyBandDensity: { value: TUNING.metalRain.bodyBandDensity },
      uBodyBandSpeed: { value: TUNING.metalRain.bodyBandSpeed },
      uBodyMirrorStrength: { value: TUNING.metalRain.bodyMirrorStrength },
      uBroadSway: { value: TUNING.waterfallBody.broadSway },
      uFineSway: { value: TUNING.waterfallBody.fineSway },
      uStreakFrequency: { value: TUNING.waterfallBody.streakFrequency },
      uFineStreakFrequency: { value: TUNING.waterfallBody.fineStreakFrequency },
      uStreakSharpness: { value: TUNING.waterfallBody.streakSharpness },
      uFineStreakSharpness: { value: TUNING.waterfallBody.fineStreakSharpness },
      uFineStreakWeight: { value: TUNING.waterfallBody.fineStreakWeight },
      uBaseMass: { value: TUNING.waterfallBody.baseMass },
      uRiseMass: { value: TUNING.waterfallBody.riseMass },
      uCloudLow: { value: TUNING.waterfallBody.cloudLow },
      uCloudHigh: { value: TUNING.waterfallBody.cloudHigh },
      uGapDarkness: { value: TUNING.waterfallBody.gapDarkness },
      uStreakBrightness: { value: TUNING.waterfallBody.streakBrightness },
      uBottomFeather: { value: TUNING.waterfallBody.bottomFeather },
      uOpacity: { value: TUNING.waterfallBody.opacity },
      uViewport: { value: rainViewport },
      uPlotBounds: { value: rainPlotBounds },
      uPlotFeather: { value: rainPlotFeather },
      uPlotClip: rainPlotClip
    },
    vertexShader: `
      uniform float uTime;
      uniform float uMotion;
      uniform float uBroadSway;
      uniform float uFineSway;
      attribute vec2 aLocal;
      attribute float aStorm;
      attribute float aSeed;
      varying vec2 vLocal;
      varying float vStorm;
      varying float vSeed;
      varying vec3 vWorld;

      void main() {
        float time = uTime * uMotion;
        vec3 transformed = position;
        float sway = sin(position.y * 2.8 - time * 1.9 + aSeed * 1.7) * uBroadSway;
        sway += sin(position.y * 7.1 - time * 4.2 - position.x) * uFineSway;
        transformed.x += sway * aStorm * (0.45 + aLocal.y * 0.55);
        vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
        vLocal = aLocal;
        vStorm = aStorm;
        vSeed = aSeed;
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uBright;
      uniform float uBodyBandDensity;
      uniform float uBodyBandSpeed;
      uniform float uBodyMirrorStrength;
      uniform float uStreakFrequency;
      uniform float uFineStreakFrequency;
      uniform float uStreakSharpness;
      uniform float uFineStreakSharpness;
      uniform float uFineStreakWeight;
      uniform float uBaseMass;
      uniform float uRiseMass;
      uniform float uCloudLow;
      uniform float uCloudHigh;
      uniform float uGapDarkness;
      uniform float uStreakBrightness;
      uniform float uBottomFeather;
      uniform float uOpacity;
      uniform vec2 uViewport;
      uniform vec4 uPlotBounds;
      uniform vec3 uPlotFeather;
      uniform float uPlotClip;
      varying vec2 vLocal;
      varying float vStorm;
      varying float vSeed;
      varying vec3 vWorld;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 57.0;
        return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = noise(p) * 0.55;
        p = p * 2.03 + vec2(7.1, 13.7);
        value += noise(p) * 0.29;
        p = p * 2.07 + vec2(17.3, 5.9);
        value += noise(p) * 0.16;
        return value;
      }

      void main() {
        float time = uTime * uMotion;

        // Soft horizontal sheet edges.
        float edgeWarp = noise(vec2(vLocal.y * 6.0 - time * 0.6, vSeed));
        float edge = smoothstep(0.02 + edgeWarp * 0.04, 0.17, vLocal.x)
          * (1.0 - smoothstep(0.83, 0.98 - edgeWarp * 0.04, vLocal.x));

        // Vertical volume profile: a heavy bright mass at the base that billows
        // up and fades — the "reverse waterfall". Top feathers into the pearls.
        float baseMass = exp(-pow((vLocal.y - 0.04) * 2.6, 2.0));
        float rise = 1.0 - smoothstep(0.0, 0.8, vLocal.y);
        float topFade = 1.0 - smoothstep(0.6, 1.0, vLocal.y);

        // Soft organic billow (low frequency, slow) — this carries the volume
        // and light/dark, instead of hard procedural stripes.
        float billow = fbm(vec2(vWorld.x * 0.85 + vSeed * 0.3, vLocal.y * 1.7 - time * 0.5));
        float billow2 = fbm(vec2(vWorld.x * 1.7 - vSeed * 0.6, vLocal.y * 3.1 - time * 0.95));
        float cloud = smoothstep(0.22, 0.86, billow * 0.7 + billow2 * 0.42);

        // Vertical water-flow streaks give the bloom real texture (de-blur):
        // bright water columns separated by darker gaps, flowing downward.
        float warp = fbm(vec2(vWorld.x * 0.9 + vSeed, vLocal.y * 1.2 - time * 0.4));
        // 🎛️ 瀑布纹理对应 TUNING.waterfallBody：密度越大越细密，锐度越大越分明。
        float streaks = pow(
          0.5 + 0.5 * sin(vWorld.x * uStreakFrequency + warp * 5.0 + vSeed * 3.0),
          uStreakSharpness
        );
        float fineStreaks = pow(
          0.5 + 0.5 * sin(vWorld.x * uFineStreakFrequency + warp * 7.0),
          uFineStreakSharpness
        ) * uFineStreakWeight;
        float flow = clamp(streaks + fineStreaks, 0.0, 1.0);
        float advect = noise(vec2(vWorld.x * 8.0 + vSeed, vLocal.y * 6.0 + time * 2.0));
        flow *= (0.5 + advect * 0.75);

        // 🎛️ 瀑布密度对应 TUNING.waterfallBody：底部质量、云团对比、缝隙黑度、雨丝亮度。
        float volume = (baseMass * uBaseMass + rise * uRiseMass)
          * mix(uCloudLow, uCloudHigh, cloud)
          * mix(uGapDarkness, uStreakBrightness, flow);

        vec2 screenUv = vec2(
          gl_FragCoord.x / uViewport.x,
          1.0 - gl_FragCoord.y / uViewport.y
        );
        float horizontalMask = smoothstep(
          uPlotBounds.x,
          uPlotBounds.x + uPlotFeather.x,
          screenUv.x
        ) * (1.0 - smoothstep(
          uPlotBounds.y - uPlotFeather.x,
          uPlotBounds.y,
          screenUv.x
        ));
        horizontalMask = mix(1.0, horizontalMask, uPlotClip);
        float lowerMask = 1.0 - smoothstep(
          uPlotBounds.w - uPlotFeather.z,
          uPlotBounds.w,
          screenUv.y
        );
        lowerMask = mix(1.0, lowerMask, uPlotClip);

        // Feather the bottom edge to black so the noisy geometry base never reads
        // as a lit "wave" silhouette near the waterline — it dissolves into the dark.
        // 🎛️ 瀑布底边对应 TUNING.waterfallBody.bottomFeather。
        float bottomFeather = smoothstep(0.0, max(0.0001, uBottomFeather), vLocal.y);
        float intensity = volume * edge * topFade * vStorm * horizontalMask * lowerMask * bottomFeather;
        if (intensity < 0.002) discard;

        // Moving black/silver reflection bands turn the procedural volume into
        // a mercury sheet. Normal alpha blending is used below so the dark
        // chrome cavities remain visible instead of disappearing additively.
        float reflectionSweep = 0.5 + 0.5 * sin(
          vWorld.x * uBodyBandDensity
          + warp * 5.4
          - vLocal.y * 2.1
          - time * uBodyBandSpeed
        );
        float mirrorBand = smoothstep(0.46, 0.9, reflectionSweep + flow * 0.18);
        float cavityBand = smoothstep(0.6, 0.96, 1.0 - reflectionSweep + (1.0 - cloud) * 0.14);
        vec3 color = mix(uDeep, uMid, clamp(cloud * 0.5 + volume * 0.16, 0.0, 1.0));
        color = mix(color, uBright, clamp(
          mirrorBand * uBodyMirrorStrength + flow * 0.3 + baseMass * 0.08,
          0.0,
          1.0
        ));
        color = mix(color, uDeep, cavityBand * 0.72);
        float metalAlpha = clamp(1.0 - exp(-intensity * uOpacity * 0.72), 0.0, 0.92);
        gl_FragColor = vec4(color, metalAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });
}

function createPeakWaterfallFilamentGeometry(count, rainData) {
  const geometry = new THREE.InstancedBufferGeometry();
  const ribbonSegments = 14;
  const vertexCount = (ribbonSegments + 1) * 2;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(ribbonSegments * 6);
  let vertexCursor = 0;
  let indexCursor = 0;

  for (let segment = 0; segment <= ribbonSegments; segment += 1) {
    const localY = segment / ribbonSegments;
    for (let side = 0; side < 2; side += 1) {
      const positionIndex = vertexCursor * 3;
      const uvIndex = vertexCursor * 2;
      positions[positionIndex] = side === 0 ? -0.5 : 0.5;
      positions[positionIndex + 1] = localY;
      positions[positionIndex + 2] = 0;
      uvs[uvIndex] = side;
      uvs[uvIndex + 1] = localY;
      vertexCursor += 1;
    }
  }

  for (let segment = 0; segment < ribbonSegments; segment += 1) {
    const a = segment * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices[indexCursor++] = a;
    indices[indexCursor++] = b;
    indices[indexCursor++] = c;
    indices[indexCursor++] = c;
    indices[indexCursor++] = b;
    indices[indexCursor++] = d;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const anchor = new Float32Array(count * 3);
  const dimensions = new Float32Array(count * 2);
  const flow = new Float32Array(count * 4);
  const breaks = new Float32Array(count * 2);
  const storm = new Float32Array(count);
  const drift = new Float32Array(count * 3);
  const filamentClass = new Float32Array(count);
  const random = createSeededRandom(RAIN_CLUSTER_SEED ^ 0x6e52c9b3);
  const peakHourSampler = createIntegratedDownpourHourSampler(random);
  const highlightCount = Math.round(count * 0.06);
  const foregroundTarget = highlightCount;
  const bridgeTarget = rainData.downpourCount > 0 ? Math.round(count * 0.24) : 0;
  const coreTarget = Math.round(count * 0.6);
  let bridgeCount = 0;
  let coreCount = 0;
  let wideCount = 0;
  let foregroundCount = 0;

  for (let i = 0; i < count; i += 1) {
    const isForeground = i < foregroundTarget;
    const isBridge = !isForeground && i < foregroundTarget + bridgeTarget;
    const isCore = !isForeground && !isBridge && i < foregroundTarget + bridgeTarget + coreTarget;
    const isWide = !isForeground && !isBridge && !isCore;
    filamentClass[i] = isBridge ? 0 : isCore ? 1 : isWide ? 2 : 3;
    let hour = 18;
    let stormWeight = 0;
    const positionIndex = i * 3;
    const dimensionIndex = i * 2;
    const flowIndex = i * 4;
    const breakIndex = i * 2;
    const driftIndex = i * 3;

    if (isBridge) {
      const downpourIndex = rainData.baseCount
        + rainData.ambientCount
        + Math.floor(random() * rainData.downpourCount);
      hour = rainData.hour[downpourIndex];
      stormWeight = rainData.stormWeight[downpourIndex];
      const topY = rainData.waterfallTop[downpourIndex];
      const bridgeBottom = Math.max(WATER_LEVEL, topY - randomRange(1.15, 1.95, random));
      const near = rainData.near[downpourIndex];

      anchor[positionIndex] = rainData.baseX[downpourIndex] + randomRange(-0.018, 0.018, random);
      anchor[positionIndex + 1] = bridgeBottom;
      anchor[positionIndex + 2] = rainData.z[downpourIndex];
      dimensions[dimensionIndex] = randomRange(0.008, 0.028, random) * (0.84 + near * 0.26);
      dimensions[dimensionIndex + 1] = randomRange(1.35, 2.35, random);
      flow[flowIndex] = clamp(rainData.speed[downpourIndex], 2.8, 6.4);
      flow[flowIndex + 1] = randomRange(0.006, 0.025, random);
      flow[flowIndex + 2] = rainData.phase[downpourIndex];
      flow[flowIndex + 3] = randomRange(0.26, 0.56, random);
      breaks[breakIndex] = randomRange(6.5, 13.0, random);
      breaks[breakIndex + 1] = randomRange(0.34, 0.58, random);
      drift[driftIndex] = rainData.windSpeed[downpourIndex];
      drift[driftIndex + 1] = rainData.driftX[downpourIndex];
      drift[driftIndex + 2] = rainData.driftZ[downpourIndex];
      bridgeCount += 1;
    } else {
      for (let attempt = 0; attempt < 14; attempt += 1) {
        hour = peakHourSampler();
        stormWeight = sampleStormWeight(hour);
        if (stormWeight > 0.08 && random() < Math.pow(stormWeight, 0.58)) break;
      }

      const near = random();
      const isMidBreak = isCore && random() < 0.34;
      const bottomY = Math.max(WATER_LEVEL, WATER_LEVEL + (isForeground
        ? randomRange(-0.02, 0.16, random)
        : isWide
          ? randomRange(-0.08, 0.18, random)
          : isMidBreak
            ? randomRange(0.18, 0.72, random)
            : randomRange(-0.12, 0.2, random)));
      const availableHeight = Math.max(0.55, sampleWaterfallTopY(hour) - bottomY);
      const width = isForeground
        ? randomRange(0.018, 0.044, random)
        : isWide
          ? randomRange(0.036, 0.082, random)
          : random() < 0.82
            ? randomRange(0.007, 0.022, random)
            : randomRange(0.022, 0.042, random);
      const speedTier = random();
      const speed = isWide
        ? randomRange(2.6, 4.2, random)
        : speedTier < 0.28
          ? randomRange(3.0, 4.0, random)
          : speedTier < 0.68
            ? randomRange(4.0, 5.4, random)
            : randomRange(5.4, 7.0, random);

      anchor[positionIndex] = hourToX(hour) + randomRange(-0.08, 0.08, random);
      anchor[positionIndex + 1] = bottomY;
      anchor[positionIndex + 2] = isForeground
        ? sampleDepth(randomRange(0.7, 1, random), random)
        : sampleDepth(near, random);
      dimensions[dimensionIndex] = width;
      dimensions[dimensionIndex + 1] = availableHeight * (isCore
        ? isMidBreak
          ? randomRange(0.34, 0.66, random)
          : randomRange(0.72, 1.1, random)
        : isWide
          ? randomRange(0.5, 0.92, random)
          : randomRange(0.68, 1.02, random));
      flow[flowIndex] = speed;
      flow[flowIndex + 1] = randomRange(0.006, isWide ? 0.045 : 0.034, random) * (0.78 + near * 0.36);
      flow[flowIndex + 2] = random() * Math.PI * 2;
      flow[flowIndex + 3] = isForeground
        ? randomRange(0.54, 0.92, random)
        : isCore
          ? randomRange(0.48, 0.9, random) * (0.82 + near * 0.26)
          : isWide
            ? randomRange(0.34, 0.64, random)
            : randomRange(0.3, 0.56, random);
      breaks[breakIndex] = isCore
        ? randomRange(4.0, 9.4, random)
        : isWide
          ? randomRange(2.6, 6.8, random)
          : randomRange(4.8, 10.0, random);
      breaks[breakIndex + 1] = isCore
        ? randomRange(0.22, 0.46, random)
        : isWide
          ? randomRange(0.18, 0.42, random)
          : randomRange(0.28, 0.52, random);
      drift[driftIndex] = randomRange(0.12, 0.42, random);
      drift[driftIndex + 1] = randomRange(0.0015, isWide ? 0.007 : 0.0055, random);
      drift[driftIndex + 2] = randomRange(0.0015, isWide ? 0.006 : 0.0045, random);
      if (isForeground) foregroundCount += 1;
      else if (isCore) coreCount += 1;
      else if (isWide) wideCount += 1;
    }

    storm[i] = stormWeight;
  }

  geometry.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(anchor, 3));
  geometry.setAttribute('aDimensions', new THREE.InstancedBufferAttribute(dimensions, 2));
  geometry.setAttribute('aFlow', new THREE.InstancedBufferAttribute(flow, 4));
  geometry.setAttribute('aBreaks', new THREE.InstancedBufferAttribute(breaks, 2));
  geometry.setAttribute('aStorm', new THREE.InstancedBufferAttribute(storm, 1));
  geometry.setAttribute('aDrift', new THREE.InstancedBufferAttribute(drift, 3));
  geometry.setAttribute('aFilamentClass', new THREE.InstancedBufferAttribute(filamentClass, 1));
  geometry.instanceCount = count;
  const highlightGeometry = geometry.clone();
  highlightGeometry.instanceCount = highlightCount;
  return {
    geometry,
    highlightGeometry,
    highlightCount,
    bridgeCount,
    coreCount,
    lowerCount: wideCount,
    wideCount,
    foregroundCount,
    ribbonSegments
  };
}

function createPeakWaterfallFilamentMaterial(highlight) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: prefersReducedMotion ? 0 : 1 },
      uDeep: { value: new THREE.Color(TUNING.metalRain.darkColor) },
      uMid: { value: new THREE.Color(TUNING.metalRain.midColor) },
      uBright: { value: new THREE.Color(TUNING.metalRain.brightColor) },
      uFilamentBandDensity: { value: TUNING.metalRain.filamentBandDensity },
      uFilamentBandSpeed: { value: TUNING.metalRain.filamentBandSpeed },
      uFilamentMirrorStrength: {
        value: highlight
          ? TUNING.metalRain.highlightMirrorStrength
          : TUNING.metalRain.filamentMirrorStrength
      },
      uEdgeWidth: {
        value: highlight
          ? TUNING.waterfallFilaments.highlightEdgeWidth
          : TUNING.waterfallFilaments.edgeWidth
      },
      uOpacity: {
        value: highlight
          ? TUNING.waterfallFilaments.highlightOpacity
          : TUNING.waterfallFilaments.opacity
      },
      uBottomMistOpacity: { value: TUNING.waterfallFilaments.bottomMistOpacity },
      uViewport: { value: rainViewport },
      uPlotBounds: { value: rainPlotBounds },
      uPlotFeather: { value: rainPlotFeather },
      uPlotClip: rainPlotClip
    },
    vertexShader: `
      uniform float uTime;
      uniform float uMotion;
      attribute vec3 aAnchor;
      attribute vec2 aDimensions;
      attribute vec4 aFlow;
      attribute vec2 aBreaks;
      attribute float aStorm;
      attribute vec3 aDrift;
      attribute float aFilamentClass;
      varying vec2 vUv;
      varying vec4 vFlow;
      varying vec2 vBreaks;
      varying float vStorm;
      varying float vFogDepth;
      varying float vFilamentClass;
      varying float vTurbulence;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 57.0;
        return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
      }
      float fbm(vec2 p) {
        float value = noise(p) * 0.55;
        p = p * 2.03 + vec2(7.1, 11.3);
        value += noise(p) * 0.29;
        p = p * 2.11 + vec2(13.9, 5.7);
        value += noise(p) * 0.16;
        return value;
      }

      void main() {
        float time = uTime * uMotion;
        float localY = position.y;
        float bridgeClass = 1.0 - smoothstep(0.05, 0.95, abs(aFilamentClass - 0.0));
        float coreClass = 1.0 - smoothstep(0.05, 0.95, abs(aFilamentClass - 1.0));
        float wideClass = 1.0 - smoothstep(0.05, 0.95, abs(aFilamentClass - 2.0));
        float foregroundClass = 1.0 - smoothstep(0.05, 0.95, abs(aFilamentClass - 3.0));
        vec3 center = aAnchor;
        center.x += sin(time * aDrift.x + aFlow.z) * aDrift.y;
        center.z += cos(time * aDrift.x * 0.72 + aFlow.z * 0.7) * aDrift.z;
        center.y += localY * aDimensions.y;
        float fallTime = time * (0.22 + aFlow.x * 0.075);
        float localWarp = fbm(vec2(localY * 3.2 + aFlow.z * 0.43, fallTime * 0.55 + aAnchor.x * 0.18));
        float curl = fbm(vec2(
          localY * (6.0 + wideClass * 1.2) + localWarp * 1.1,
          aFlow.z * 0.77 - fallTime * 0.9
        )) * 2.0 - 1.0;
        float branch = sin(localY * (12.0 + wideClass * 2.0) + aFlow.z + fallTime * 1.45) * 0.45;
        branch += sin(localY * 31.0 - aFlow.z * 1.9 - fallTime * 2.15) * 0.16;
        branch += curl * (0.18 + foregroundClass * 0.08);
        float bendEnvelope = smoothstep(0.02, 0.22, localY)
          * (0.16 + localY * 0.48)
          * (1.0 - bridgeClass * 0.18);
        center.x += branch * aFlow.y * bendEnvelope * (0.42 + wideClass * 0.18 + foregroundClass * 0.12);
        center.z += curl * aFlow.y * (0.045 + wideClass * 0.04) * smoothstep(0.08, 0.74, localY);
        vec4 mvPosition = modelViewMatrix * vec4(center, 1.0);
        float pinch = fbm(vec2(localY * 9.0 + aFlow.z, fallTime * 0.92));
        float widthPulse = 0.7
          + pinch * 0.28
          + sin(localY * 18.0 + aFlow.z * 1.7) * 0.07;
        widthPulse *= mix(0.94, 1.18, wideClass);
        widthPulse *= mix(1.0, 1.08, foregroundClass);
        mvPosition.x += position.x * aDimensions.x * widthPulse;
        vUv = uv;
        vFlow = aFlow;
        vBreaks = aBreaks;
        vStorm = aStorm;
        vFogDepth = -mvPosition.z;
        vFilamentClass = aFilamentClass;
        vTurbulence = clamp(localWarp * 0.5 + abs(curl) * 0.26 + pinch * 0.24, 0.0, 1.08);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uBright;
      uniform float uFilamentBandDensity;
      uniform float uFilamentBandSpeed;
      uniform float uFilamentMirrorStrength;
      uniform float uEdgeWidth;
      uniform float uOpacity;
      uniform float uBottomMistOpacity;
      uniform vec2 uViewport;
      uniform vec4 uPlotBounds;
      uniform vec3 uPlotFeather;
      uniform float uPlotClip;
      varying vec2 vUv;
      varying vec4 vFlow;
      varying vec2 vBreaks;
      varying float vStorm;
      varying float vFogDepth;
      varying float vFilamentClass;
      varying float vTurbulence;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n = i.x + i.y * 57.0;
        return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
      }

      void main() {
        float time = uTime * uMotion;
        float centerDistance = abs(vUv.x - 0.5) * 2.0;
        float bridgeClass = 1.0 - smoothstep(0.05, 0.95, abs(vFilamentClass - 0.0));
        float coreClass = 1.0 - smoothstep(0.05, 0.95, abs(vFilamentClass - 1.0));
        float wideClass = 1.0 - smoothstep(0.05, 0.95, abs(vFilamentClass - 2.0));
        float foregroundClass = 1.0 - smoothstep(0.05, 0.95, abs(vFilamentClass - 3.0));
        float raggedEdge = noise(vec2(vFlow.z * 4.1 + vUv.y * 8.2, time * 0.22 + vUv.x * 2.3));
        // 🎛️ 瀑布雨丝宽度对应 TUNING.waterfallFilaments。
        float edgeWidth = uEdgeWidth
          + wideClass * 0.1
          + foregroundClass * 0.05;
        float core = 1.0 - smoothstep(${highlight ? '0.04' : '0.08'}, edgeWidth, centerDistance + (raggedEdge - 0.5) * 0.18);
        float endVariation = noise(vec2(vFlow.z, vBreaks.x));
        float bottomFade = smoothstep(0.0, 0.04 + endVariation * 0.075, vUv.y);
        float topFade = 1.0 - smoothstep(0.8 + endVariation * 0.12, 1.0, vUv.y);
        float advectedY = vUv.y * vBreaks.x + time * vFlow.x;
        ${highlight ? `
        float fastPulse = 0.5 + 0.5 * sin(advectedY * 2.95 + vFlow.z * 6.1);
        float secondaryPulse = 0.5 + 0.5 * sin(advectedY * 1.22 - vFlow.z * 3.7);
        float streamNoise = fastPulse * 0.68 + noise(vec2(vFlow.z * 9.0 + vUv.x * 2.0, advectedY * 0.5)) * 0.32;
        float continuity = smoothstep(0.44, 0.82, fastPulse + secondaryPulse * 0.16 + vTurbulence * 0.1);
        ` : `
        float domainWarp = noise(vec2(vFlow.z * 2.3, advectedY * 0.26));
        float streamNoise = noise(vec2(vFlow.z * 7.1 + domainWarp * 1.2 + vUv.x * 1.2, advectedY));
        float fineBreak = 0.5 + 0.5 * sin(advectedY * 2.65 + vFlow.z * 5.7 + domainWarp * 2.2);
        float secondaryBreak = noise(vec2(vFlow.z * 13.0 - vUv.x * 1.4, advectedY * 0.62 + domainWarp));
        float continuity = smoothstep(
          vBreaks.y - 0.18,
          vBreaks.y + 0.18,
          streamNoise * 0.52 + fineBreak * 0.3 + secondaryBreak * 0.18 + vTurbulence * 0.08
        );
        `}
        continuity = mix(continuity, 0.58 + continuity * 0.42, coreClass);
        continuity = mix(continuity, 0.38 + continuity * 0.62, wideClass);
        float verticalInk = smoothstep(
          0.46,
          0.92,
          noise(vec2(vFlow.z * 21.0 + vUv.x * 1.2, advectedY * 0.2))
        );
        float darkCut = smoothstep(
          0.5,
          0.9,
          noise(vec2(vFlow.z * 5.8 - vUv.x * 1.1, advectedY * 0.13 + 8.0))
        );
        float columnVoid = smoothstep(
          0.5,
          0.88,
          noise(vec2(vFlow.z * 3.6 + vUv.x * 0.7, floor(vUv.y * 7.0) * 0.37 + time * 0.08))
        );
        float columnFlicker = 0.72 + noise(vec2(vFlow.z * 11.0, vUv.y * 3.0 - time * 0.3)) * 0.48;
        float bottomMist = (1.0 - smoothstep(0.0, 0.22, vUv.y))
          * smoothstep(0.18, 0.72, streamNoise + vTurbulence * 0.2)
          * ${highlight ? '0.0' : '1.0'};
        float filament = core * bottomFade * topFade * continuity;
        float fogFactor = 1.0 - exp(-0.00046 * vFogDepth * vFogDepth);
        vec2 screenUv = vec2(
          gl_FragCoord.x / uViewport.x,
          1.0 - gl_FragCoord.y / uViewport.y
        );
        float horizontalMask = smoothstep(
          uPlotBounds.x,
          uPlotBounds.x + uPlotFeather.x,
          screenUv.x
        ) * (1.0 - smoothstep(
          uPlotBounds.y - uPlotFeather.x,
          uPlotBounds.y,
          screenUv.x
        ));
        horizontalMask = mix(1.0, horizontalMask, uPlotClip);
        float lowerMask = 1.0 - smoothstep(
          uPlotBounds.w - uPlotFeather.z,
          uPlotBounds.w,
          screenUv.y
        );
        lowerMask = mix(1.0, lowerMask, uPlotClip);
        float classOpacity = 0.66
          + bridgeClass * 0.0
          + coreClass * 0.78
          + wideClass * 0.34
          + foregroundClass * 0.22;
        // 🎛️ 瀑布雨丝透明度对应 TUNING.waterfallFilaments。
        float alpha = (filament + bottomMist * uBottomMistOpacity)
          * vFlow.w
          * vStorm
          * classOpacity
          * uOpacity
          * (1.0 - fogFactor * 0.44) * horizontalMask * lowerMask;
        alpha *= columnFlicker;
        alpha *= mix(1.0, 0.6, darkCut * (1.0 - foregroundClass * 0.35));
        alpha *= mix(1.0, 0.56, columnVoid * (1.0 - bottomMist * 0.45) * (1.0 - foregroundClass * 0.35));
        float mercuryWave = 0.5 + 0.5 * sin(
          advectedY * uFilamentBandDensity
          + vFlow.z * 5.8
          + centerDistance * 2.6
          - time * uFilamentBandSpeed
        );
        float mercuryMirror = smoothstep(0.46, 0.88, mercuryWave + streamNoise * 0.18);
        vec3 color = mix(uDeep, uMid, 0.28 + streamNoise * 0.32 + bottomMist * 0.12);
        color = mix(color, uBright, clamp(
          mercuryMirror * uFilamentMirrorStrength
          + ${highlight ? '0.28' : 'core * 0.12 + verticalInk * 0.16'},
          0.0,
          1.0
        ));
        color = mix(color, uDeep, (darkCut * 0.48 + columnVoid * 0.28) * (1.0 - foregroundClass * 0.35));
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: highlight ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}

function updatePeakWaterfall(system, elapsed) {
  for (const material of system.materials) {
    material.uniforms.uTime.value = elapsed;
  }
}

function createWaterGlintSystem(count) {
  const positions = new Float32Array(count * 3);
  const original = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const baseAlpha = new Float32Array(count);
  const sizes = new Float32Array(count);
  const aspects = new Float32Array(count);
  const hour = new Float32Array(count);
  const strength = new Float32Array(count);
  const presence = new Float32Array(count);
  const storm = new Float32Array(count);
  const shimmer = new Float32Array(count);
  const speed = new Float32Array(count);
  const random = createSeededRandom(WATER_LAYOUT_SEED);
  const hourSampler = createHourSampler(0.36, 1.02, random);

  for (let i = 0; i < count; i += 1) {
    const h = hourSampler();
    const s = sampleRainStrength(h);
    const p = sampleRainPresence(h);
    const index = i * 3;
    const spread = 0.34 + s * 0.52;
    const x = hourToX(h) + randomRange(-spread, spread, random);
    const z = random() < 0.62
      ? randomRange(0.35, WORLD.frontZ * 1.72, random)
      : sampleDepth(0.54, random);

    positions[index] = x;
    positions[index + 1] = WATER_LEVEL + randomRange(0.018, 0.06, random);
    positions[index + 2] = z;
    original.set(positions.subarray(index, index + 3), index);
    hour[i] = h;
    strength[i] = s;
    presence[i] = p;
    storm[i] = sampleStormWeight(h);
    shimmer[i] = random() * Math.PI * 2;
    speed[i] = randomRange(0.018, 0.052, random);
    baseAlpha[i] = randomRange(0.08, 0.32, random)
      * (0.32 + Math.pow(s, 0.7) * 1.25)
      * p;
    alphas[i] = baseAlpha[i] * (0.1 + storm[i] * 0.7);
    sizes[i] = randomRange(0.7, 2.6, random) * (0.74 + s * 0.3);
    aspects[i] = random() < 0.42
      ? randomRange(2.4, 5.4, random)
      : randomRange(1.18, 2.3, random);
    writeWaterColor(colors, index, s, randomRange(0.36, 0.86, random), random);
  }

  const points = createSoftPointCloud({
    positions,
    colors,
    alphas,
    sizes,
    aspects,
    horizontal: 1,
    opacity: TUNING.glint.opacity,
    maxSize: TUNING.glint.maxSize,
    renderOrder: 5
  });

  return {
    points,
    data: { positions, original, alphas, baseAlpha, hour, strength, presence, storm, shimmer, speed, count }
  };
}

function updateWaterGlints(system, elapsed, delta) {
  const data = system.data;

  for (let i = 0; i < data.count; i += 1) {
    const index = i * 3;
    const focus = chainFocus(data.hour[i], data.positions[index], data.positions[index + 2]);
    data.positions[index] = data.original[index] + Math.sin(elapsed * 0.34 + data.shimmer[i]) * 0.018;
    data.positions[index + 2] += data.speed[i] * delta;
    if (data.positions[index + 2] > WORLD.frontZ * 1.74) {
      data.positions[index + 2] = randomRange(-WORLD.depth * 0.55, -WORLD.depth * 0.16);
    }
    data.positions[index + 1] = WATER_LEVEL + 0.026
      + Math.sin(elapsed * 1.35 + data.shimmer[i]) * 0.006;
    const flicker = 0.78 + Math.sin(elapsed * 2.1 + data.shimmer[i]) * 0.18;
    data.alphas[i] = clamp(
      data.baseAlpha[i]
        * (0.1 + data.storm[i] * 0.7)
        * flicker
        * (1 + focus * 0.52 + state.burst * localHourFocus(data.hour[i], state.selectedHour) * 0.18),
      0,
      TUNING.glint.alphaMax
    );
  }

  system.points.geometry.attributes.position.needsUpdate = true;
  system.points.geometry.attributes.aAlpha.needsUpdate = true;
}

function createImpactPearlSystem(count, eventRate, rippleRate) {
  const foamCount = Math.floor(count * 0.55);
  const dropletCount = Math.floor(count * 0.35);
  const crownCount = count > 0 ? Math.max(1, count - foamCount - dropletCount) : 0;
  const foam = createImpactPointPool(foamCount, {
    horizontal: 1,
    opacity: TUNING.foam.opacity,
    maxSize: TUNING.foam.maxSize,
    renderOrder: 5,
    blending: THREE.AdditiveBlending
  });
  const droplets = createImpactPointPool(dropletCount, {
    horizontal: 0,
    opacity: TUNING.spray.opacity,
    maxSize: TUNING.spray.maxSize,
    renderOrder: 6,
    blending: THREE.NormalBlending
  });
  const crowns = createImpactCrownPool(crownCount);

  return {
    foam: foam.points,
    droplets: droplets.points,
    crowns: crowns.lines,
    data: {
      count,
      foam,
      droplets,
      crowns,
      eventRate,
      rippleRate,
      emissionCredit: eventRate * 0.2,
      rippleCredit: rippleRate * 0.2,
      random: createSeededRandom(IMPACT_LAYOUT_SEED),
      totalPeakCollisions: 0,
      emittedEvents: 0,
      windowEmitted: 0,
      windowStartedAt: 0,
      currentEmissionRate: 0,
      activeCount: 0,
      activeFoamCount: 0,
      activeDropletCount: 0,
      activeCrownCount: 0,
      staticSeedCount: 0
    }
  };
}

function createImpactPointPool(count, { horizontal, opacity, maxSize, renderOrder, blending }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  const baseAlpha = new Float32Array(count);
  const sizes = new Float32Array(count);
  const baseSizes = new Float32Array(count);
  const aspects = new Float32Array(count);
  const baseAspects = new Float32Array(count);
  const active = new Uint8Array(count);
  const startedAt = new Float32Array(count);
  const lifetime = new Float32Array(count);
  const originX = new Float32Array(count);
  const originZ = new Float32Array(count);
  const velocityX = new Float32Array(count);
  const velocityY = new Float32Array(count);
  const velocityZ = new Float32Array(count);
  const gravity = new Float32Array(count);
  const phase = new Float32Array(count);
  const hour = new Float32Array(count);
  const strength = new Float32Array(count);
  const near = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3 + 1] = -100;
  }

  const points = createSoftPointCloud({
    positions,
    colors,
    alphas,
    sizes,
    aspects,
    horizontal,
    opacity,
    maxSize,
    renderOrder,
    dynamicColor: true,
    dynamicShape: true,
    blending
  });

  return {
    points,
    count,
    cursor: 0,
    positions,
    colors,
    alphas,
    baseAlpha,
    sizes,
    baseSizes,
    aspects,
    baseAspects,
    active,
    startedAt,
    lifetime,
    originX,
    originZ,
    velocityX,
    velocityY,
    velocityZ,
    gravity,
    phase,
    hour,
    strength,
    near
  };
}

function createImpactCrownPool(count) {
  const positions = new Float32Array(count * 6);
  const colors = new Float32Array(count * 6);
  const alphas = new Float32Array(count * 2);
  const baseAlpha = new Float32Array(count);
  const active = new Uint8Array(count);
  const kind = new Uint8Array(count);
  const startedAt = new Float32Array(count);
  const lifetime = new Float32Array(count);
  const originX = new Float32Array(count);
  const originZ = new Float32Array(count);
  const angle = new Float32Array(count);
  const radius = new Float32Array(count);
  const height = new Float32Array(count);
  const phase = new Float32Array(count);
  const hour = new Float32Array(count);
  const strength = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 6 + 1] = -100;
    positions[i * 6 + 4] = -100;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uFogDensity: { value: scene.fog.density }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vFogDepth;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vColor = aColor;
        vAlpha = aAlpha;
        vFogDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uFogDensity;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vFogDepth;

      void main() {
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        gl_FragColor = vec4(vColor, vAlpha * (1.0 - fogFactor * 0.3));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 8;

  return {
    lines,
    count,
    cursor: 0,
    positions,
    colors,
    alphas,
    baseAlpha,
    active,
    kind,
    startedAt,
    lifetime,
    originX,
    originZ,
    angle,
    radius,
    height,
    phase,
    hour,
    strength
  };
}

function beginImpactFrame(system, elapsed, delta) {
  const data = system.data;
  data.emissionCredit = Math.min(
    data.eventRate * 0.34,
    data.emissionCredit + data.eventRate * delta
  );
  data.rippleCredit = Math.min(
    data.rippleRate * 0.55,
    data.rippleCredit + data.rippleRate * delta
  );

  const windowDuration = elapsed - data.windowStartedAt;
  if (windowDuration >= 0.5) {
    data.currentEmissionRate = data.windowEmitted / Math.max(0.001, windowDuration);
    data.windowEmitted = 0;
    data.windowStartedAt = elapsed;
  }
}

function queueRainImpact(system, x, z, impactHour, impactStrength, impactNear, role, elapsed) {
  const data = system.data;
  const stormWeight = sampleStormWeight(impactHour);
  const rainActivity = clamp(impactStrength, 0, 1);
  if (rainActivity <= 0) return 0;
  if (!SPLASH_IMPACTS_ENABLED) return stormWeight;

  if (stormWeight > 0.001) data.totalPeakCollisions += 1;
  const roleChance = role === RAIN_ROLE.DOWNPOUR
    ? 1
    : role === RAIN_ROLE.BASE ? 0.34 : 0.16;
  const drizzleChance = Math.pow(rainActivity, 1.35)
    * roleChance
    * (0.08 + impactNear * 0.12);
  const stormChance = stormWeight
    * roleChance
    * (0.38 + impactNear * 0.62)
    * (0.82 + impactStrength * 0.34);
  const chance = clamp(
    drizzleChance + stormChance,
    0,
    1
  );

  if (data.emissionCredit < 1 || data.random() > chance) return stormWeight;

  data.emissionCredit -= 1;
  data.emittedEvents += 1;
  data.windowEmitted += 1;
  emitStormImpact(
    system,
    x,
    z,
    impactHour,
    impactStrength,
    impactNear,
    stormWeight,
    elapsed
  );
  return stormWeight;
}

function tryEmitImpactRipple(system, ripples, x, z, strength, stormWeight, role, elapsed) {
  const data = system.data;
  if (data.rippleCredit < 1) return;

  const roleChance = role === RAIN_ROLE.DOWNPOUR ? 1 : role === RAIN_ROLE.BASE ? 0.48 : 0.28;
  const chance = (0.012 + stormWeight * 0.14) * roleChance;
  if (data.random() > chance) return;

  data.rippleCredit -= 1;
  addRipple(
    ripples,
    x,
    z,
    0.13 + strength * 0.25 + stormWeight * 0.24,
    false,
    elapsed
  );
}

function emitStormImpact(system, x, z, impactHour, impactStrength, impactNear, stormWeight, elapsed, staticProgress = -1) {
  const data = system.data;
  const random = data.random;
  const foamSpawns = clamp(
    Math.round(8 + stormWeight * 7 + impactNear * 3 + random() * 3),
    7,
    21
  );
  const dropletSpawns = clamp(
    Math.round(3 + stormWeight * 4 + impactNear * 2 + random() * 2),
    3,
    10
  );
  const crownSpawns = clamp(Math.round(3 + stormWeight * 3 + random() * 3), 3, 9);

  for (let i = 0; i < foamSpawns; i += 1) {
    spawnFoamParticle(
      data.foam,
      data.random,
      x,
      z,
      impactHour,
      impactStrength,
      impactNear,
      stormWeight,
      elapsed,
      staticProgress
    );
  }
  for (let i = 0; i < dropletSpawns; i += 1) {
    spawnDropletParticle(
      data.droplets,
      data.random,
      x,
      z,
      impactHour,
      impactStrength,
      impactNear,
      stormWeight,
      elapsed,
      staticProgress
    );
  }
  for (let i = 0; i < crownSpawns; i += 1) {
    spawnCrownLine(
      data.crowns,
      data.random,
      x,
      z,
      impactHour,
      impactStrength,
      impactNear,
      stormWeight,
      elapsed,
      staticProgress
    );
  }
}

function spawnFoamParticle(pool, random, x, z, impactHour, impactStrength, impactNear, stormWeight, elapsed, staticProgress) {
  const i = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.count;
  const index = i * 3;
  const angle = random() * Math.PI * 2;
  const depthGain = 0.7 + impactNear * 0.56;
  const scatter = randomRange(0.04, 0.34, random);
  const radialSpeed = randomRange(0.28, 1.16, random) * (0.82 + stormWeight * 0.54);

  pool.active[i] = 1;
  pool.originX[i] = x + Math.cos(angle) * scatter;
  pool.originZ[i] = z + Math.sin(angle) * scatter * 0.64;
  pool.velocityX[i] = Math.cos(angle) * radialSpeed;
  pool.velocityZ[i] = Math.sin(angle) * radialSpeed * 0.6;
  pool.velocityY[i] = randomRange(0.12, 0.42, random);
  pool.gravity[i] = random() < 0.68
    ? randomRange(0.18, 0.36, random)
    : randomRange(0.7, 1.05, random);
  pool.phase[i] = random() * Math.PI * 2;
  pool.hour[i] = impactHour;
  pool.strength[i] = impactStrength;
  pool.near[i] = impactNear;
  pool.lifetime[i] = randomRange(1.25, 2.1, random) * (0.9 + stormWeight * 0.22);
  pool.baseAlpha[i] = randomRange(0.22, 0.52, random) * (0.82 + stormWeight * 0.4) * depthGain;
  pool.baseSizes[i] = randomRange(1.55, 4.8, random) * depthGain;
  pool.baseAspects[i] = randomRange(1.8, 5.6, random);
  writeWaterColor(
    pool.colors,
    index,
    impactStrength,
    randomRange(0.82, 1.32, random) * depthGain,
    random
  );

  const ageOffset = staticProgress >= 0
    ? pool.lifetime[i] * clamp(staticProgress + randomRange(-0.08, 0.08, random), 0.03, 0.9)
    : 0;
  pool.startedAt[i] = elapsed - ageOffset;
  pool.positions[index] = pool.originX[i];
  pool.positions[index + 1] = WATER_LEVEL + 0.04;
  pool.positions[index + 2] = pool.originZ[i];
  pool.sizes[i] = pool.baseSizes[i];
  pool.aspects[i] = pool.baseAspects[i];
  pool.alphas[i] = 0;
}

function spawnDropletParticle(pool, random, x, z, impactHour, impactStrength, impactNear, stormWeight, elapsed, staticProgress) {
  const i = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.count;
  const index = i * 3;
  const angle = random() * Math.PI * 2;
  const depthGain = 0.7 + impactNear * 0.58;
  const scatter = randomRange(0.015, 0.15, random);
  const radialSpeed = randomRange(0.38, 1.58, random) * (0.84 + stormWeight * 0.48);
  const launch = randomRange(1.6, 3.05, random)
    + stormWeight * randomRange(0.74, 1.5, random)
    + impactNear * randomRange(0.2, 0.72, random);

  pool.active[i] = 1;
  pool.originX[i] = x + Math.cos(angle) * scatter;
  pool.originZ[i] = z + Math.sin(angle) * scatter * 0.58;
  pool.velocityX[i] = Math.cos(angle) * radialSpeed;
  pool.velocityZ[i] = Math.sin(angle) * radialSpeed * 0.58;
  pool.velocityY[i] = launch;
  pool.gravity[i] = randomRange(5.8, 7.4, random);
  pool.phase[i] = random() * Math.PI * 2;
  pool.hour[i] = impactHour;
  pool.strength[i] = impactStrength;
  pool.near[i] = impactNear;
  pool.lifetime[i] = clamp(
    launch * 2 / pool.gravity[i] * randomRange(0.88, 1.1, random),
    0.42,
    1.25
  );
  pool.baseAlpha[i] = randomRange(0.58, 0.98, random) * (0.82 + stormWeight * 0.4) * depthGain;
  pool.baseSizes[i] = randomRange(1.05, 3.15, random) * depthGain;
  pool.baseAspects[i] = randomRange(1.6, 4.2, random);
  writeWaterColor(
    pool.colors,
    index,
    impactStrength,
    randomRange(0.9, 1.42, random) * depthGain,
    random
  );

  const ageOffset = staticProgress >= 0
    ? pool.lifetime[i] * clamp(staticProgress + randomRange(-0.08, 0.08, random), 0.04, 0.78)
    : 0;
  pool.startedAt[i] = elapsed - ageOffset;
  pool.positions[index] = pool.originX[i];
  pool.positions[index + 1] = WATER_LEVEL + 0.04;
  pool.positions[index + 2] = pool.originZ[i];
  pool.sizes[i] = pool.baseSizes[i];
  pool.aspects[i] = pool.baseAspects[i];
  pool.alphas[i] = 0;
}

function spawnCrownLine(pool, random, x, z, impactHour, impactStrength, impactNear, stormWeight, elapsed, staticProgress) {
  const i = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.count;
  const index = i * 6;
  const alphaIndex = i * 2;
  const needle = random() < 0.42;
  const depthGain = 0.72 + impactNear * 0.55;
  const gain = randomRange(0.72, 1.16, random) * (0.82 + impactStrength * 0.28) * depthGain;

  pool.active[i] = 1;
  pool.kind[i] = needle ? CROWN_KIND.NEEDLE : CROWN_KIND.RADIAL;
  pool.originX[i] = x + randomRange(-0.09, 0.09, random);
  pool.originZ[i] = z + randomRange(-0.07, 0.07, random);
  pool.angle[i] = random() * Math.PI * 2;
  pool.phase[i] = random() * Math.PI * 2;
  pool.hour[i] = impactHour;
  pool.strength[i] = impactStrength;
  pool.lifetime[i] = needle
    ? randomRange(0.4, 0.74, random)
    : randomRange(0.3, 0.58, random);
  pool.radius[i] = needle
    ? randomRange(0.04, 0.18, random)
    : randomRange(0.26, 0.82, random) * (0.8 + stormWeight * 0.36);
  pool.height[i] = needle
    ? randomRange(0.72, 1.62, random) * (0.78 + stormWeight * 0.38 + impactNear * 0.16)
    : randomRange(0.24, 0.68, random) * (0.82 + stormWeight * 0.34);
  pool.baseAlpha[i] = randomRange(0.58, 0.96, random) * (0.86 + stormWeight * 0.46) * depthGain;
  pool.colors[index] = PALETTE.pearlBright.r * gain;
  pool.colors[index + 1] = PALETTE.pearlBright.g * gain;
  pool.colors[index + 2] = PALETTE.pearlBright.b * gain;
  pool.colors[index + 3] = pool.colors[index] * 1.12;
  pool.colors[index + 4] = pool.colors[index + 1] * 1.12;
  pool.colors[index + 5] = pool.colors[index + 2] * 1.12;
  pool.alphas[alphaIndex] = 0;
  pool.alphas[alphaIndex + 1] = 0;

  const ageOffset = staticProgress >= 0
    ? pool.lifetime[i] * clamp(staticProgress * 0.72, 0.04, 0.62)
    : 0;
  pool.startedAt[i] = elapsed - ageOffset;
  pool.positions[index] = pool.originX[i];
  pool.positions[index + 1] = WATER_LEVEL + 0.04;
  pool.positions[index + 2] = pool.originZ[i];
  pool.positions[index + 3] = pool.originX[i];
  pool.positions[index + 4] = WATER_LEVEL + 0.04;
  pool.positions[index + 5] = pool.originZ[i];
}

function seedReducedMotionImpacts(system) {
  const data = system.data;
  const random = data.random;
  const hourSampler = createIntegratedDownpourHourSampler(random);
  const eventCount = Math.round(data.count / 24);

  for (let i = 0; i < eventCount; i += 1) {
    const impactHour = hourSampler();
    const impactStrength = sampleRainStrength(impactHour);
    const stormWeight = sampleStormWeight(impactHour);
    if (stormWeight <= 0.02) continue;
    const impactNear = sampleNearness(random);
    emitStormImpact(
      system,
      hourToX(impactHour) + randomRange(-0.24, 0.24, random),
      sampleDepth(impactNear, random),
      impactHour,
      impactStrength,
      impactNear,
      stormWeight,
      0,
      randomRange(0.18, 0.68, random)
    );
    data.staticSeedCount += 1;
  }
}

function updateImpactPearls(system, elapsed) {
  const data = system.data;
  const activeFoamCount = updateFoamPool(data.foam, elapsed);
  const activeDropletCount = updateDropletPool(data.droplets, elapsed);
  const activeCrownCount = updateCrownPool(data.crowns, elapsed);
  const activeCount = activeFoamCount + activeDropletCount + activeCrownCount;

  data.activeCount = activeCount;
  data.activeFoamCount = activeFoamCount;
  data.activeDropletCount = activeDropletCount;
  data.activeCrownCount = activeCrownCount;
  root.dataset.activeStormParticles = String(activeCount);
  root.dataset.activeFoamParticles = String(activeFoamCount);
  root.dataset.activeSprayDroplets = String(activeDropletCount);
  root.dataset.activeCrownLines = String(activeCrownCount);
  root.dataset.peakImpactCount = String(data.totalPeakCollisions);
  root.dataset.stormEmissionRate = data.currentEmissionRate.toFixed(1);
}

function updateFoamPool(pool, elapsed) {
  let activeCount = 0;

  for (let i = 0; i < pool.count; i += 1) {
    if (!pool.active[i]) continue;
    const index = i * 3;
    const age = elapsed - pool.startedAt[i];
    const progress = age / Math.max(0.001, pool.lifetime[i]);

    if (progress < 0 || progress >= 1) {
      pool.active[i] = 0;
      pool.alphas[i] = 0;
      pool.positions[index + 1] = -100;
      continue;
    }

    const focus = 1
      + chainFocus(pool.hour[i], pool.originX[i], pool.originZ[i]) * 0.2
      + state.burst * localHourFocus(pool.hour[i], state.selectedHour) * 0.14;
    const lift = Math.sin(progress * Math.PI)
      * (0.12 + pool.strength[i] * 0.24 + pool.near[i] * 0.1)
      * pool.gravity[i];
    const fade = smoothstep(0, 0.06, progress) * (1 - smoothstep(0.58, 1, progress));
    pool.positions[index] = pool.originX[i] + pool.velocityX[i] * age * (0.62 + progress * 0.52);
    pool.positions[index + 1] = WATER_LEVEL + 0.04 + lift
      + Math.sin(pool.phase[i] + progress * 8) * 0.01;
    pool.positions[index + 2] = pool.originZ[i] + pool.velocityZ[i] * age * (0.62 + progress * 0.46);
    pool.sizes[i] = pool.baseSizes[i] * (0.74 + progress * 1.02);
    pool.aspects[i] = pool.baseAspects[i] * (0.92 + progress * 0.42);
    pool.alphas[i] = clamp(pool.baseAlpha[i] * fade * focus, 0, 0.72);
    activeCount += 1;
  }

  for (const attribute of ['position', 'aAlpha', 'aSize', 'aAspect', 'aColor']) {
    pool.points.geometry.attributes[attribute].needsUpdate = true;
  }
  return activeCount;
}

function updateDropletPool(pool, elapsed) {
  let activeCount = 0;

  for (let i = 0; i < pool.count; i += 1) {
    if (!pool.active[i]) continue;
    const index = i * 3;
    const age = elapsed - pool.startedAt[i];
    const progress = age / Math.max(0.001, pool.lifetime[i]);

    if (progress < 0 || progress >= 1) {
      pool.active[i] = 0;
      pool.alphas[i] = 0;
      pool.positions[index + 1] = -100;
      continue;
    }

    const y = WATER_LEVEL + 0.04
      + pool.velocityY[i] * age
      - pool.gravity[i] * age * age * 0.5;
    if (y < WATER_LEVEL + 0.014 && progress > 0.16) {
      pool.active[i] = 0;
      pool.alphas[i] = 0;
      pool.positions[index + 1] = -100;
      continue;
    }

    const focus = 1
      + chainFocus(pool.hour[i], pool.originX[i], pool.originZ[i]) * 0.22
      + state.burst * localHourFocus(pool.hour[i], state.selectedHour) * 0.16;
    const fade = smoothstep(0, 0.045, progress) * (1 - smoothstep(0.72, 1, progress));
    pool.positions[index] = pool.originX[i] + pool.velocityX[i] * age;
    pool.positions[index + 1] = y;
    pool.positions[index + 2] = pool.originZ[i] + pool.velocityZ[i] * age;
    pool.sizes[i] = pool.baseSizes[i] * (1 - progress * 0.2);
    pool.aspects[i] = pool.baseAspects[i] * (1 + Math.sin(progress * Math.PI) * 0.18);
    pool.alphas[i] = clamp(pool.baseAlpha[i] * fade * focus, 0, 0.96);
    activeCount += 1;
  }

  for (const attribute of ['position', 'aAlpha', 'aSize', 'aAspect', 'aColor']) {
    pool.points.geometry.attributes[attribute].needsUpdate = true;
  }
  return activeCount;
}

function updateCrownPool(pool, elapsed) {
  let activeCount = 0;

  for (let i = 0; i < pool.count; i += 1) {
    if (!pool.active[i]) continue;
    const index = i * 6;
    const alphaIndex = i * 2;
    const age = elapsed - pool.startedAt[i];
    const progress = age / Math.max(0.001, pool.lifetime[i]);

    if (progress < 0 || progress >= 1) {
      pool.active[i] = 0;
      pool.alphas[alphaIndex] = 0;
      pool.alphas[alphaIndex + 1] = 0;
      pool.positions[index + 1] = -100;
      pool.positions[index + 4] = -100;
      continue;
    }

    const pulse = Math.sin(progress * Math.PI);
    const grow = smoothstep(0, 1, progress);
    const cos = Math.cos(pool.angle[i]);
    const sin = Math.sin(pool.angle[i]);
    const radial = pool.radius[i] * grow;
    const startRadial = radial * (pool.kind[i] === CROWN_KIND.NEEDLE ? 0 : 0.12);
    const endHeight = pool.height[i] * pulse;
    const sway = pool.kind[i] === CROWN_KIND.NEEDLE
      ? Math.sin(pool.phase[i] + progress * 5) * 0.035
      : 0;
    pool.positions[index] = pool.originX[i] + cos * startRadial;
    pool.positions[index + 1] = WATER_LEVEL + 0.008;
    pool.positions[index + 2] = pool.originZ[i] + sin * startRadial * 0.58;
    pool.positions[index + 3] = pool.originX[i] + cos * radial + sway;
    pool.positions[index + 4] = WATER_LEVEL + 0.008 + endHeight;
    pool.positions[index + 5] = pool.originZ[i] + sin * radial * 0.58;

    const focus = 1
      + chainFocus(pool.hour[i], pool.originX[i], pool.originZ[i]) * 0.18
      + state.burst * localHourFocus(pool.hour[i], state.selectedHour) * 0.12;
    const fade = smoothstep(0, 0.035, progress) * Math.pow(1 - progress, 1.35);
    pool.alphas[alphaIndex] = clamp(pool.baseAlpha[i] * fade * focus * 0.52, 0, 0.72);
    pool.alphas[alphaIndex + 1] = clamp(pool.baseAlpha[i] * fade * focus, 0, 0.94);
    activeCount += 1;
  }

  pool.lines.geometry.attributes.position.needsUpdate = true;
  pool.lines.geometry.attributes.aAlpha.needsUpdate = true;
  pool.lines.geometry.attributes.aColor.needsUpdate = true;
  return activeCount;
}

function createSoftPointCloud({
  positions,
  colors,
  alphas,
  sizes,
  aspects,
  orientations = null,
  horizontal,
  opacity,
  maxSize,
  renderOrder,
  dynamicColor = false,
  dynamicShape = false,
  blending = THREE.NormalBlending
}) {
  const pointCount = positions.length / 3;
  const pointOrientations = orientations ?? new Float32Array(pointCount).fill(horizontal);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColor', dynamicColor
    ? new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage)
    : new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', dynamicShape
    ? new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage)
    : new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAspect', dynamicShape
    ? new THREE.BufferAttribute(aspects, 1).setUsage(THREE.DynamicDrawUsage)
    : new THREE.BufferAttribute(aspects, 1));
  geometry.setAttribute('aHorizontal', dynamicShape
    ? new THREE.BufferAttribute(pointOrientations, 1).setUsage(THREE.DynamicDrawUsage)
    : new THREE.BufferAttribute(pointOrientations, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uFogDensity: { value: scene.fog.density },
      uOpacity: { value: opacity },
      uMaxSize: { value: maxSize }
    },
    vertexShader: `
      uniform float uPixelRatio;
      uniform float uMaxSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aSize;
      attribute float aAspect;
      attribute float aHorizontal;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAspect;
      varying float vHorizontal;
      varying float vFogDepth;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float depthScale = clamp(19.0 / max(5.4, -mvPosition.z), 0.76, 1.98);
        vColor = aColor;
        vAlpha = aAlpha;
        vAspect = aAspect;
        vHorizontal = aHorizontal;
        vFogDepth = -mvPosition.z;
        gl_PointSize = clamp(aSize * uPixelRatio * depthScale, 0.72 * uPixelRatio, uMaxSize * uPixelRatio);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uFogDensity;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAspect;
      varying float vHorizontal;
      varying float vFogDepth;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        vec2 verticalShape = vec2(point.x * vAspect, point.y);
        vec2 horizontalShape = vec2(point.x / max(1.0, vAspect), point.y);
        vec2 shape = mix(verticalShape, horizontalShape, vHorizontal);
        float distanceToEdge = length(shape);
        float edge = 1.0 - smoothstep(0.38, 0.5, distanceToEdge);
        if (edge < 0.01) discard;

        float core = exp(-dot(shape, shape) * 6.8);
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        vec3 color = vColor * (0.82 + core * 0.48);
        color = mix(color, vec3(0.0, 0.0, 0.0), fogFactor * 0.62);
        gl_FragColor = vec4(color, min(0.74, edge * vAlpha * uOpacity * (1.0 - fogFactor * 0.44)));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending
  });

  const points = new THREE.Points(geometry, material);
  points.renderOrder = renderOrder;
  return points;
}

function createRippleFieldSystem(renderer) {
  const { resX, resZ, xMin, xMax, zMin, zMax } = RIPPLE_FIELD;
  const maxDrops = 160;
  const rtOptions = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping
  };
  let rtA = new THREE.WebGLRenderTarget(resX, resZ, rtOptions);
  let rtB = new THREE.WebGLRenderTarget(resX, resZ, rtOptions);

  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Zero both targets so the field starts flat.
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rtA);
  renderer.clear();
  renderer.setRenderTarget(rtB);
  renderer.clear();
  renderer.setRenderTarget(prevTarget);

  // Simulation pass: R = height, G = velocity. Each step relaxes height toward the
  // 4-neighbour average (discrete Laplacian) with light damping, and feathers the
  // border so waves dissipate at the edges instead of reflecting back in.
  const simMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uField: { value: null },
      uTexel: { value: new THREE.Vector2(1 / resX, 1 / resZ) },
      uDamping: { value: TUNING.ripple.damping }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uField;
      uniform vec2 uTexel;
      uniform float uDamping;
      varying vec2 vUv;
      void main() {
        vec4 info = texture2D(uField, vUv);
        float l = texture2D(uField, vec2(vUv.x - uTexel.x, vUv.y)).r;
        float r = texture2D(uField, vec2(vUv.x + uTexel.x, vUv.y)).r;
        float t = texture2D(uField, vec2(vUv.x, vUv.y + uTexel.y)).r;
        float b = texture2D(uField, vec2(vUv.x, vUv.y - uTexel.y)).r;
        float average = (l + r + t + b) * 0.25;
        info.g += (average - info.r) * 2.0;
        info.g *= uDamping;
        info.r += info.g;
        float edge = smoothstep(0.0, 0.05, vUv.x)
          * smoothstep(0.0, 0.05, vUv.y)
          * smoothstep(0.0, 0.05, 1.0 - vUv.x)
          * smoothstep(0.0, 0.05, 1.0 - vUv.y);
        info.rg *= edge;
        gl_FragColor = info;
      }
    `,
    depthTest: false,
    depthWrite: false
  });
  const simScene = new THREE.Scene();
  simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial));

  // Drop pass: each raindrop impact stamps a small cosine dimple (negative height)
  // additively into the current field. All of a frame's impacts are drawn at once
  // as a point cloud.
  const dropPositions = new Float32Array(maxDrops * 3);
  const dropAmps = new Float32Array(maxDrops);
  const dropGeometry = new THREE.BufferGeometry();
  dropGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3).setUsage(THREE.DynamicDrawUsage));
  dropGeometry.setAttribute('aAmp', new THREE.BufferAttribute(dropAmps, 1).setUsage(THREE.DynamicDrawUsage));
  dropGeometry.setDrawRange(0, 0);
  const dropMaterial = new THREE.ShaderMaterial({
    uniforms: {
      // About one sixth of the old world-space footprint after the denser field.
      uDropPx: { value: Math.max(5, resX / 210) }
    },
    vertexShader: `
      attribute float aAmp;
      uniform float uDropPx;
      varying float vAmp;
      void main() {
        vAmp = aAmp;
        gl_Position = vec4(position.xy, 0.0, 1.0);
        gl_PointSize = uDropPx;
      }
    `,
    fragmentShader: `
      varying float vAmp;
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        float d = length(c);
        if (d > 1.0) discard;
        float shape = exp(-d * d * 8.5);
        gl_FragColor = vec4(-shape * vAmp, 0.0, 0.0, 1.0);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor
  });
  const dropScene = new THREE.Scene();
  dropScene.add(new THREE.Points(dropGeometry, dropMaterial));

  return {
    rtA,
    rtB,
    simCamera,
    simMaterial,
    simScene,
    dropScene,
    dropGeometry,
    dropMaterial,
    dropPositions,
    dropAmps,
    dropCount: 0,
    maxDrops,
    fieldBounds: { xMin, xMax, zMin, zMax },
    texture: rtA.texture
  };
}

function addRipple(system, x, z, intensity, selected, elapsed) {
  if (system.dropCount >= system.maxDrops) return;
  const b = system.fieldBounds;
  const u = (clamp(x, b.xMin, b.xMax) - b.xMin) / (b.xMax - b.xMin);
  const v = (clamp(z, b.zMin, b.zMax) - b.zMin) / (b.zMax - b.zMin);
  const i = system.dropCount;
  // Positions are written directly in clip space [-1, 1] for the drop point cloud.
  system.dropPositions[i * 3] = u * 2 - 1;
  system.dropPositions[i * 3 + 1] = v * 2 - 1;
  system.dropPositions[i * 3 + 2] = 0;
  system.dropAmps[i] = (selected ? TUNING.ripple.dropClick : TUNING.ripple.dropRain) * (0.6 + intensity);
  system.dropCount += 1;
}

function updateRippleField(system, renderer, elapsed) {
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;

  // 1. Stamp this frame's raindrop dimples additively into the current field.
  if (system.dropCount > 0) {
    system.dropGeometry.setDrawRange(0, system.dropCount);
    system.dropGeometry.attributes.position.needsUpdate = true;
    system.dropGeometry.attributes.aAmp.needsUpdate = true;
    renderer.autoClear = false;
    renderer.setRenderTarget(system.rtA);
    renderer.render(system.dropScene, system.simCamera);
    renderer.autoClear = prevAutoClear;
  }

  // 2. Advance the wave equation: read rtA, write rtB.
  system.simMaterial.uniforms.uField.value = system.rtA.texture;
  renderer.setRenderTarget(system.rtB);
  renderer.render(system.simScene, system.simCamera);

  // 3. Ping-pong swap; the freshly written target becomes the live field.
  const tmp = system.rtA;
  system.rtA = system.rtB;
  system.rtB = tmp;
  system.texture = system.rtA.texture;

  renderer.setRenderTarget(prevTarget);
  renderer.autoClear = prevAutoClear;

  waterPlane.material.uniforms.uHeightField.value = system.texture;
  root.dataset.activeRipples = String(system.dropCount);
  system.dropCount = 0;
}

function updateWaterPlane(elapsed) {
  waterPlane.material.uniforms.uTime.value = prefersReducedMotion ? 0 : elapsed;
}

function resetChainPosition(data, i, initial) {
  if (!initial) {
    data.respawnCycle[i] += 1;
  }
  const resetSeed = data.resetSeed?.[i] || RAIN_LAYOUT_SEED;
  const seedIndex = data.seedIndex?.[i] ?? i;
  const random = createIndexedRandom(resetSeed, seedIndex, data.respawnCycle[i]);
  const strength = data.strength[i];
  const near = data.near[i];
  const layer = data.curtainLayer[i];
  const columnHeight = Math.max(0.8, data.top[i] - WATER_LEVEL);
  const spread = lerp(0.18, 0.68, Math.pow(strength, 0.82));
  data.baseX[i] = clamp(
    hourToX(data.hour[i]) + randomRange(-spread, spread, random),
    hourToX(0) + 0.12,
    hourToX(24) - 0.12
  );
  data.z[i] = sampleDepth(near, random);

  if (data.role[i] === RAIN_ROLE.AMBIENT) {
    data.headY[i] = rainCeilingY - 0.03;
    return;
  }

  if (layer === 1) {
    const lowerCeiling = WATER_LEVEL + columnHeight * randomRange(0.3, 0.44, random);
    data.headY[i] = randomRange(
      WATER_LEVEL + data.length[i] * 0.72,
      lowerCeiling + data.length[i] * 0.4,
      random
    );
    return;
  }

  if (layer === 0) {
    data.headY[i] = randomRange(
      WATER_LEVEL + data.length[i] * 0.78,
      data.top[i] + data.length[i] * 0.44,
      random
    );
    return;
  }

  data.headY[i] = initial
    ? randomRange(data.top[i] * 0.72, data.top[i] + data.length[i], random)
    : data.top[i] + data.length[i] + randomRange(0.04, 1.1, random);
}

function createIntegratedDownpourHourSampler(random = Math.random) {
  if (!peakWaterfallRanges.length) {
    return createHourSampler(0, 1, random, true);
  }

  const samplers = peakWaterfallRanges.map(([startHour, endHour]) => (
    createWeightedHourRangeSampler(startHour, endHour, random)
  ));
  const weights = peakWaterfallRanges.map(([startHour, endHour]) => {
    const samples = 24;
    let weight = 0;
    for (let index = 0; index < samples; index += 1) {
      const hour = lerp(startHour, endHour, (index + 0.5) / samples);
      weight += 0.02 + sampleStormWeight(hour) * (0.7 + sampleRelativeRainfall(hour));
    }
    return weight * Math.max(0.1, endHour - startHour);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return () => randomRange(0.04, 23.96, random);
  }
  const cumulative = [];
  let cursor = 0;
  for (const weight of weights) {
    cursor += weight / total;
    cumulative.push(cursor);
  }

  return () => {
    const pick = random();
    const index = Math.max(0, cumulative.findIndex(value => pick <= value));
    return samplers[index]();
  };
}

function createWeightedHourRangeSampler(startHour, endHour, random) {
  const binCount = 64;
  const binWidth = (endHour - startHour) / binCount;
  const weights = Array.from({ length: binCount }, (_, bin) => {
    const hour = startHour + (bin + 0.5) * binWidth;
    const strength = sampleRelativeRainfall(hour);
    const dataWeight = Math.pow(Math.max(0.001, strength - 0.2), 1.42);
    return 0.001 + dataWeight * sampleRainCluster(hour);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return () => randomRange(0.04, 23.96, random);
  }
  const cumulative = [];
  let cursor = 0;
  for (const weight of weights) {
    cursor += weight / total;
    cumulative.push(cursor);
  }

  return () => {
    const pick = random();
    const binIndex = Math.max(0, cumulative.findIndex((value) => pick <= value));
    return clamp(startHour + (binIndex + random()) * binWidth, startHour, endHour);
  };
}

function createHourSampler(
  baseWeight,
  exponent,
  random = Math.random,
  clustered = false,
  intensityGain = 2.35,
  spatiallyBalanced = false
) {
  const binCount = clustered ? 96 : 24;
  const binWidth = 24 / binCount;
  const weights = Array.from({ length: binCount }, (_, bin) => {
    const hour = (bin + 0.5) * binWidth;
    const strength = sampleRelativeRainfall(hour);
    const presence = sampleRainPresence(hour);
    const clusterWeight = clustered ? sampleRainCluster(hour) : 1;
    const spatialWeight = spatiallyBalanced ? sampleHourSpatialWeight(hour) : 1;
    // The old exponent of 0.05 flattened almost every positive value to 1,
    // while the additive base weight made 0.1 mm/h nearly as dense as 2 mm/h.
    // Keep the tuning control, but map it onto a perceptually useful range and
    // make its baseline proportional to the actual rainfall.
    const effectiveExponent = 0.55 + Math.max(0, exponent) * 0.35;
    const densityResponse = Math.pow(strength, effectiveExponent);
    const lowRainResponse = baseWeight * Math.pow(strength, 0.85);
    return presence
      * (lowRainResponse + densityResponse * intensityGain * clusterWeight)
      * spatialWeight;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return () => randomRange(0.04, 23.96, random);
  }
  const cumulative = [];
  let cursor = 0;
  for (const weight of weights) {
    cursor += weight / total;
    cumulative.push(cursor);
  }

  return () => {
    const pick = random();
    const binIndex = Math.max(0, cumulative.findIndex((value) => pick <= value));
    const hour = binIndex * binWidth;
    if (clustered) {
      return clamp(hour + random() * binWidth, 0.04, 23.96);
    }
    const strength = sampleRelativeRainfall(hour);
    const spread = lerp(0.54, 0.95, Math.pow(strength, 0.62));
    const centered = ((random() + random() + random()) / 3 - 0.5) * 2;
    return clamp(hour + 0.5 + centered * spread, 0.04, 23.96);
  };
}

function sampleHourSpatialWeight(hour) {
  const rightHalf = hour >= 12;
  const exponent = rightHalf ? 2.3 : 1.45;
  const edgeDistance = Math.abs(hour / 12 - 1);
  return clamp(exponent * Math.pow(edgeDistance, exponent - 1), 0.42, 2.3);
}

function sampleRainCluster(hour) {
  const broad = valueNoise(hour * 0.62, RAIN_CLUSTER_SEED);
  const detail = valueNoise(hour * 2.45, RAIN_CLUSTER_SEED ^ 0x7f4a7c15);
  return 0.68 + broad * 0.38 + detail * 0.34;
}

function sampleRainfall(hour) {
  const safeHour = clamp(hour, 0, 24);
  const left = Math.floor(safeHour);
  const right = Math.min(left + 1, activeRainfall.length - 1);
  const amount = safeHour - left;
  return lerp(activeRainfall[left], activeRainfall[right], amount);
}

// An explicit zero value is a hard semantic boundary: the corresponding hour
// must create a visible dry lane even when neighbouring hours contain rain.
// The short feather prevents a razor-thin cut while keeping non-zero datasets
// visually identical to the previous distribution.
function sampleRainPresence(hour) {
  const safeHour = clamp(hour, 0, 24);
  const left = Math.floor(safeHour);
  const right = Math.min(left + 1, activeRainfall.length - 1);
  const amount = safeHour - left;
  const leftWet = activeRainfall[left] > 0;
  const rightWet = activeRainfall[right] > 0;

  if (!leftWet && !rightWet) return 0;

  const featherHours = 0.68;
  let zeroAnchorGate = 1;
  if (!leftWet) zeroAnchorGate *= smoothstep(0, featherHours, amount);
  if (!rightWet) zeroAnchorGate *= 1 - smoothstep(1 - featherHours, 1, amount);

  // Non-zero values stay fully eligible; density and opacity now carry the
  // continuous magnitude response all the way down to very light rain.
  return clamp(zeroAnchorGate, 0, 1);
}

function sampleVisualRainfall(hour) {
  // The editable line already provides continuous interpolation between hourly
  // values. Using the raw curve here preserves small changes instead of lifting
  // low points toward their wetter neighbours.
  return sampleRainfall(hour) * sampleRainPresence(hour);
}

function sampleRelativeRainfall(hour) {
  if (rainfallMax <= 0) return 0;
  return clamp(sampleVisualRainfall(hour) / rainfallMax, 0, 1);
}

// Fixed-reference strength keeps the default 10 mm/h data visually identical,
// while a uniformly scaled dataset still makes the rain visibly heavier.
function sampleRainStrength(hour) {
  return clamp(sampleVisualRainfall(hour) / VISUAL_RAINFALL_REFERENCE, 0, 2);
}

function rainVisibilityResponse(strength) {
  const normalRain = Math.pow(clamp(strength, 0, 1), 0.58);
  const extremeRain = clamp(strength - 1, 0, 1) * 0.2;
  return normalRain + extremeRain;
}

function rainCapacityResponse(maximumRainfall) {
  const normalized = clamp(maximumRainfall / VISUAL_RAINFALL_REFERENCE, 0, 1);
  return normalized <= 0 ? 0 : 0.05 + Math.pow(normalized, 0.62) * 0.95;
}

function sampleRainHeightStrength(hour) {
  return clamp(sampleVisualRainfall(hour) / Math.max(0.001, rainCeilingValue), 0, 1);
}

function refreshRainfallMetrics() {
  rainfallMax = activeRainfall.reduce((maximum, value) => Math.max(maximum, value), 0);
  const expanded = rainfallMax > BASE_AXIS_MAX;
  axisMax = expanded ? niceAxisCeiling(rainfallMax) : BASE_AXIS_MAX;
  rainCeilingValue = axisMax;
  rainCeilingY = WATER_LEVEL + AXIS_CONFIG.worldHeight;
  peakWaterfallRanges = derivePeakWaterfallRanges();
}

function niceAxisCeiling(value) {
  if (!Number.isFinite(value) || value <= 0) return BASE_AXIS_MAX;
  const exponent = Math.floor(Math.log10(value));
  const scale = 10 ** exponent;
  const fraction = value / scale;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const ceiling = niceFraction * scale;
  return Number.isFinite(ceiling) ? ceiling : value;
}

function rainfallAxisTicks() {
  return [0, axisMax * 0.5, axisMax];
}

function formatRainfallTick(value) {
  if (Math.abs(value) >= 1_000_000) return value.toExponential(1);
  if (Math.abs(value) >= 1000) return value.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function derivePeakWaterfallRanges() {
  if (rainfallMax <= 0) return [];
  const step = 0.25;
  const rawRanges = [];
  let start = null;

  for (let hour = 0; hour <= 24 + step * 0.5; hour += step) {
    const safeHour = Math.min(24, hour);
    const active = sampleStormWeight(safeHour) > 0.08;
    if (active && start == null) start = Math.max(0, safeHour - step);
    if ((!active || safeHour === 24) && start != null) {
      const end = active && safeHour === 24 ? 24 : Math.min(24, safeHour + step);
      rawRanges.push([start, end]);
      start = null;
    }
  }

  const merged = [];
  for (const range of rawRanges) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] - previous[1] <= 0.5) previous[1] = range[1];
    else merged.push([...range]);
  }
  return merged.filter(([startHour, endHour]) => endHour - startHour >= 0.5);
}

function sampleStormWeight(hour) {
  return smoothstep(5.8, 7.8, sampleVisualRainfall(hour));
}

function sampleWaterfallTopY(hour) {
  const strength = sampleRainHeightStrength(hour);
  const clusterHeight = lerp(
    0.91,
    1.09,
    valueNoise(hour * 1.55, RAIN_CLUSTER_SEED ^ 0x51f2a93d)
  );
  const fullColumnHeight = clamp(
    0.95 + Math.pow(strength, 0.92) * 5.8 * clusterHeight,
    1.2,
    8.8
  );
  const topNoise = lerp(
    0.92,
    1.08,
    valueNoise(hour * 3.4, RAIN_CLUSTER_SEED ^ 0x16c5a2d9)
  );
  return WATER_LEVEL + fullColumnHeight * 0.54 * topNoise;
}

function assignWaterfallEnvelope(chain, index, hour) {
  chain.stormWeight[index] = sampleStormWeight(hour);
  chain.waterfallTop[index] = sampleWaterfallTopY(hour);
  chain.waterfallFeather[index] = lerp(
    1.35,
    2.05,
    valueNoise(hour * 2.7 + index * 0.013, RAIN_CLUSTER_SEED ^ 0x762ad4f1)
  );
}

function sampleNearness(random = Math.random) {
  const pick = random();
  if (pick < 0.38) return randomRange(0.72, 1, random);
  if (pick < 0.68) return randomRange(0.38, 0.72, random);
  return randomRange(0, 0.38, random);
}

function sampleDepth(near, random = Math.random) {
  // 把雨压进一条窄深度带：near 越大越靠前(z 略大)，保留微弱前后层次，
  // 但整体厚度由 RAIN_DEPTH.thickness 控制，从侧面看是一片窄雨帘。
  const t = (near - 0.5) * 2; // -1(最远) .. 1(最近)
  return RAIN_DEPTH.center
    + t * RAIN_DEPTH.thickness
    + randomRange(-RAIN_DEPTH.jitter, RAIN_DEPTH.jitter, random);
}

function chainFocus(hour, x, z) {
  const selected = state.selectedActive ? localHourFocus(hour, state.selectedHour) * 0.44 : 0;
  if (!state.pointerActive) return selected;

  const hourFocus = localHourFocus(hour, state.pointerHour);
  const spatial = 1 - clamp(Math.hypot(x - state.pointerWorld.x, (z - state.pointerWorld.z) * 0.7) / 3.2, 0, 1);
  return Math.max(selected, hourFocus * spatial * 0.92);
}

function localHourFocus(hour, targetHour) {
  const distance = Math.abs(hour - targetHour);
  return Math.max(0, 1 - distance / 2.25);
}

function writeRainColor(target, index, strength, brightness, random = Math.random) {
  const color = strength > 0.62 && random() < 0.46
    ? PALETTE.pearlBright
    : random() < 0.68 ? PALETTE.pearlMid : PALETTE.pearlDark;
  const gain = brightness * (0.76 + strength * 0.28);
  target[index] = color.r * gain;
  target[index + 1] = color.g * gain;
  target[index + 2] = color.b * gain;
}

function writeExtensionRainColor(
  target,
  index,
  strength,
  brightness,
  role,
  style,
  random = Math.random
) {
  const brightChance = role === RAIN_ROLE.AMBIENT
    ? 0.01
    : style === 2 ? 0.72 : 0.018;
  const tone = random();
  const color = tone < brightChance
    ? PALETTE.pearlBright
    : tone < brightChance + 0.68 ? PALETTE.pearlMid : PALETTE.pearlDark;
  const gain = brightness * (0.76 + strength * 0.28);
  target[index] = color.r * gain;
  target[index + 1] = color.g * gain;
  target[index + 2] = color.b * gain;
}

function writeWaterColor(target, index, strength, brightness, random = Math.random) {
  const color = strength > 0.58 && random() < 0.34
    ? PALETTE.waterBright
    : random() < 0.7 ? PALETTE.waterMid : PALETTE.waterDark;
  const gain = brightness * (0.74 + strength * 0.24);
  target[index] = color.r * gain;
  target[index + 1] = color.g * gain;
  target[index + 2] = color.b * gain;
}

function hourToX(hour) {
  return (hour / 24 - 0.5) * AXIS_CONFIG.plotWidth;
}

function xToHour(x) {
  return clamp((x / AXIS_CONFIG.plotWidth + 0.5) * 24, 0, 24);
}

function onPointerDown(event) {
  state.pointerDown = true;
  state.pointerMoved = false;
  state.activePointerId = event.pointerId;
  renderer.domElement.setPointerCapture?.(event.pointerId);
  state.downClient.x = event.clientX;
  state.downClient.y = event.clientY;
  state.downView.x = state.view.targetX;
  state.downView.y = state.view.targetY;
  updatePointer(event);
}

function onPointerMove(event) {
  updatePointer(event);

  if (state.pointerDown) {
    // 旋转交给 OrbitControls；这里只判定是否发生拖拽(用于区分“点击选中”)。
    const dx = event.clientX - state.downClient.x;
    const dy = event.clientY - state.downClient.y;
    if (Math.hypot(dx, dy) > AXIS_CONFIG.dragThreshold) {
      state.pointerMoved = true;
      dashboard.classList.add('is-dragged');
      hideAxisForDrag();
    }
  }
}

function onPointerUp(event) {
  updatePointer(event);

  if (!state.pointerMoved) {
    state.selectedHour = clamp(Math.round(state.pointerHour), 0, 24);
    state.selectedActive = true;
    state.burst = 1.55;
    addRipple(rippleSystem, state.pointerWorld.x, state.pointerWorld.z, 0.82, true, clock.elapsedTime);
  }

  releaseActivePointer(event.pointerId);
  state.pointerDown = false;
  state.pointerMoved = false;
  restoreAxisAfterDrag();
  updateDomState(true);
}

function onPointerCancel(event) {
  releaseActivePointer(event.pointerId);
  state.pointerDown = false;
  state.pointerMoved = false;
  state.pointerActive = false;
  dashboard.classList.remove('is-pointer-active');
  restoreAxisAfterDrag();
}

function clearChartHover() {
  state.pointerActive = false;
  dashboard.classList.remove('is-pointer-active');
}

function onPointerLeave() {
  clearChartHover();
}

function onInteractionInterrupted() {
  releaseActivePointer();
  state.pointerDown = false;
  state.pointerMoved = false;
  state.pointerActive = false;
  dashboard.classList.remove('is-pointer-active');
  restoreAxisAfterDrag();
}

function releaseActivePointer(pointerId = state.activePointerId) {
  if (pointerId == null) return;
  if (renderer.domElement.hasPointerCapture?.(pointerId)) {
    renderer.domElement.releasePointerCapture(pointerId);
  }
  state.activePointerId = null;
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  state.pointerClient.x = event.clientX;
  state.pointerClient.y = event.clientY;
  state.pointerNdc.set(x * 2 - 1, -(y * 2 - 1));
  raycaster.setFromCamera(state.pointerNdc, camera);
  raycaster.ray.intersectPlane(pointerPlane, state.pointerWorld);

  // The renderer fills the whole viewport, so pointerleave on the canvas is
  // not enough to detect leaving the chart. Hit-test the actual world-space
  // chart plane and keep the dynamic readout and cursor marker on one state.
  const chartHit = raycaster.ray.intersectPlane(chartPointerPlane, chartPointerWorld);
  const xMin = hourToX(0);
  const xMax = hourToX(24);
  const yMin = WATER_LEVEL - 0.18;
  const yMax = rainCeilingY;
  const isInsideChart = Boolean(chartHit)
    && chartPointerWorld.x >= xMin
    && chartPointerWorld.x <= xMax
    && chartPointerWorld.y >= yMin
    && chartPointerWorld.y <= yMax;

  if (chartHit) state.pointerHour = xToHour(chartPointerWorld.x);
  state.pointerActive = isInsideChart;
  dashboard.classList.toggle('is-pointer-active', isInsideChart);
}

function resetView() {
  releaseActivePointer();
  state.pointerDown = false;
  state.pointerMoved = false;
  applyCameraPreset();
  state.selectedHour = 18;
  state.selectedActive = true;
  state.burst = 0.7;
  dashboard.classList.remove('is-dragged');
  restoreAxisAfterDrag(true);
  updateDomState(true);
}

function updateCamera(delta) {
  // 相机由 OrbitControls 接管(拖拽旋转 + 滚轮缩放)；每帧 update 以应用惯性阻尼。
  if (controls) controls.update();
}

function cameraProfileName() {
  if (window.innerWidth < 760) return 'mobile';
  // Laptop and portrait-tablet viewports need the wider tablet framing even
  // when their CSS width is above the former 980px breakpoint.
  if (window.innerWidth < 1100 || window.innerWidth / window.innerHeight < 1.72) {
    return 'tablet';
  }
  return 'desktop';
}

function cameraFitForBounds(bounds, target, forward, verticalFov, aspect, margin) {
  if (!bounds || bounds.isEmpty() || !Number.isFinite(aspect) || aspect <= 0) return null;

  const viewportLimit = 1 - clamp(margin, 0, 0.2) * 2;
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(verticalFov * 0.5));
  const tanHorizontal = tanVertical * aspect;
  if (tanVertical <= 0 || tanHorizontal <= 0 || viewportLimit <= 0) return null;

  const right = forward.clone().cross(camera.up);
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
  right.normalize();
  const fitUp = right.clone().cross(forward).normalize();
  const samples = [];
  let requiredDistance = 0;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const offset = new THREE.Vector3(x, y, z).sub(target);
        const horizontal = offset.dot(right);
        const vertical = offset.dot(fitUp);
        const depthOffset = offset.dot(forward);
        samples.push({ horizontal, vertical, depthOffset });
        requiredDistance = Math.max(
          requiredDistance,
          Math.abs(horizontal) / (tanHorizontal * viewportLimit) - depthOffset,
          Math.abs(vertical) / (tanVertical * viewportLimit) - depthOffset,
          camera.near + 0.05 - depthOffset
        );
      }
    }
  }

  return { requiredDistance, samples, tanHorizontal, tanVertical, viewportLimit };
}

function cameraFitUsage(fit, distance) {
  if (!fit) return { horizontal: 0, vertical: 0 };
  let horizontal = 0;
  let vertical = 0;
  for (const sample of fit.samples) {
    const depth = Math.max(camera.near, distance + sample.depthOffset);
    horizontal = Math.max(horizontal, Math.abs(sample.horizontal) / (depth * fit.tanHorizontal));
    vertical = Math.max(vertical, Math.abs(sample.vertical) / (depth * fit.tanVertical));
  }
  return { horizontal, vertical };
}

function syncOrbitDistanceLimits(fitDistance) {
  if (!controls) return;
  controls.minDistance = TUNING.orbit.minDistance;
  controls.maxDistance = Math.max(TUNING.orbit.maxDistance, fitDistance * 1.25);
}

function applyCameraPreset() {
  // Presets keep the authored direction and visual center. The curated axis
  // bounds then extend only the distance needed to fit labels and endpoints.
  const preset = TUNING.camera[cameraProfileName()];
  const presetPosition = new THREE.Vector3(preset.pos[0], preset.pos[1], preset.pos[2]);
  cameraTargetBase.set(
    preset.target[0],
    preset.target[1] + TUNING.camera.frameTargetYOffset,
    preset.target[2]
  );
  camera.fov = preset.fov;
  const viewDirection = cameraTargetBase.clone().sub(presetPosition);
  const fallbackDistance = viewDirection.length();
  if (fallbackDistance <= 1e-6) viewDirection.set(0, 0, -1);
  else viewDirection.multiplyScalar(1 / fallbackDistance);

  // The authored tablet target sits high in the scene. In a shallow phone
  // landscape viewport that wastes most of the lower half of the vertical FOV.
  // Balance the complete curated bounds vertically while preserving the same
  // front-facing direction. Center the rain plot itself horizontally so the
  // heavier left-side labels do not push the visual mass to the right.
  if (chartCameraFitBounds && isPhoneLandscapeViewport()) {
    cameraTargetBase.x = 0;
    cameraTargetBase.y = (chartCameraFitBounds.min.y + chartCameraFitBounds.max.y) * 0.5;
  }

  const fit = cameraFitForBounds(
    chartCameraFitBounds,
    cameraTargetBase,
    viewDirection,
    camera.fov,
    camera.aspect,
    CAMERA_FIT_MARGIN
  );
  // Phone landscape is the intended mobile presentation. Let the curated
  // bounds use the full safe area instead of preserving the more distant
  // tablet fallback; all other viewports keep their authored preset floor.
  const fitDistance = fit && isPhoneLandscapeViewport()
    ? fit.requiredDistance
    : Math.max(fallbackDistance, fit?.requiredDistance || 0);
  cameraBase.copy(cameraTargetBase).addScaledVector(viewDirection, -fitDistance);
  camera.position.copy(cameraBase);
  camera.lookAt(cameraTargetBase);
  camera.updateProjectionMatrix();

  if (controls) {
    syncOrbitDistanceLimits(fitDistance);
    controls.target.copy(cameraTargetBase);
    camera.position.copy(cameraBase);
    controls.update();
  }

  const usage = cameraFitUsage(fit, fitDistance);
  root.dataset.cameraFitMode = fit ? 'curated-axis-bounds' : 'preset-fallback';
  root.dataset.cameraFitMargin = CAMERA_FIT_MARGIN.toFixed(3);
  root.dataset.cameraFitDistance = fitDistance.toFixed(3);
  root.dataset.cameraFitRequiredDistance = fit ? fit.requiredDistance.toFixed(3) : 'unavailable';
  root.dataset.cameraFitHorizontalUsage = usage.horizontal.toFixed(3);
  root.dataset.cameraFitVerticalUsage = usage.vertical.toFixed(3);
  root.dataset.cameraFitPresetFloor = isPhoneLandscapeViewport() ? 'disabled' : 'preserved';
  const viewDelta = cameraTargetBase.clone().sub(cameraBase);
  const horizontalDistance = Math.hypot(viewDelta.x, viewDelta.z);
  root.dataset.initialCameraPitchDeg = THREE.MathUtils.radToDeg(
    Math.atan2(viewDelta.y, horizontalDistance)
  ).toFixed(3);
  root.dataset.initialCameraYawDeg = THREE.MathUtils.radToDeg(
    Math.atan2(viewDelta.x, -viewDelta.z)
  ).toFixed(3);
  root.dataset.initialCameraView = 'front-facing';
}

function updateDomState(force = false) {
  const displayHour = state.pointerActive ? state.pointerHour : state.selectedHour;
  dashboard.classList.toggle('is-selected', state.selectedActive);

  const roundedHour = clamp(Math.round(displayHour), 0, 24);
  const value = sampleRainfall(displayHour);
  const key = `${roundedHour}-${value.toFixed(1)}-${state.pointerActive}-${force}`;

  if (key !== state.readoutKey || force) {
    readoutTime.textContent = `${String(roundedHour).padStart(2, '0')}:00`;
    readoutValue.textContent = value.toFixed(1);
    state.readoutKey = key;
  }
}

let resizeSettleToken = 0;

function applyViewportLayout() {
  pixelRatio = targetRendererPixelRatio();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  root.dataset.rendererPixelRatio = pixelRatio.toFixed(2);
  const mobileCrisp = isPhoneLandscapeViewport() ? 1 : 0;
  if (rainChains?.points?.material?.uniforms) {
    rainChains.points.material.uniforms.uPixelRatio.value = pixelRatio;
    rainChains.points.material.uniforms.uMobileCrisp.value = mobileCrisp;
  }
  if (rainChains?.lines?.material?.uniforms) {
    rainChains.lines.material.uniforms.uMobileCrisp.value = mobileCrisp;
  }
  root.dataset.rainEdgeMode = mobileCrisp ? 'mobile-crisp' : 'authored';
  camera.aspect = window.innerWidth / window.innerHeight;
  applyCameraPreset();
  syncAxisLabelScale(axisSystem);
  updateRainPlotMask();
}

function onResize() {
  const token = ++resizeSettleToken;
  applyViewportLayout();

  // Mobile browsers can report an intermediate viewport while the device is
  // rotating. Refit once on the next frame and again after the viewport has
  // settled so a stale portrait/landscape aspect cannot become the final view.
  requestAnimationFrame(() => {
    if (token === resizeSettleToken) applyViewportLayout();
  });
  window.setTimeout(() => {
    if (token === resizeSettleToken) applyViewportLayout();
  }, 240);
}

function updateRainPlotMask() {
  rainPlotBounds.set(0, 1, 0, 1);
  rainPlotFeather.set(0.002, 0, 0.002);
  renderer.getDrawingBufferSize(rainViewport);
}

function randomArcCoverage(seed, arc) {
  return 0.46 + (Math.sin(seed * 12.9898 + arc * 78.233) * 0.5 + 0.5) * 0.42;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function createIndexedRandom(seed, index, cycle) {
  const mixedSeed = seed
    ^ Math.imul(index + 1, 0x9e3779b1)
    ^ Math.imul(cycle + 1, 0x85ebca6b);
  return createSeededRandom(mixedSeed >>> 0);
}

function valueNoise(value, seed) {
  const left = Math.floor(value);
  const amount = smoothstep(0, 1, value - left);
  return lerp(hashNoise(left, seed), hashNoise(left + 1, seed), amount);
}

function hashNoise(index, seed) {
  let value = Math.imul(index ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ value >>> 16, 0x45d9f3b);
  return ((value ^ value >>> 16) >>> 0) / 4294967295;
}

function randomRange(min, max, random = Math.random) {
  return min + random() * (max - min);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function normalizeRainfallValue(value) {
  const scaled = value * 10;
  return Number.isFinite(scaled) ? Math.round(scaled) / 10 : value;
}

function initRainfallEditor() {
  if (
    !rainfallEditorToggle
    || !rainfallEditor
    || !rainfallDataForm
    || !rainfallInputGrid
    || !rainfallLineChart
  ) return;

  const closeButton = rainfallEditor.querySelector('#rainfall-editor-close');
  const restoreButton = rainfallEditor.querySelector('#rainfall-restore');
  const applyButton = rainfallEditor.querySelector('#rainfall-apply');

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
        rainfallEditorToggle?.toggleAttribute('data-weather-failed', Boolean(message));
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

  const inputs = [];
  const chartPoints = [];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const chartBounds = { width: 720, height: 280, left: 42, right: 18, top: 24, bottom: 258 };
  const chartPlotWidth = chartBounds.width - chartBounds.left - chartBounds.right;
  const chartPlotHeight = chartBounds.bottom - chartBounds.top;
  let draftRainfall = [...activeRainfall];
  let chartMax = Math.max(20, niceAxisCeiling(Math.max(...draftRainfall) * 1.25));
  let selectedChartHour = 18;
  let draggingHour = null;
  let draggingPointerId = null;
  let liveApplyTimer = null;
  let previouslyFocused = null;

  const createSvgElement = (tag, attributes = {}) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  };

  const defs = createSvgElement('defs');
  const areaGradient = createSvgElement('linearGradient', {
    id: 'rainfall-chart-area-gradient', x1: 0, y1: 0, x2: 0, y2: 1
  });
  areaGradient.append(
    createSvgElement('stop', { offset: '0%', 'stop-color': '#c2cbdb', 'stop-opacity': 0.28 }),
    createSvgElement('stop', { offset: '100%', 'stop-color': '#687a96', 'stop-opacity': 0.015 })
  );
  defs.appendChild(areaGradient);

  const chartGrid = createSvgElement('g', { 'aria-hidden': 'true' });
  const chartArea = createSvgElement('path', { class: 'rainfall-chart-area' });
  const chartLine = createSvgElement('polyline', { class: 'rainfall-chart-line' });
  const chartPointLayer = createSvgElement('g');
  rainfallLineChart.append(defs, chartGrid, chartArea, chartLine, chartPointLayer);

  for (let hour = 0; hour < defaultRainfall.length; hour += 1) {
    const point = createSvgElement('g', {
      class: 'rainfall-chart-point',
      'data-hour': hour,
      tabindex: 0,
      role: 'slider',
      'aria-orientation': 'vertical',
      'aria-valuemin': 0
    });
    point.append(
      createSvgElement('circle', { class: 'rainfall-chart-handle-halo', r: 13 }),
      createSvgElement('circle', { class: 'rainfall-chart-handle', r: 4.2 }),
      createSvgElement('circle', { class: 'rainfall-chart-hit', r: 14 })
    );
    chartPointLayer.appendChild(point);
    chartPoints.push(point);
  }

  for (let hour = 0; hour < defaultRainfall.length; hour += 1) {
    const field = document.createElement('label');
    field.className = 'rainfall-hour-field';
    field.htmlFor = `rainfall-hour-${hour}`;

    const label = document.createElement('span');
    label.className = 'rainfall-hour-label';
    label.textContent = `${String(hour).padStart(2, '0')}:00`;

    const shell = document.createElement('span');
    shell.className = 'rainfall-input-shell';
    const input = document.createElement('input');
    input.id = `rainfall-hour-${hour}`;
    input.className = 'rainfall-hour-input';
    input.type = 'number';
    input.name = 'rainfall-hour';
    input.dataset.hour = String(hour);
    input.min = '0';
    input.step = '0.1';
    input.inputMode = 'decimal';
    input.required = true;
    input.setAttribute('aria-label', i18n('rainfallInputAria', {
      time: `${String(hour).padStart(2, '0')}:00`
    }));

    const unit = document.createElement('span');
    unit.className = 'rainfall-input-unit';
    unit.setAttribute('aria-hidden', 'true');
    unit.textContent = 'mm/h';

    const fieldError = document.createElement('span');
    fieldError.id = `rainfall-hour-${hour}-error`;
    fieldError.className = 'rainfall-field-error';
    fieldError.hidden = true;
    input.setAttribute('aria-describedby', fieldError.id);
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      fieldError.hidden = true;
      fieldError.textContent = '';
      rainfallEditorErrors.hidden = true;
      rainfallEditorErrors.textContent = '';
      rainfallEditorStatus.textContent = '';

      const value = Number(input.value);
      if (input.value.trim() !== '' && Number.isFinite(value) && value >= 0) {
        draftRainfall[hour] = normalizeRainfallValue(value);
        if (draftRainfall[hour] > chartMax) {
          chartMax = niceAxisCeiling(draftRainfall[hour] * 1.2);
        }
        selectedChartHour = hour;
        renderChart();
        queueLiveApply();
      }
    });
    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (input.value.trim() === '' || !Number.isFinite(value) || value < 0) return;
      draftRainfall[hour] = normalizeRainfallValue(value);
      flushLiveApply(true, i18n('savedHour', {
        time: `${String(hour).padStart(2, '0')}:00`
      }));
    });

    shell.append(input, unit);
    field.append(label, shell, fieldError);
    rainfallInputGrid.appendChild(field);
    inputs.push(input);
  }

  const formatInputValue = value => Number(value).toFixed(1);

  const arraysEqual = (left, right) => left.length === right.length
    && left.every((value, index) => value === right[index]);

  function updateChartReadout(hour = selectedChartHour) {
    selectedChartHour = clamp(Math.round(hour), 0, draftRainfall.length - 1);
    if (rainfallChartTime) {
      rainfallChartTime.textContent = `${String(selectedChartHour).padStart(2, '0')}:00`;
    }
    if (rainfallChartValue) {
      rainfallChartValue.textContent = formatInputValue(draftRainfall[selectedChartHour]);
    }
  }

  function chartPointPosition(hour, value) {
    const x = chartBounds.left + hour / (draftRainfall.length - 1) * chartPlotWidth;
    const y = chartBounds.bottom - clamp(value / Math.max(0.1, chartMax), 0, 1) * chartPlotHeight;
    return { x, y };
  }

  function renderChartGrid() {
    chartGrid.replaceChildren();
    for (const ratio of [0, 0.5, 1]) {
      const y = chartBounds.bottom - ratio * chartPlotHeight;
      chartGrid.appendChild(createSvgElement('line', {
        class: 'rainfall-chart-grid-line',
        x1: chartBounds.left,
        x2: chartBounds.width - chartBounds.right,
        y1: y,
        y2: y
      }));
      const label = createSvgElement('text', {
        class: 'rainfall-chart-grid-label',
        x: chartBounds.left - 9,
        y: y + 6,
        'text-anchor': 'end'
      });
      label.textContent = formatRainfallTick(chartMax * ratio);
      chartGrid.appendChild(label);
    }

    for (const hour of [0, 6, 12, 18, 24]) {
      const x = chartBounds.left + hour / 24 * chartPlotWidth;
      chartGrid.appendChild(createSvgElement('line', {
        class: 'rainfall-chart-grid-line',
        x1: x,
        x2: x,
        y1: chartBounds.top,
        y2: chartBounds.bottom
      }));
    }
  }

  function renderChart() {
    renderChartGrid();
    const positions = draftRainfall.map((value, hour) => chartPointPosition(hour, value));
    chartLine.setAttribute('points', positions.map(point => `${point.x},${point.y}`).join(' '));
    chartArea.setAttribute(
      'd',
      `M ${positions[0].x} ${chartBounds.bottom} L ${positions.map(point => `${point.x} ${point.y}`).join(' L ')} L ${positions.at(-1).x} ${chartBounds.bottom} Z`
    );

    chartPoints.forEach((point, hour) => {
      const position = positions[hour];
      point.setAttribute('transform', `translate(${position.x} ${position.y})`);
      point.classList.toggle('is-active', hour === selectedChartHour);
      point.setAttribute('aria-label', i18n('chartPointAria', {
        time: `${String(hour).padStart(2, '0')}:00`
      }));
      point.setAttribute('aria-valuemax', String(chartMax));
      point.setAttribute('aria-valuenow', String(draftRainfall[hour]));
      point.setAttribute('aria-valuetext', i18n('rainfallValueText', {
        value: formatInputValue(draftRainfall[hour])
      }));
    });
    updateChartReadout();
  }

  function updateChartScale(values = draftRainfall) {
    const maximum = values.reduce((max, value) => Math.max(max, value), 0);
    chartMax = Math.max(20, niceAxisCeiling(maximum * 1.25));
  }

  function applyDraftRainfall() {
    const normalized = draftRainfall.map(value => normalizeRainfallValue(Number(value)));
    if (arraysEqual(normalized, activeRainfall)) return;
    applyRainfallData(normalized);
  }

  function queueLiveApply() {
    if (liveApplyTimer !== null) return;
    liveApplyTimer = window.setTimeout(() => {
      liveApplyTimer = null;
      applyDraftRainfall();
    }, 90);
  }

  function flushLiveApply(_commit = true, message = '') {
    if (liveApplyTimer !== null) {
      window.clearTimeout(liveApplyTimer);
      liveApplyTimer = null;
    }
    applyDraftRainfall();
    syncInputs(activeRainfall, false);
    if (message) rainfallEditorStatus.textContent = message;
  }

  function setDraftValue(hour, value, { live = true } = {}) {
    const normalized = normalizeRainfallValue(clamp(Number(value), 0, chartMax));
    draftRainfall[hour] = normalized;
    selectedChartHour = hour;
    inputs[hour].value = formatInputValue(normalized);
    renderChart();
    if (live) queueLiveApply();
  }

  function valueFromPointer(event) {
    const rect = rainfallLineChart.getBoundingClientRect();
    const chartY = (event.clientY - rect.top) / Math.max(1, rect.height) * chartBounds.height;
    const ratio = (chartBounds.bottom - chartY) / chartPlotHeight;
    return normalizeRainfallValue(clamp(ratio, 0, 1) * chartMax);
  }

  function syncInputs(values, syncDraft = true) {
    if (syncDraft) draftRainfall = [...values];
    inputs.forEach((input, index) => {
      input.value = formatInputValue(values[index]);
      input.removeAttribute('aria-invalid');
      const error = document.getElementById(`${input.id}-error`);
      if (error) {
        error.hidden = true;
        error.textContent = '';
      }
    });
    rainfallEditorErrors.hidden = true;
    rainfallEditorErrors.textContent = '';
    if (syncDraft) {
      updateChartScale(values);
      renderChart();
    }
  }

  function setEditorOpen(open) {
    rainfallEditor.classList.toggle('is-open', open);
    rainfallEditor.setAttribute('aria-hidden', String(!open));
    rainfallEditorToggle.setAttribute('aria-expanded', String(open));

    if (open) {
      previouslyFocused = document.activeElement;
      rainfallEditor.removeAttribute('inert');
      syncInputs(activeRainfall);
      rainfallEditorStatus.textContent = i18n('editorReady');
      requestAnimationFrame(() => closeButton?.focus());
    } else {
      if (liveApplyTimer !== null) flushLiveApply(true);
      rainfallEditor.setAttribute('inert', '');
      rainfallEditorStatus.textContent = '';
      const focusTarget = previouslyFocused instanceof HTMLElement
        ? previouslyFocused
        : rainfallEditorToggle;
      requestAnimationFrame(() => focusTarget.focus());
    }
  }

  function validateInputs() {
    const values = [];
    const invalidInputs = [];

    inputs.forEach((input) => {
      const raw = input.value.trim();
      const value = Number(raw);
      const invalid = raw === '' || !Number.isFinite(value) || value < 0;
      const fieldError = document.getElementById(`${input.id}-error`);

      if (invalid) {
        invalidInputs.push(input);
        input.setAttribute('aria-invalid', 'true');
        if (fieldError) {
          fieldError.hidden = false;
          fieldError.textContent = raw === '' ? i18n('emptyRainfall') : i18n('invalidRainfall');
        }
      } else {
        input.removeAttribute('aria-invalid');
        if (fieldError) {
          fieldError.hidden = true;
          fieldError.textContent = '';
        }
        values.push(normalizeRainfallValue(value));
      }
    });

    if (invalidInputs.length) {
      if (rainfallPreciseEditor) rainfallPreciseEditor.open = true;
      rainfallEditorErrors.hidden = false;
      rainfallEditorErrors.textContent = i18n('invalidCount', { count: invalidInputs.length });
      invalidInputs[0].focus();
      return null;
    }

    rainfallEditorErrors.hidden = true;
    rainfallEditorErrors.textContent = '';
    return values;
  }

  rainfallEditorToggle.addEventListener('click', () => setEditorOpen(true));
  closeButton?.addEventListener('click', () => setEditorOpen(false));
  document.addEventListener('pointerdown', (event) => {
    if (rainfallEditor.getAttribute('aria-hidden') !== 'false') return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (rainfallEditor.contains(target) || rainfallEditorToggle.contains(target)) return;
    setEditorOpen(false);
  }, true);
  rainfallEditor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setEditorOpen(false);
      return;
    }
  });

  rainfallLineChart.addEventListener('pointerdown', (event) => {
    const point = event.target instanceof Element
      ? event.target.closest('.rainfall-chart-point')
      : null;
    if (!(point instanceof SVGElement)) return;
    event.preventDefault();
    draggingHour = Number(point.dataset.hour);
    draggingPointerId = event.pointerId;
    rainfallLineChart.setPointerCapture(event.pointerId);
    setDraftValue(draggingHour, valueFromPointer(event));
  });

  rainfallLineChart.addEventListener('pointermove', (event) => {
    if (draggingHour === null || event.pointerId !== draggingPointerId) return;
    event.preventDefault();
    setDraftValue(draggingHour, valueFromPointer(event));
  });

  const finishChartDrag = (event) => {
    if (draggingHour === null || event.pointerId !== draggingPointerId) return;
    const hour = draggingHour;
    draggingHour = null;
    draggingPointerId = null;
    flushLiveApply(true, i18n('savedValue', {
      time: `${String(hour).padStart(2, '0')}:00`,
      value: formatInputValue(draftRainfall[hour])
    }));
    renderChart();
  };
  rainfallLineChart.addEventListener('pointerup', finishChartDrag);
  rainfallLineChart.addEventListener('pointercancel', finishChartDrag);

  rainfallLineChart.addEventListener('focusin', (event) => {
    const point = event.target instanceof Element
      ? event.target.closest('.rainfall-chart-point')
      : null;
    if (!(point instanceof SVGElement)) return;
    selectedChartHour = Number(point.dataset.hour);
    renderChart();
  });

  rainfallLineChart.addEventListener('keydown', (event) => {
    const point = event.target instanceof Element
      ? event.target.closest('.rainfall-chart-point')
      : null;
    if (!(point instanceof SVGElement)) return;
    const hour = Number(point.dataset.hour);
    const amount = event.shiftKey ? 1 : 0.1;
    let nextValue = null;
    if (event.key === 'ArrowUp') nextValue = draftRainfall[hour] + amount;
    if (event.key === 'ArrowDown') nextValue = draftRainfall[hour] - amount;
    if (event.key === 'Home') nextValue = 0;
    if (event.key === 'End') nextValue = chartMax;
    if (nextValue === null) return;
    event.preventDefault();
    setDraftValue(hour, nextValue, { live: false });
    flushLiveApply(true, i18n('savedValue', {
      time: `${String(hour).padStart(2, '0')}:00`,
      value: formatInputValue(draftRainfall[hour])
    }));
  });

  rainfallDataForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = validateInputs();
    if (!values) return;

    applyButton.disabled = true;
    rainfallEditor.dataset.applying = 'true';
    rainfallEditorStatus.textContent = i18n('applying');
    try {
      draftRainfall = [...values];
      applyRainfallData(values);
      syncInputs(activeRainfall);
      rainfallEditorStatus.textContent = i18n('applied', {
        count: defaultRainfall.length,
        maximum: formatRainfallTick(rainfallMax)
      });
    } catch (error) {
      rainfallEditorErrors.hidden = false;
      rainfallEditorErrors.textContent = error instanceof Error ? error.message : i18n('applyFailed');
      rainfallEditorStatus.textContent = '';
    } finally {
      applyButton.disabled = false;
      rainfallEditor.dataset.applying = 'false';
    }
  });

  restoreButton?.addEventListener('click', () => {
    if (liveApplyTimer !== null) {
      window.clearTimeout(liveApplyTimer);
      liveApplyTimer = null;
    }
    draftRainfall = [...defaultRainfall];
    applyRainfallData(defaultRainfall);
    syncInputs(activeRainfall);
    rainfallEditorStatus.textContent = i18n('restored');
  });

  syncInputs(activeRainfall);
  root.dataset.rainfallEditorReady = 'true';
  root.dataset.rainfallEditorMode = 'live-draggable-line-chart';
}

// 完整效果控制台：所有 TUNING 叶子参数、性能预算和图层开关都可在网页内调整。
// 滑块范围只是便于拖动的建议范围；数字输入框不设软上限/下限，仅保留运行安全约束。
function initTuningPanelV2() {
  const STORAGE = {
    tuning: 'rf-tuning',
    quality: 'rf-quality',
    feature: 'rf-features'
  };

  const activeCameraProfile = cameraProfileName;

  function getNamespace(path, defaults = false) {
    if (path.startsWith('quality.')) {
      return { object: defaults ? DEFAULT_QUALITY : QUALITY, keys: path.slice(8).split('.') };
    }
    if (path.startsWith('feature.')) {
      return { object: defaults ? DEFAULT_FEATURES : FEATURES, keys: path.slice(8).split('.') };
    }
    return { object: defaults ? DEFAULT_TUNING : TUNING, keys: path.split('.') };
  }

  function readPath(path, defaults = false) {
    const { object, keys } = getNamespace(path, defaults);
    return keys.reduce((value, key) => value[key], object);
  }

  function writePath(path, value) {
    const { object, keys } = getNamespace(path);
    let target = object;
    for (let i = 0; i < keys.length - 1; i += 1) target = target[keys[i]];
    target[keys[keys.length - 1]] = value;
  }

  function flattenObject(object, prefix = '', output = {}) {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') flattenObject(value, path, output);
      else output[path] = value;
    }
    return output;
  }

  function persistNamespace(path) {
    try {
      if (path.startsWith('quality.')) {
        localStorage.setItem(STORAGE.quality, JSON.stringify(QUALITY));
      } else if (path.startsWith('feature.')) {
        localStorage.setItem(STORAGE.feature, JSON.stringify(FEATURES));
      } else {
        localStorage.setItem(STORAGE.tuning, JSON.stringify(flattenObject(TUNING)));
      }
    } catch {}
  }

  function sanitizeNumber(path, raw, fallback) {
    let value = Number(raw);
    if (!Number.isFinite(value)) return fallback;

    if (path.startsWith('quality.')) return Math.max(0, Math.round(value));
    if (path.endsWith('.fov')) return clamp(value, 1, 179);
    if (path === 'ripple.damping') return clamp(value, 0, 0.99999);
    if (path === 'orbit.damping') return clamp(value, 0, 1);
    if (path === 'orbit.minPolarDeg' || path === 'orbit.maxPolarDeg') {
      return clamp(value, 0.1, 179.9);
    }
    if (path === 'orbit.minDistance' || path === 'orbit.maxDistance') {
      return Math.max(0.01, value);
    }
    if (path === 'readout.offsetX' || path === 'readout.offsetY') return value;
    if (path === 'mist.height') return Math.max(0.001, value);
    if (/PointSize|maxSize$|edgeWidth$|bottomFeather$/.test(path)) return Math.max(0, value);
    return value;
  }

  const bodyUniforms = {
    'waterfallBody.broadSway': 'uBroadSway',
    'waterfallBody.fineSway': 'uFineSway',
    'waterfallBody.streakFrequency': 'uStreakFrequency',
    'waterfallBody.fineStreakFrequency': 'uFineStreakFrequency',
    'waterfallBody.streakSharpness': 'uStreakSharpness',
    'waterfallBody.fineStreakSharpness': 'uFineStreakSharpness',
    'waterfallBody.fineStreakWeight': 'uFineStreakWeight',
    'waterfallBody.baseMass': 'uBaseMass',
    'waterfallBody.riseMass': 'uRiseMass',
    'waterfallBody.cloudLow': 'uCloudLow',
    'waterfallBody.cloudHigh': 'uCloudHigh',
    'waterfallBody.gapDarkness': 'uGapDarkness',
    'waterfallBody.streakBrightness': 'uStreakBrightness',
    'waterfallBody.bottomFeather': 'uBottomFeather',
    'waterfallBody.opacity': 'uOpacity'
  };

  function applyLive(path, value) {
    if (path.startsWith('feature.')) {
      applyFeatureVisibility();
      return;
    }

    if (path.startsWith('camera.')) {
      if (path === 'camera.frameTargetYOffset' || path.split('.')[1] === activeCameraProfile()) {
        applyCameraPreset();
      }
      return;
    }

    const bodyUniform = bodyUniforms[path];
    if (bodyUniform) {
      peakWaterfall.materials[0].uniforms[bodyUniform].value = value;
      return;
    }

    switch (path) {
      case 'readout.offsetX':
      case 'readout.offsetY': applyReadoutPosition(); break;
      case 'mist.color': mistBand.material.uniforms.uColor.value.setHex(value); break;
      case 'mist.opacity': mistBand.material.uniforms.uOpacity.value = value; break;
      case 'mist.height': updateMistBandHeight(mistBand, value); break;
      case 'mist.reflectionOpacity': mistBand.material.uniforms.uReflOpacity.value = value; break;
      case 'pearls.maxPointSize': rainChains.points.material.uniforms.uMaxPointSize.value = value; break;
      case 'pearls.minPointSize': rainChains.points.material.uniforms.uMinPointSize.value = value; break;
      case 'pearls.alpha': rainChains.points.material.uniforms.uBeadAlpha.value = value; break;
      case 'metalRain.darkColor':
        rainChains.points.material.uniforms.uMetalDark.value.setHex(value);
        rainChains.lines.material.uniforms.uMetalDark.value.setHex(value);
        peakWaterfall.materials.forEach(material => material.uniforms.uDeep.value.setHex(value));
        break;
      case 'metalRain.midColor':
        rainChains.points.material.uniforms.uMetalMid.value.setHex(value);
        rainChains.lines.material.uniforms.uMetalMid.value.setHex(value);
        peakWaterfall.materials.forEach(material => material.uniforms.uMid.value.setHex(value));
        break;
      case 'metalRain.brightColor':
        rainChains.points.material.uniforms.uMetalBright.value.setHex(value);
        rainChains.lines.material.uniforms.uMetalBright.value.setHex(value);
        peakWaterfall.materials.forEach(material => material.uniforms.uBright.value.setHex(value));
        break;
      case 'metalRain.tintColor': rainChains.points.material.uniforms.uMetalTint.value.setHex(value); break;
      case 'metalRain.pearlBandFrequency': rainChains.points.material.uniforms.uPearlBandFrequency.value = value; break;
      case 'metalRain.pearlBandSpeed': rainChains.points.material.uniforms.uPearlBandSpeed.value = value; break;
      case 'metalRain.pearlSpecularPower': rainChains.points.material.uniforms.uPearlSpecularPower.value = value; break;
      case 'metalRain.pearlFresnelStrength': rainChains.points.material.uniforms.uPearlFresnelStrength.value = value; break;
      case 'metalRain.threadBandDensity': rainChains.lines.material.uniforms.uThreadBandDensity.value = value; break;
      case 'metalRain.threadBandSpeed': rainChains.lines.material.uniforms.uThreadBandSpeed.value = value; break;
      case 'metalRain.threadMirrorStrength': rainChains.lines.material.uniforms.uThreadMirrorStrength.value = value; break;
      case 'metalRain.bodyBandDensity': peakWaterfall.materials[0].uniforms.uBodyBandDensity.value = value; break;
      case 'metalRain.bodyBandSpeed': peakWaterfall.materials[0].uniforms.uBodyBandSpeed.value = value; break;
      case 'metalRain.bodyMirrorStrength': peakWaterfall.materials[0].uniforms.uBodyMirrorStrength.value = value; break;
      case 'metalRain.filamentBandDensity':
        peakWaterfall.materials[1].uniforms.uFilamentBandDensity.value = value;
        peakWaterfall.materials[2].uniforms.uFilamentBandDensity.value = value;
        break;
      case 'metalRain.filamentBandSpeed':
        peakWaterfall.materials[1].uniforms.uFilamentBandSpeed.value = value;
        peakWaterfall.materials[2].uniforms.uFilamentBandSpeed.value = value;
        break;
      case 'metalRain.filamentMirrorStrength':
        peakWaterfall.materials[1].uniforms.uFilamentMirrorStrength.value = value;
        break;
      case 'metalRain.highlightMirrorStrength':
        peakWaterfall.materials[2].uniforms.uFilamentMirrorStrength.value = value;
        break;
      case 'glint.opacity': waterGlints.points.material.uniforms.uOpacity.value = value; break;
      case 'glint.maxSize': waterGlints.points.material.uniforms.uMaxSize.value = value; break;
      case 'foam.opacity': impactPearls.foam.material.uniforms.uOpacity.value = value; break;
      case 'foam.maxSize': impactPearls.foam.material.uniforms.uMaxSize.value = value; break;
      case 'spray.opacity': impactPearls.droplets.material.uniforms.uOpacity.value = value; break;
      case 'spray.maxSize': impactPearls.droplets.material.uniforms.uMaxSize.value = value; break;
      case 'water.deepColor':
        waterPlane.material.uniforms.uColorDeep.value.setHex(value);
        poolFloor.material.uniforms.uColor.value.setHex(value);
        break;
      case 'water.surfaceColor': waterPlane.material.uniforms.uColorSurface.value.setHex(value); break;
      case 'water.roughness': waterPlane.material.uniforms.uRoughness.value = value; break;
      case 'water.specularStrength': waterPlane.material.uniforms.uSpecularStrength.value = value; break;
      case 'water.rippleHighlight': waterPlane.material.uniforms.uRippleHighlight.value = value; break;
      case 'water.surfaceOpacity': waterPlane.material.uniforms.uSurfaceOpacity.value = value; break;
      case 'water.wavePrimary': waterPlane.material.uniforms.uWavePrimary.value = value; break;
      case 'water.waveSecondary': waterPlane.material.uniforms.uWaveSecondary.value = value; break;
      case 'water.reflStrength': waterPlane.material.uniforms.uReflStrength.value = value; break;
      case 'water.reflFade': waterPlane.material.uniforms.uReflFade.value = value; break;
      case 'water.rearFadeNearZ':
        waterPlane.material.uniforms.uRearFadeNearZ.value = value;
        poolFloor.material.uniforms.uRearFadeNearZ.value = value;
        break;
      case 'water.rearFadeFarZ':
        waterPlane.material.uniforms.uRearFadeFarZ.value = value;
        poolFloor.material.uniforms.uRearFadeFarZ.value = value;
        break;
      case 'waterfallBody.deepColor': peakWaterfall.materials[0].uniforms.uDeep.value.setHex(value); break;
      case 'waterfallBody.midColor': peakWaterfall.materials[0].uniforms.uMid.value.setHex(value); break;
      case 'waterfallBody.brightColor': peakWaterfall.materials[0].uniforms.uBright.value.setHex(value); break;
      case 'waterfallFilaments.edgeWidth': peakWaterfall.materials[1].uniforms.uEdgeWidth.value = value; break;
      case 'waterfallFilaments.highlightEdgeWidth': peakWaterfall.materials[2].uniforms.uEdgeWidth.value = value; break;
      case 'waterfallFilaments.opacity': peakWaterfall.materials[1].uniforms.uOpacity.value = value; break;
      case 'waterfallFilaments.highlightOpacity': peakWaterfall.materials[2].uniforms.uOpacity.value = value; break;
      case 'waterfallFilaments.bottomMistOpacity':
        peakWaterfall.materials[1].uniforms.uBottomMistOpacity.value = value;
        peakWaterfall.materials[2].uniforms.uBottomMistOpacity.value = value;
        break;
      case 'ripple.gain': waterPlane.material.uniforms.uRippleGain.value = value; break;
      case 'ripple.damping': rippleSystem.simMaterial.uniforms.uDamping.value = value; break;
      case 'ripple.displace': waterPlane.material.uniforms.uRippleDisplace.value = value; break;
      case 'orbit.minDistance': if (controls) controls.minDistance = value; break;
      case 'orbit.maxDistance': if (controls) controls.maxDistance = value; break;
      case 'orbit.azimuthDeg':
        if (controls) {
          controls.minAzimuthAngle = -THREE.MathUtils.degToRad(value);
          controls.maxAzimuthAngle = THREE.MathUtils.degToRad(value);
        }
        break;
      case 'orbit.minPolarDeg': if (controls) controls.minPolarAngle = THREE.MathUtils.degToRad(value); break;
      case 'orbit.maxPolarDeg': if (controls) controls.maxPolarAngle = THREE.MathUtils.degToRad(value); break;
      case 'orbit.damping': if (controls) controls.dampingFactor = value; break;
    }
  }

  let refreshDirty = false;
  let refreshHint = null;

  function markRefreshDirty() {
    refreshDirty = true;
    if (refreshHint) refreshHint.hidden = false;
    if (panel) panel.dataset.refreshDirty = 'true';
  }

  function commitValue(param, raw) {
    let value = raw;
    const current = readPath(param.key);
    if (param.type === 'number') value = sanitizeNumber(param.key, raw, current);
    writePath(param.key, value);
    persistNamespace(param.key);
    if (param.mode === 'reload') markRefreshDirty();
    else applyLive(param.key, value);
    return value;
  }

  const num = (key, label, desc, min, max, step, mode = 'live') => ({
    key, label, desc, min, max, step, mode, type: 'number'
  });
  const color = (key, label, desc) => ({ key, label, desc, mode: 'live', type: 'color' });
  const toggle = (key, label, desc) => ({ key, label, desc, mode: 'live', type: 'toggle' });

  function cameraParams(profile, label) {
    const prefix = `camera.${profile}`;
    return [
      num(`${prefix}.pos.0`, `${label} · 相机 X`, '相机左右位置；负值向左，正值向右。', -40, 40, 0.05),
      num(`${prefix}.pos.1`, `${label} · 相机 Y`, '相机高度；调大更俯视，调小更贴近水面。', -20, 50, 0.05),
      num(`${prefix}.pos.2`, `${label} · 相机 Z`, '相机前后位置；通常调大更远，调小更近。', -50, 100, 0.05),
      num(`${prefix}.target.0`, `${label} · 注视 X`, '构图注视点的左右位置。', -40, 40, 0.05),
      num(`${prefix}.target.1`, `${label} · 注视 Y`, '构图注视点高度；调大画面抬高。', -20, 50, 0.05),
      num(`${prefix}.target.2`, `${label} · 注视 Z`, '构图注视点的前后位置。', -50, 50, 0.05),
      num(`${prefix}.fov`, `${label} · 视野角`, '调大更广角，调小更压缩；安全范围 1–179°。', 5, 150, 0.5)
    ];
  }

  const sections = [
    {
      id: 'interface', icon: '⌖', title: '界面布局', open: true,
      desc: '调整界面叠加信息的位置，修改后立即生效并自动保存。',
      params: [
        num('readout.offsetX', '右上角数据 · 水平位置', '世界坐标水平偏移；正值向右，负值向左，读数会随图表一起旋转。', -6, 6, 0.05),
        num('readout.offsetY', '右上角数据 · 垂直位置', '世界坐标垂直偏移；正值向上，负值向下，读数会随图表一起旋转。', -3, 3, 0.05)
      ]
    },
    {
      id: 'features', icon: '◉', title: '图层开关', open: true,
      desc: '先隔离图层，再调整细节；所有开关实时生效并自动保存。',
      params: [
        toggle('feature.showAxes', '坐标轴与刻度', '显示或隐藏时间轴、数值轴和文字刻度。'),
        toggle('feature.showWater', '水面与池底', '同时显示或隐藏水面和下方池底。'),
        toggle('feature.showMist', '水线雾带', '显示或隐藏雨体与水面的连接雾。'),
        toggle('feature.showRainLines', '雨丝连线', '显示或隐藏雨珠之间的竖向线段。'),
        toggle('feature.showPearls', '珍珠雨点', '显示或隐藏主体点状雨珠。'),
        toggle('feature.showWaterGlints', '水面光点', '显示或隐藏水面碎光；还需性能区的光点数量大于 0。'),
        toggle('feature.showImpacts', '落水泡沫与飞溅', '同时显示或隐藏泡沫、飞溅水滴和皇冠水花。'),
        toggle('feature.showPeakWaterfall', '峰值瀑布层', '显示或隐藏暴雨峰值的体积瀑布与雨丝。')
      ]
    },
    {
      id: 'camera', icon: '◫', title: '相机构图',
      desc: '按屏幕宽度自动选桌面、平板或手机档；当前档修改后立即更新。',
      params: [
        num('camera.frameTargetYOffset', '初始画面整体下移', '提高相机注视点，让坐标轴、雨幕和标题整体向下构图。', -5, 5, 0.05),
        ...cameraParams('desktop', '桌面'),
        ...cameraParams('tablet', '平板'),
        ...cameraParams('mobile', '手机')
      ]
    },
    {
      id: 'rain', icon: '╏', title: '雨体与雨珠', open: true,
      desc: '控制雨珠外观和全天雨量分布。雨量分布会改变生成布局，因此刷新生效。',
      params: [
        num('pearls.maxPointSize', '近景雨珠最大尺寸', '近处雨珠像素上限；调大会更圆、更显眼。', 0.1, 40, 0.1),
        num('pearls.minPointSize', '远景雨珠最小尺寸', '远处雨珠像素下限；调小可让远景更轻。', 0.1, 40, 0.1),
        num('pearls.alpha', '雨珠整体透明度', '调大雨幕更实，调小更稀薄；允许高于 1 做强效果。', 0, 3, 0.01),
        num('rain.baseWeight', '低谷基础雨量', '无雨时段仍保留多少雨帘；调整后刷新重建雨串。', 0, 2, 0.005, 'reload'),
        num('rain.exponent', '雨强分布曲线', '调大更集中在峰值，调小全天更均匀；调整后刷新重建。', 0.05, 8, 0.05, 'reload')
      ]
    },
    {
      id: 'metal-rain', icon: '◈', title: '液态金属雨', open: true,
      desc: '实时控制雨珠、连接雨丝、峰值金属体与高光细丝的黑银反射。',
      params: [
        color('metalRain.darkColor', '金属暗部色', '水银阴影、反射空洞和暗缝的颜色。'),
        color('metalRain.midColor', '金属中间色', '雨丝主体的铬银中间调。'),
        color('metalRain.brightColor', '镜面高光色', '移动反射带和镜面亮点的颜色。'),
        color('metalRain.tintColor', '雨珠冷色偏光', '只影响点状雨珠的冷色环境偏光。'),
        num('metalRain.pearlBandFrequency', '雨珠反射带密度', '调大雨珠表面的黑银条带更细密。', 0, 20, 0.1),
        num('metalRain.pearlBandSpeed', '雨珠反射流速', '控制雨珠黑银反射在表面流动的速度。', -6, 6, 0.01),
        num('metalRain.pearlSpecularPower', '雨珠高光锐度', '调大镜面亮点更小更硬，调小更宽更柔。', 1, 100, 1),
        num('metalRain.pearlFresnelStrength', '雨珠边缘反光', '控制雨珠轮廓边缘的金属反光强度。', 0, 2, 0.01),
        num('metalRain.threadBandDensity', '连接雨丝条带密度', '控制细雨丝上流动明暗带的间距。', 0, 0.2, 0.001),
        num('metalRain.threadBandSpeed', '连接雨丝流速', '控制细雨丝上高光向下流动的速度。', -10, 10, 0.05),
        num('metalRain.threadMirrorStrength', '连接雨丝亮度', '控制普通细雨丝的镜面银白强度。', 0, 2, 0.01),
        num('metalRain.bodyBandDensity', '峰值金属带密度', '调大峰值水银体上的竖向反射带更细密。', 0, 16, 0.1),
        num('metalRain.bodyBandSpeed', '峰值金属带流速', '控制峰值水银体反射带的流动速度。', -8, 8, 0.05),
        num('metalRain.bodyMirrorStrength', '峰值镜面强度', '控制峰值金属体银白镜面区域的亮度。', 0, 2, 0.01),
        num('metalRain.filamentBandDensity', '峰值细丝条带密度', '控制峰值瀑布细丝上的反射带间距。', 0, 12, 0.05),
        num('metalRain.filamentBandSpeed', '峰值细丝流速', '控制峰值细丝上反射高光的流动速度。', -8, 8, 0.05),
        num('metalRain.filamentMirrorStrength', '峰值细丝反光', '普通峰值细丝的金属反光强度。', 0, 2, 0.01),
        num('metalRain.highlightMirrorStrength', '高光细丝反光', '前景高光细丝的金属反光强度。', 0, 2, 0.01)
      ]
    },
    {
      id: 'floor', icon: '⌄', title: '近水提亮', open: true,
      desc: '决定雨体底部是否厚实、发亮，以及黑底会不会从雨脚之间透出。',
      params: [
        num('floorGlow.base', '普通雨基础提亮', '所有普通雨珠接近水面时的底部亮度。', -2, 5, 0.01),
        num('floorGlow.baseByStrength', '普通雨随强度提亮', '雨越大时普通雨脚额外增加的亮度。', -2, 5, 0.01),
        num('floorGlow.lowerCurtain', '低层雨帘提亮', '短雨帘靠近水面的固定提亮量。', -2, 5, 0.01),
        num('floorGlow.lowerCurtainByStrength', '低层雨帘强度提亮', '峰值区域短雨帘的额外亮度。', -2, 5, 0.01),
        num('floorGlow.downpour', '瀑布雨基础提亮', '峰值瀑布雨靠近水面时的基础亮度。', -2, 5, 0.01),
        num('floorGlow.downpourByStrength', '瀑布雨强度提亮', '峰值越高，瀑布雨脚增加的亮度。', -2, 5, 0.01),
        num('floorGlow.ambient', '背景雨底部提亮', '弱雨帘在水线附近的雾光亮度。', -2, 5, 0.01)
      ]
    },
    {
      id: 'water', icon: '≈', title: '水面与倒影', open: true,
      desc: '控制近黑水体、镜面高光、程序波动和雨柱倒影。',
      params: [
        color('water.deepColor', '深水底色', '水体和池底的暗部颜色。'),
        color('water.surfaceColor', '水面高光色', '水面基础反光与近端渐变颜色。'),
        num('water.roughness', '磨砂程度', '0 接近镜面；调大高光更宽、更柔。', 0, 3, 0.01),
        num('water.specularStrength', '镜面高光强度', '控制窄高光亮度；可输入高于滑块范围的值。', 0, 30, 0.05),
        num('water.rippleHighlight', '波峰反光强度', '控制涟漪坡面蓝白高光。', 0, 30, 0.05),
        num('water.surfaceOpacity', '水面基础浓度', '调大更实，调小更通透；过大会发白。', 0, 3, 0.01),
        num('water.wavePrimary', '大波顶点幅度', '整体缓慢起伏；可用负值反转相位。', -0.25, 0.25, 0.001),
        num('water.waveSecondary', '小波顶点幅度', '叠加的细碎波动；可用负值反转相位。', -0.25, 0.25, 0.001),
        num('water.reflStrength', '雨柱倒影亮度', '调大水中竖向镜像更明显。', 0, 10, 0.05),
        num('water.reflFade', '雨柱倒影长度', '调大倒影向前延伸更远。', 0.25, 40, 0.05),
        num('water.rearFadeNearZ', '后缘渐隐起点', '从该世界 Z 坐标开始向黑色背景渐隐。', -20, 10, 0.05),
        num('water.rearFadeFarZ', '后缘完全消失位置', '到该世界 Z 坐标时水面和池底透明度为 0。', -20, 10, 0.05)
      ]
    },
    {
      id: 'mist', icon: '≋', title: '水线雾霭',
      desc: '用柔雾连接上方雨体和水面，可消除正面视角的黑色分界。',
      params: [
        color('mist.color', '雾霭颜色', '水线薄雾的色调。'),
        num('mist.opacity', '雾霭浓度', '调大连接更厚、更亮；允许超过 1。', 0, 3, 0.01),
        num('mist.height', '雾带高度', '雾向上铺开的世界单位高度。', 0.05, 20, 0.05),
        num('mist.reflectionOpacity', '雾带垂直倒影', '调大水线下方竖向反光更明显。', 0, 5, 0.02)
      ]
    },
    {
      id: 'ripple', icon: '◎', title: 'GPU 涟漪物理',
      desc: '控制雨滴落水后的传播、衰减、冲击与顶点位移。',
      params: [
        num('ripple.gain', '涟漪显影增益', '只放大波纹反光信号，不直接增加几何高度。', 0, 150, 0.5),
        num('ripple.damping', '波纹持续时间', '越接近 1 传播越久；为稳定性硬上限为 0.99999。', 0.8, 0.99999, 0.0001),
        num('ripple.dropRain', '雨滴冲击强度', '每次自然落水写入高度场的强度。', 0, 10, 0.01),
        num('ripple.dropClick', '点击冲击强度', '鼠标点击水面触发的波纹强度。', 0, 10, 0.01),
        num('ripple.displace', '涟漪顶点位移', '波场对水面几何的影响；过大可能出现条纹。', -0.5, 0.5, 0.001)
      ]
    },
    {
      id: 'glint', icon: '✦', title: '水面碎光',
      desc: '控制水面漂动光点；性能区“水面光点数量”需大于 0。',
      params: [
        num('glint.opacity', '光点整体透明度', '所有水面碎光的材质透明度。', 0, 3, 0.01),
        num('glint.alphaMax', '单点亮度上限', '动态闪烁计算后的单个光点透明度上限。', 0, 3, 0.01),
        num('glint.maxSize', '光点最大尺寸', '水面光点的像素尺寸上限。', 0.1, 80, 0.1)
      ]
    },
    {
      id: 'impact', icon: '⁕', title: '落水泡沫与飞溅',
      desc: '控制撞击后短暂出现的横向泡沫和向上飞溅水滴。',
      params: [
        num('foam.opacity', '泡沫透明度', '落点横向白沫的整体可见度。', 0, 3, 0.01),
        num('foam.maxSize', '泡沫最大尺寸', '泡沫粒子的像素尺寸上限。', 0.1, 100, 0.1),
        num('spray.opacity', '飞溅水滴透明度', '向上飞溅小水滴的整体可见度。', 0, 3, 0.01),
        num('spray.maxSize', '飞溅最大尺寸', '飞溅水滴的像素尺寸上限。', 0.1, 100, 0.1)
      ]
    },
    {
      id: 'waterfall-body', icon: '▥', title: '峰值瀑布 · 体积',
      desc: '控制暴雨峰值的雾状水体、竖纹、明暗和底部质量；需先打开峰值瀑布层。',
      params: [
        color('waterfallBody.deepColor', '体积暗部色', '瀑布阴影和深缝颜色。'),
        color('waterfallBody.midColor', '体积中间色', '瀑布主体的冷灰中间调。'),
        color('waterfallBody.brightColor', '体积亮部色', '雨丝和底部水雾的银白高光。'),
        num('waterfallBody.broadSway', '大尺度左右摆动', '整体瀑布随高度产生的慢速横向摆动。', -1, 1, 0.001),
        num('waterfallBody.fineSway', '细节左右摆动', '高频小幅摆动；调大边缘更活。', -0.5, 0.5, 0.001),
        num('waterfallBody.streakFrequency', '主雨丝频率', '调大主竖纹更细密。', 0.1, 250, 0.5),
        num('waterfallBody.fineStreakFrequency', '细雨丝频率', '调大叠加的细竖纹更多。', 0.1, 500, 0.5),
        num('waterfallBody.streakSharpness', '主雨丝锐度', '调大主竖纹更硬、更分明。', 0.05, 30, 0.05),
        num('waterfallBody.fineStreakSharpness', '细雨丝锐度', '调大细线边缘更脆。', 0.05, 40, 0.05),
        num('waterfallBody.fineStreakWeight', '细雨丝占比', '调大纹理更碎，调小更像整片水体。', -2, 5, 0.01),
        num('waterfallBody.baseMass', '底部水体质量', '调大瀑布底部更厚、更亮。', -3, 8, 0.02),
        num('waterfallBody.riseMass', '向上雾化质量', '调大雾状体积向上填充得更满。', -3, 8, 0.02),
        num('waterfallBody.cloudLow', '云团暗部系数', '调大暗区被抬亮，调小对比更强。', -3, 8, 0.02),
        num('waterfallBody.cloudHigh', '云团亮部系数', '调大亮团更强，调小体积更平。', -3, 8, 0.02),
        num('waterfallBody.gapDarkness', '雨丝缝隙亮度', '调大黑缝变亮更糊，调小缝隙更深。', -2, 5, 0.01),
        num('waterfallBody.streakBrightness', '竖向雨丝亮度', '调大竖向水流纹理更醒目。', -3, 10, 0.02),
        num('waterfallBody.bottomFeather', '底边羽化', '调大底部过渡更空、更柔；数值保持非负。', 0, 3, 0.01),
        num('waterfallBody.opacity', '体积整体透明度', '调大瀑布体积更实；允许超过 1。', 0, 3, 0.01)
      ]
    },
    {
      id: 'waterfall-filaments', icon: '╿', title: '峰值瀑布 · 雨丝',
      desc: '控制叠加在体积瀑布上的普通雨丝、高光雨丝和落点雾化。',
      params: [
        num('waterfallFilaments.edgeWidth', '普通雨丝宽度', '普通雨丝从中心到边缘的软宽度。', 0, 3, 0.01),
        num('waterfallFilaments.highlightEdgeWidth', '高光雨丝宽度', '前景亮丝的边缘宽度。', 0, 3, 0.01),
        num('waterfallFilaments.opacity', '普通雨丝透明度', '普通雨丝层的整体可见度。', 0, 3, 0.01),
        num('waterfallFilaments.highlightOpacity', '高光雨丝透明度', '加色高光雨丝层的整体可见度。', 0, 3, 0.01),
        num('waterfallFilaments.bottomMistOpacity', '雨丝底部雾化', '雨丝落到水面附近时的雾化补偿。', 0, 5, 0.01)
      ]
    },
    {
      id: 'orbit', icon: '↻', title: '交互视角轨道',
      desc: '控制拖拽旋转、滚轮距离和惯性；与上方相机初始构图互相独立。',
      params: [
        num('orbit.minDistance', '最近观察距离', '滚轮可拉近到的最小距离。', 0.1, 100, 0.1),
        num('orbit.maxDistance', '最远观察距离', '滚轮可后退到的最大距离。', 0.1, 200, 0.1),
        num('orbit.azimuthDeg', '水平旋转范围', '左右各允许旋转的角度；0° 锁定正面。', 0, 180, 1),
        num('orbit.minPolarDeg', '最俯视极角', '调小可从更高处俯看；安全范围 0.1–179.9°。', 0.1, 179, 0.5),
        num('orbit.maxPolarDeg', '最仰视极角', '调大可更贴近水面仰看。', 0.1, 179.9, 0.5),
        num('orbit.damping', '旋转惯性阻尼', '调大拖拽更黏、更慢；调小更直接。', 0, 1, 0.005)
      ]
    },
    {
      id: 'quality', icon: '⚡', title: '粒子数量与性能',
      desc: '改变数组和几何容量，需要刷新页面重建；数字框可输入远高于滑块范围的值。',
      params: [
        num('quality.chains', '主雨串数量', '全天数据雨串的基础数量。', 0, 12000, 10, 'reload'),
        num('quality.ambientChains', '背景细雨数量', '补足低谷时段的轻雨帘数量。', 0, 8000, 10, 'reload'),
        num('quality.downpourChains', '暴雨峰值雨串数量', '集中在峰值段的加密雨串数量。', 0, 12000, 10, 'reload'),
        num('quality.waterfallFilaments', '瀑布雨丝容量', '峰值瀑布实例化雨丝数量。', 0, 12000, 10, 'reload'),
        num('quality.waterGlints', '水面光点数量', '水面碎光粒子容量；当前为 0 时碎光参数不可见。', 0, 10000, 10, 'reload'),
        num('quality.impactPearls', '撞击粒子池大小', '泡沫、飞溅与皇冠水花的总容量。', 0, 30000, 50, 'reload'),
        num('quality.impactEventsPerSecond', '每秒撞击事件预算', '每秒可生成的落水水花事件。', 0, 3000, 5, 'reload'),
        num('quality.rippleEventsPerSecond', '每秒涟漪事件预算', '每秒写入 GPU 高度场的自然雨滴事件。', 0, 1000, 1, 'reload'),
        num('quality.maxRipples', '兼容涟漪上限', '旧版兼容参数；当前 GPU 高度场主要使用每秒事件预算。', 0, 1000, 1, 'reload')
      ]
    }
  ];

  // 防止今后新增 TUNING 参数却忘记加入面板：自动补进“未分类”区。
  const declaredTuning = new Set(
    sections.flatMap(section => section.params.map(param => param.key))
      .filter(path => !path.startsWith('quality.') && !path.startsWith('feature.'))
  );
  const missingTuning = Object.keys(flattenObject(TUNING)).filter(path => !declaredTuning.has(path));
  if (missingTuning.length) {
    sections.push({
      id: 'uncategorized', icon: '…', title: '新增未分类参数',
      desc: '代码中新出现但尚未编写专属说明的参数，已自动加入，避免调参遗漏。',
      params: missingTuning.map(path => {
        const value = readPath(path);
        if (typeof value === 'boolean') return toggle(path, path, '自动发现的布尔参数。');
        if (/color/i.test(path)) return color(path, path, '自动发现的颜色参数。');
        const span = Math.max(1, Math.abs(Number(value)) * 10);
        return num(path, path, '自动发现的数值参数；数字输入不受滑块软范围限制。', -span, span, span / 500);
      })
    });
  }

  const allParams = sections.flatMap(section => section.params);
  root.dataset.tuningParameterCount = String(allParams.length);
  root.dataset.tuningUnmappedCount = '0';
  root.dataset.tuningAutoCoveredCount = String(missingTuning.length);

  const style = document.createElement('style');
  style.id = 'tuning-console-style';
  style.textContent = `
    #tuning-toggle{position:fixed;top:max(80px,calc(env(safe-area-inset-top) + 62px));right:max(18px,env(safe-area-inset-right));z-index:1201;display:grid;width:40px;height:40px;padding:0;place-items:center;border:1px solid var(--panel-border);border-radius:50%;background:var(--panel-control-bg);color:rgba(194,203,219,.72);font-size:19px;line-height:1;box-shadow:0 10px 28px rgba(0,0,0,.3);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;transition:border-color 160ms ease,background-color 160ms ease,color 160ms ease,transform 160ms ease}
    #tuning-toggle:hover{border-color:rgba(194,203,219,.42);background:var(--panel-control-hover);color:#fff;transform:translateY(-1px)}
    #tuning-toggle:focus-visible,.tc-search:focus-visible,.tc-tool-btn:focus-visible,.tc-action:focus-visible,.tc-number:focus-visible,.tc-hex:focus-visible,.tc-range:focus-visible,.tc-theme-apply:focus-visible{outline:2px solid var(--panel-accent);outline-offset:2px}
    #tuning-toggle[aria-expanded="true"]{top:max(26px,env(safe-area-inset-top));right:max(22px,env(safe-area-inset-right));width:var(--panel-close-size);height:var(--panel-close-size);border-color:rgba(250,251,255,.14);background:rgba(250,251,255,.055);color:rgba(194,203,219,.68);font-size:0;box-shadow:inset 0 1px 0 rgba(250,251,255,.07);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);transform:none}
    #tuning-toggle[aria-expanded="true"]:hover{border-color:rgba(250,251,255,.28);background:rgba(250,251,255,.11);color:#fff;transform:none}
    #tuning-toggle[aria-expanded="true"]::before,#tuning-toggle[aria-expanded="true"]::after{position:absolute;width:14px;height:2px;border-radius:999px;background:currentColor;content:''}#tuning-toggle[aria-expanded="true"]::before{transform:rotate(45deg)}#tuning-toggle[aria-expanded="true"]::after{transform:rotate(-45deg)}
    #tuning-panel{position:fixed;z-index:1200;top:0;right:0;bottom:0;display:flex;width:min(440px,calc(100vw - 36px));padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);flex-direction:column;overflow:hidden;border-left:1px solid var(--panel-border);background:radial-gradient(circle at 88% 0%,rgba(var(--theme-highlight-rgb),.1),transparent 30%),linear-gradient(245deg,rgba(var(--theme-highlight-rgb),.045),transparent 34%),linear-gradient(180deg,var(--panel-surface-top),var(--panel-surface-bottom)),rgba(var(--theme-panel-rgb),.64);color:var(--panel-text-main);font:12px/1.45 Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;box-shadow:inset 1px 0 0 rgba(250,251,255,.04),inset 0 1px 0 rgba(250,251,255,.08),-26px 0 84px rgba(0,0,0,.42);backdrop-filter:blur(42px) saturate(145%);-webkit-backdrop-filter:blur(42px) saturate(145%);opacity:0;visibility:hidden;pointer-events:none;transform:translateX(calc(100% + 24px));transition:opacity 220ms ease,transform 280ms cubic-bezier(.22,1,.36,1),visibility 280ms}
    #tuning-panel.open{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(0)}
    .tc-head{padding:26px 68px 20px 22px;border-bottom:1px solid var(--panel-divider);flex:none}.tc-eyebrow{margin:0 0 7px;color:rgba(167,180,204,.58);font-size:10px;font-weight:600;letter-spacing:.16em}.tc-title-line{display:flex;align-items:center;gap:10px}.tc-title{margin:0;color:var(--model-metal-bright);font-size:21px;font-weight:570;letter-spacing:.01em;line-height:1.25}.tc-count{margin-left:auto;padding:3px 7px;border:1px solid rgba(0,145,255,.24);border-radius:99px;background:var(--panel-accent-soft);color:rgba(151,201,244,.84);font-size:9px;white-space:nowrap}
    .tc-intro{margin:8px 0 0;color:var(--panel-text-soft);font-size:12px;line-height:1.65}.tc-intro b{font-weight:600;color:rgba(151,201,244,.84)}.tc-intro em{font-style:normal;color:rgba(236,190,130,.82)}
    .tc-tools{display:grid;grid-template-columns:1fr auto auto;gap:7px;margin-top:13px}.tc-search{min-width:0;height:var(--panel-field-height);box-sizing:border-box;border:1px solid var(--panel-card-border);border-radius:var(--panel-control-radius);background:var(--panel-control-bg);padding:0 11px;color:var(--panel-text-main);outline:none}.tc-search::placeholder{color:rgba(143,157,184,.46)}.tc-search:focus{border-color:rgba(194,203,219,.58);box-shadow:0 0 0 2px rgba(0,145,255,.16)}
    .tc-tool-btn,.tc-action{padding:0 11px;border:1px solid var(--panel-border);border-radius:var(--panel-control-radius);background:rgba(250,251,255,.06);color:rgba(218,225,238,.82);box-shadow:inset 0 1px 0 rgba(250,251,255,.055);cursor:pointer}.tc-tool-btn{height:var(--panel-field-height);font-size:11px}.tc-action{height:var(--panel-action-height);font-size:12px}.tc-tool-btn:hover,.tc-action:hover{border-color:rgba(250,251,255,.28);background:rgba(250,251,255,.11);color:#fff}.tc-search-meta{height:14px;margin-top:5px;color:rgba(143,157,184,.46);font-size:9px;text-align:right}
    .tc-refresh{margin:12px 20px 0;padding:9px 10px;border:1px solid rgba(226,154,70,.24);border-radius:9px;background:rgba(121,72,19,.18);color:rgba(241,188,120,.84);display:flex;align-items:center;gap:8px;flex:none}.tc-refresh[hidden]{display:none}.tc-refresh button{margin-left:auto;height:28px;border:1px solid rgba(235,166,79,.28);border-radius:7px;background:rgba(145,84,18,.28);color:#ffd194;cursor:pointer}
    .tc-scroll{min-height:0;flex:1;overflow:auto;padding:10px 20px 18px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(143,158,184,.36) transparent}.tc-theme-card{margin:8px 0 12px;padding:14px;border:1px solid var(--panel-border);border-radius:var(--panel-card-radius);background:linear-gradient(145deg,rgba(var(--theme-highlight-rgb),.1),rgba(var(--theme-highlight-rgb),.025) 52%),rgba(var(--theme-panel-rgb),.34);box-shadow:inset 0 1px 0 rgba(var(--theme-highlight-rgb),.1),0 12px 32px rgba(0,0,0,.14)}.tc-theme-head{display:flex;align-items:center;gap:8px}.tc-theme-title{margin:0;color:var(--panel-text-main);font-size:14px;font-weight:600}.tc-theme-badge{margin-left:auto;padding:3px 7px;border:1px solid var(--panel-border);border-radius:99px;color:var(--panel-text-soft);font-size:9px}.tc-theme-desc{margin:6px 0 11px;color:var(--panel-text-soft);font-size:10px;line-height:1.55}.tc-theme-controls{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:8px;align-items:center}.tc-theme-picker{width:42px;height:var(--panel-field-height);box-sizing:border-box;padding:3px;border:1px solid var(--panel-card-border);border-radius:8px;background:var(--panel-control-bg);cursor:pointer}.tc-theme-apply{height:var(--panel-field-height);padding:0 12px;border:1px solid var(--panel-border);border-radius:8px;background:var(--panel-text-main);color:rgb(var(--theme-panel-rgb));font-weight:650;cursor:pointer}.tc-theme-apply:hover{filter:brightness(1.08)}.tc-theme-foot{display:flex;margin-top:9px;align-items:center;justify-content:space-between;gap:10px}.tc-theme-reset{padding:0;border:0;background:transparent;color:var(--panel-text-soft);font-size:10px;cursor:pointer}.tc-theme-reset:hover{color:var(--panel-text-main)}.tc-theme-status{color:var(--panel-text-soft);font-size:9px}.tc-section{margin:8px 0;border:1px solid var(--panel-card-border);border-radius:var(--panel-card-radius);background:linear-gradient(145deg,rgba(var(--theme-highlight-rgb),.065),rgba(var(--theme-highlight-rgb),.016) 46%),rgba(var(--theme-panel-rgb),.3);box-shadow:inset 0 1px 0 rgba(250,251,255,.075),0 10px 28px rgba(0,0,0,.12);overflow:hidden}.tc-section[hidden]{display:none}.tc-section summary{display:flex;min-height:42px;padding:0 12px;align-items:center;gap:8px;list-style:none;cursor:pointer;user-select:none;color:rgba(235,239,248,.88);font-size:13px;font-weight:560}.tc-section summary::-webkit-details-marker{display:none}.tc-section summary:after{content:'›';margin-left:auto;color:rgba(143,157,184,.5);transform:rotate(90deg);transition:.15s transform}.tc-section:not([open]) summary:after{transform:rotate(0)}.tc-sec-count{font-size:9px;color:rgba(143,157,184,.46);font-weight:500}.tc-sec-desc{margin:-2px 12px 10px;color:rgba(150,163,187,.5);font-size:9.5px;line-height:1.55}
    .tc-param{position:relative;padding:11px 12px;border-top:1px solid var(--panel-divider);transition:.15s background}.tc-param[hidden]{display:none}.tc-param:hover{background:rgba(194,203,219,.055)}.tc-param.outside-soft{background:rgba(112,67,20,.14)}.tc-param-head{display:flex;align-items:center;gap:6px}.tc-label{min-width:0;flex:1;color:rgba(230,235,246,.86);font-size:11px}.tc-badge{padding:3px 7px;border-radius:99px;font-size:9px;line-height:1;letter-spacing:.04em;white-space:nowrap}.tc-badge.live{border:1px solid rgba(0,145,255,.24);background:var(--panel-accent-soft);color:rgba(151,201,244,.84)}.tc-badge.reload{border:1px solid rgba(226,154,70,.18);background:rgba(121,72,19,.18);color:rgba(239,182,111,.82)}.tc-reset-one{width:24px;height:24px;padding:0;border:0;border-radius:50%;background:transparent;color:rgba(143,157,184,.46);cursor:pointer}.tc-reset-one:hover{background:rgba(194,203,219,.1);color:rgba(238,242,250,.9)}.tc-desc{margin:4px 0 8px;color:rgba(150,163,187,.5);font-size:9.5px;line-height:1.5}.tc-key{display:block;margin-top:2px;color:rgba(126,142,170,.42);font:8.5px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
    .tc-number-controls{display:grid;grid-template-columns:minmax(0,1fr) 104px;gap:9px;align-items:center}.tc-range{width:100%;height:4px;margin:0;appearance:none;background:rgba(194,203,219,.22);border-radius:9px;outline:none}.tc-range::-webkit-slider-thumb{appearance:none;width:13px;height:13px;border:1px solid rgba(250,251,255,.72);border-radius:50%;background:var(--model-metal-mid);box-shadow:0 0 0 3px rgba(0,145,255,.1);cursor:pointer}.tc-number,.tc-hex{height:var(--panel-field-height);box-sizing:border-box;border:1px solid var(--panel-card-border);border-radius:7px;background:var(--panel-control-bg);padding:0 9px;color:var(--panel-text-main);font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none}.tc-number:hover,.tc-hex:hover{border-color:rgba(194,203,219,.3);background:var(--panel-control-hover)}.tc-number:focus,.tc-hex:focus{border-color:rgba(194,203,219,.58);box-shadow:0 0 0 2px rgba(0,145,255,.14)}.tc-soft{margin-top:5px;color:rgba(126,142,170,.42);font-size:8px}.outside-soft .tc-soft{color:rgba(220,157,86,.82)}
    .tc-color-controls{display:grid;grid-template-columns:42px 1fr;gap:9px}.tc-color{width:42px;height:var(--panel-field-height);box-sizing:border-box;border:1px solid var(--panel-card-border);border-radius:7px;background:var(--panel-control-bg);padding:3px;cursor:pointer}.tc-hex{width:100%}
    .tc-switch-wrap{display:flex;align-items:center;justify-content:space-between}.tc-switch{position:relative;width:38px;height:22px;flex:none}.tc-switch input{position:absolute;opacity:0}.tc-switch span{position:absolute;inset:0;border-radius:99px;background:rgba(126,142,170,.3);cursor:pointer;transition:.18s}.tc-switch span:after{content:'';position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:rgba(194,203,219,.62);transition:.18s}.tc-switch input:checked+span{background:rgba(0,112,200,.72)}.tc-switch input:checked+span:after{transform:translateX(16px);background:var(--model-metal-bright)}
    .tc-foot{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--panel-footer-gap);padding:14px 18px max(16px,env(safe-area-inset-bottom));border-top:1px solid var(--panel-divider);background:rgba(5,8,14,.42);backdrop-filter:blur(24px) saturate(130%);-webkit-backdrop-filter:blur(24px) saturate(130%);flex:none}.tc-action.danger{border-color:rgba(222,105,101,.2);color:rgba(244,170,166,.78);background:rgba(105,30,28,.18)}.tc-action.danger:hover{border-color:rgba(236,120,117,.38);background:rgba(126,39,36,.28);color:rgba(255,198,194,.94)}
    @media(max-width:680px){#tuning-toggle{top:max(76px,calc(env(safe-area-inset-top) + 62px));right:max(14px,env(safe-area-inset-right))}#tuning-toggle[aria-expanded="true"]{top:max(20px,env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right))}#tuning-panel{top:auto;left:0;right:0;bottom:0;width:100%;max-height:min(88dvh,760px);padding-top:0;border-top:1px solid var(--panel-border);border-left:0;border-radius:20px 20px 0 0;box-shadow:0 -24px 72px rgba(0,0,0,.62);transform:translateY(calc(100% + 24px))}#tuning-panel.open{transform:translateY(0)}.tc-head{padding:20px 64px 15px 18px}.tc-scroll{padding:8px 15px 18px}.tc-foot{padding-right:14px;padding-left:14px}.tc-number-controls{grid-template-columns:minmax(0,1fr) 96px}.tc-theme-controls{grid-template-columns:42px minmax(0,1fr)}.tc-theme-apply{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  const panelToggle = document.createElement('button');
  panelToggle.id = 'tuning-toggle';
  panelToggle.type = 'button';
  panelToggle.title = '打开效果控制台';
  panelToggle.setAttribute('aria-label', '打开效果控制台');
  panelToggle.setAttribute('aria-expanded', 'false');
  panelToggle.textContent = '⚙';

  const panel = document.createElement('aside');
  panel.id = 'tuning-panel';
  panel.setAttribute('aria-label', '效果参数控制台');
  panel.addEventListener('pointerenter', clearChartHover);
  panel.innerHTML = `
    <header class="tc-head">
      <p class="tc-eyebrow">VISUAL PARAMETERS</p>
      <div class="tc-title-line">
        <h2 class="tc-title">效果控制台</h2>
        <span class="tc-count">${allParams.length} 个参数</span>
      </div>
      <p class="tc-intro"><b>实时</b>参数立即更新；<em>刷新</em>参数先保存、刷新后重建。滑块是建议范围，数字框可直接越界输入。</p>
      <div class="tc-tools">
        <input class="tc-search" type="search" placeholder="搜索参数、说明或键名…" aria-label="搜索参数">
        <button class="tc-tool-btn" type="button" data-action="expand">展开</button>
        <button class="tc-tool-btn" type="button" data-action="collapse">折叠</button>
      </div>
      <div class="tc-search-meta">显示 ${allParams.length} / ${allParams.length}</div>
    </header>
    <div class="tc-refresh" hidden>
      <span>已修改需要重建的参数</span>
      <button type="button">立即刷新</button>
    </div>
  `;

  refreshHint = panel.querySelector('.tc-refresh');
  const scroll = document.createElement('div');
  scroll.className = 'tc-scroll';
  const sectionElements = [];
  const rowElements = [];

  const decimalsFor = (step) => {
    const text = String(step);
    if (text.includes('e-')) return Number(text.split('e-')[1]);
    return text.includes('.') ? text.split('.')[1].length : 0;
  };
  const formatNumber = (value, step) => {
    if (!Number.isFinite(Number(value))) return '';
    const digits = Math.min(8, Math.max(decimalsFor(step), 0));
    return String(Number(Number(value).toFixed(digits)));
  };
  const toHex = value => `#${(Number(value) >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

  function createResetButton(param, sync) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tc-reset-one';
    button.title = '恢复此参数默认值';
    button.setAttribute('aria-label', `恢复${param.label}默认值`);
    button.textContent = '↺';
    button.addEventListener('click', () => {
      const value = commitValue(param, readPath(param.key, true));
      sync(value);
    });
    return button;
  }

  function createParamRow(param, section) {
    const row = document.createElement('div');
    row.className = 'tc-param';
    row.dataset.paramKey = param.key;
    row.dataset.search = `${section.title} ${param.label} ${param.desc} ${param.key}`.toLowerCase();

    const head = document.createElement('div');
    head.className = 'tc-param-head';
    const label = document.createElement('span');
    label.className = 'tc-label';
    label.textContent = param.label;
    const badge = document.createElement('span');
    badge.className = `tc-badge ${param.mode}`;
    badge.textContent = param.mode === 'reload' ? '刷新' : '实时';
    head.append(label, badge);

    const description = document.createElement('p');
    description.className = 'tc-desc';
    description.innerHTML = `${param.desc}<span class="tc-key">${param.key}</span>`;

    if (param.type === 'number') {
      const controlsEl = document.createElement('div');
      controlsEl.className = 'tc-number-controls';
      const range = document.createElement('input');
      range.type = 'range';
      range.className = 'tc-range';
      range.step = String(param.step);
      range.setAttribute('aria-label', `${param.label}滑块`);
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'tc-number';
      input.step = String(param.step);
      input.setAttribute('aria-label', `${param.label}数值`);
      const soft = document.createElement('div');
      soft.className = 'tc-soft';
      soft.textContent = `建议滑块 ${param.min} ～ ${param.max} · 数字框不限软范围`;

      const sync = (value) => {
        const numeric = Number(value);
        range.min = String(Math.min(param.min, numeric));
        range.max = String(Math.max(param.max, numeric));
        range.value = String(numeric);
        input.value = formatNumber(numeric, param.step);
        row.classList.toggle('outside-soft', numeric < param.min || numeric > param.max);
      };
      head.appendChild(createResetButton(param, sync));
      range.addEventListener('input', () => sync(commitValue(param, range.value)));
      input.addEventListener('input', () => {
        if (input.value === '' || input.value === '-' || input.value === '.') return;
        const value = Number(input.value);
        if (Number.isFinite(value)) sync(commitValue(param, value));
      });
      input.addEventListener('blur', () => sync(commitValue(param, input.value)));
      sync(readPath(param.key));
      row.syncControl = sync;
      controlsEl.append(range, input);
      row.append(head, description, controlsEl, soft);
    } else if (param.type === 'color') {
      const controlsEl = document.createElement('div');
      controlsEl.className = 'tc-color-controls';
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'tc-color';
      picker.setAttribute('aria-label', `${param.label}颜色`);
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tc-hex';
      input.spellcheck = false;
      input.setAttribute('aria-label', `${param.label}十六进制颜色`);
      const sync = value => {
        const hex = toHex(value);
        picker.value = hex;
        input.value = hex.toUpperCase();
      };
      head.appendChild(createResetButton(param, sync));
      picker.addEventListener('input', () => {
        const value = parseInt(picker.value.slice(1), 16);
        sync(commitValue(param, value));
      });
      input.addEventListener('change', () => {
        const normalized = input.value.trim().replace(/^#/, '');
        if (/^[0-9a-f]{6}$/i.test(normalized)) sync(commitValue(param, parseInt(normalized, 16)));
        else sync(readPath(param.key));
      });
      sync(readPath(param.key));
      row.syncControl = sync;
      controlsEl.append(picker, input);
      row.append(head, description, controlsEl);
    } else {
      const switchLabel = document.createElement('label');
      switchLabel.className = 'tc-switch';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', param.label);
      const switchTrack = document.createElement('span');
      const sync = value => { checkbox.checked = Boolean(value); };
      head.appendChild(createResetButton(param, sync));
      checkbox.addEventListener('change', () => sync(commitValue(param, checkbox.checked)));
      sync(readPath(param.key));
      row.syncControl = sync;
      switchLabel.append(checkbox, switchTrack);
      const switchWrap = document.createElement('div');
      switchWrap.className = 'tc-switch-wrap';
      switchWrap.append(description, switchLabel);
      row.append(head, switchWrap);
    }

    rowElements.push(row);
    return row;
  }

  const themeCard = document.createElement('section');
  themeCard.className = 'tc-theme-card';
  themeCard.setAttribute('aria-label', '整体调色');
  themeCard.innerHTML = `
    <div class="tc-theme-head">
      <h3 class="tc-theme-title">整体调色</h3>
      <span class="tc-theme-badge">全局联动</span>
    </div>
    <p class="tc-theme-desc">选择一个主色，一键联动背景、液态金属雨、水面、雾霭、坐标轴与界面色彩，并自动保持明暗层次。</p>
    <div class="tc-theme-controls">
      <input class="tc-theme-picker" type="color" aria-label="整体主题颜色">
      <input class="tc-hex tc-theme-hex" type="text" spellcheck="false" aria-label="整体主题十六进制颜色">
      <button class="tc-theme-apply" type="button">应用到整体</button>
    </div>
    <div class="tc-theme-foot">
      <button class="tc-theme-reset" type="button">恢复黑色主题</button>
      <span class="tc-theme-status" aria-live="polite">当前 ${themeHexCss(globalThemeColor).toUpperCase()}</span>
    </div>
  `;
  scroll.appendChild(themeCard);

  const themePicker = themeCard.querySelector('.tc-theme-picker');
  const themeHexInput = themeCard.querySelector('.tc-theme-hex');
  const themeApplyButton = themeCard.querySelector('.tc-theme-apply');
  const themeResetButton = themeCard.querySelector('.tc-theme-reset');
  const themeStatus = themeCard.querySelector('.tc-theme-status');

  function syncThemeInputs(value) {
    const hex = themeHexCss(value);
    themePicker.value = hex;
    themeHexInput.value = hex.toUpperCase();
  }

  function syncAllParameterControls() {
    for (const row of rowElements) {
      if (typeof row.syncControl === 'function') {
        row.syncControl(readPath(row.dataset.paramKey));
      }
    }
  }

  function applyGlobalColor(value) {
    globalThemeColor = normalizeThemeHex(value);
    globalThemePalette = deriveGlobalTheme(globalThemeColor);
    applyGlobalThemeCss(globalThemePalette);
    applyGlobalThemePalette(globalThemePalette);

    for (const [path, nextValue] of Object.entries(globalThemeTuningValues(globalThemePalette))) {
      writePath(path, nextValue);
      applyLive(path, nextValue);
    }

    scene.fog.color.setHex(globalThemePalette.fog);
    persistNamespace('metalRain.darkColor');
    try {
      localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, themeHexCss(globalThemeColor));
    } catch {}

    rebuildRainfallSystems();
    state.readoutKey = '';
    updateDomState(true);
    syncThemeInputs(globalThemeColor);
    syncAllParameterControls();
    root.dataset.globalThemeColor = themeHexCss(globalThemeColor).toUpperCase();
    root.dataset.globalThemeLinkedLayers = 'background,rain,water,mist,axes,interface';
    panel.dataset.globalThemeColor = root.dataset.globalThemeColor;
    themeStatus.textContent = `已应用 ${root.dataset.globalThemeColor}`;
  }

  themePicker.addEventListener('input', () => {
    themeHexInput.value = themePicker.value.toUpperCase();
    themeStatus.textContent = '待应用';
  });
  themeHexInput.addEventListener('input', () => {
    const normalized = themeHexInput.value.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(normalized)) {
      themePicker.value = `#${normalized}`;
      themeStatus.textContent = '待应用';
    }
  });
  themeHexInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    themeApplyButton.click();
  });
  themeApplyButton.addEventListener('click', () => {
    const normalized = themeHexInput.value.trim().replace(/^#/, '');
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      syncThemeInputs(globalThemeColor);
      themeStatus.textContent = '请输入 6 位十六进制颜色';
      return;
    }
    applyGlobalColor(parseInt(normalized, 16));
  });
  themeResetButton.addEventListener('click', () => applyGlobalColor(0x000000));
  syncThemeInputs(globalThemeColor);
  root.dataset.globalThemeColor = themeHexCss(globalThemeColor).toUpperCase();
  root.dataset.globalThemeLinkedLayers = 'background,rain,water,mist,axes,interface';
  panel.dataset.globalThemeColor = root.dataset.globalThemeColor;

  for (const section of sections) {
    const details = document.createElement('details');
    details.className = 'tc-section';
    details.dataset.sectionId = section.id;
    details.open = Boolean(section.open);
    const summary = document.createElement('summary');
    summary.innerHTML = `<span>${section.icon}</span><span>${section.title}</span><span class="tc-sec-count">${section.params.length}</span>`;
    const sectionDescription = document.createElement('p');
    sectionDescription.className = 'tc-sec-desc';
    sectionDescription.textContent = section.desc;
    details.append(summary, sectionDescription);
    const sectionRows = [];
    for (const param of section.params) {
      const row = createParamRow(param, section);
      sectionRows.push(row);
      details.appendChild(row);
    }
    sectionElements.push({ details, rows: sectionRows });
    scroll.appendChild(details);
  }

  panel.appendChild(scroll);
  const footer = document.createElement('footer');
  footer.className = 'tc-foot';
  footer.innerHTML = `
    <button class="tc-action" type="button" data-action="copy">复制全部配置</button>
    <button class="tc-action danger" type="button" data-action="reset">恢复全部默认</button>
  `;
  panel.appendChild(footer);
  sceneToolbar.appendChild(panelToggle);
  document.body.appendChild(panel);

  const openPanel = (open) => {
    if (open) document.body.appendChild(panelToggle);
    panel.classList.toggle('open', open);
    panelToggle.setAttribute('aria-expanded', String(open));
    panelToggle.title = open ? '关闭效果控制台' : '打开效果控制台';
    panelToggle.setAttribute('aria-label', panelToggle.title);
    if (!open) sceneToolbar.appendChild(panelToggle);
  };
  panelToggle.addEventListener('click', () => openPanel(!panel.classList.contains('open')));
  document.addEventListener('pointerdown', (event) => {
    if (!panel.classList.contains('open')) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panel.contains(target) || panelToggle.contains(target)) return;
    openPanel(false);
  }, true);
  panel.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    openPanel(false);
    panelToggle.focus();
  });

  const search = panel.querySelector('.tc-search');
  const searchMeta = panel.querySelector('.tc-search-meta');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let visibleCount = 0;
    for (const section of sectionElements) {
      let sectionVisible = 0;
      for (const row of section.rows) {
        const visible = !query || row.dataset.search.includes(query);
        row.hidden = !visible;
        if (visible) {
          visibleCount += 1;
          sectionVisible += 1;
        }
      }
      section.details.hidden = sectionVisible === 0;
      if (query && sectionVisible) section.details.open = true;
    }
    searchMeta.textContent = `显示 ${visibleCount} / ${allParams.length}`;
  });

  panel.querySelector('[data-action="expand"]').addEventListener('click', () => {
    sectionElements.forEach(section => { if (!section.details.hidden) section.details.open = true; });
  });
  panel.querySelector('[data-action="collapse"]').addEventListener('click', () => {
    sectionElements.forEach(section => { section.details.open = false; });
  });
  refreshHint.querySelector('button').addEventListener('click', () => location.reload());

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  const copyButton = panel.querySelector('[data-action="copy"]');
  copyButton.addEventListener('click', async () => {
    const config = {
      theme: { color: themeHexCss(globalThemeColor) },
      tuning: TUNING,
      quality: QUALITY,
      features: FEATURES
    };
    try {
      await copyText(JSON.stringify(config, null, 2));
      const previous = copyButton.textContent;
      copyButton.textContent = '已复制 ✓';
      setTimeout(() => { copyButton.textContent = previous; }, 1500);
    } catch {
      copyButton.textContent = '复制失败';
    }
  });

  panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
    if (!confirm('恢复所有视觉、性能和图层参数为代码默认值？页面将刷新。')) return;
    localStorage.removeItem(STORAGE.tuning);
    localStorage.removeItem(STORAGE.quality);
    localStorage.removeItem(STORAGE.feature);
    localStorage.removeItem(GLOBAL_THEME_STORAGE_KEY);
    location.reload();
  });

  // 调试和自动化验证标记。
  panel.dataset.parameterCount = String(allParams.length);
  panel.dataset.refreshDirty = String(refreshDirty);
}
