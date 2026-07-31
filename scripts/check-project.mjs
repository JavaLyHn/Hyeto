import { readFile, access } from 'node:fs/promises';

const requiredFiles = [
  'LICENSE',
  'NOTICE.md',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'index.html',
  'public/_headers',
  'public/robots.txt',
  'src/bootstrap.js',
  'src/main.js',
  'src/styles.css',
  'vite.config.js'
];

for (const file of requiredFiles) {
  await access(file);
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if (packageJson.name !== 'hyeto') throw new Error('package.json name must remain "hyeto".');
if (packageJson.license !== 'PolyForm-Noncommercial-1.0.0') {
  throw new Error('package.json must declare PolyForm-Noncommercial-1.0.0.');
}
if (packageJson.private !== true) {
  throw new Error('Hyeto must be marked private to prevent accidental npm publication.');
}

const mainSource = await readFile('src/main.js', 'utf8');
const bootstrapSource = await readFile('src/bootstrap.js', 'utf8');
const viteSource = await readFile('vite.config.js', 'utf8');
const html = await readFile('index.html', 'utf8');

if (!mainSource.includes('const ENABLE_TUNING_CONSOLE = import.meta.env.DEV;')) {
  throw new Error('The visual tuning console must remain development-only.');
}
if (!viteSource.includes('sourcemap: false')) {
  throw new Error('Production source maps must remain disabled.');
}
if (!mainSource.includes('Required Notice: Rainform / 数据成雨')) {
  throw new Error('src/main.js is missing the required copyright notice.');
}
if (!bootstrapSource.includes('Required Notice: Rainform / 数据成雨')) {
  throw new Error('src/bootstrap.js is missing the required copyright notice.');
}
if (!html.includes('PolyForm Noncommercial 1.0.0')) {
  throw new Error('index.html is missing the source license notice.');
}

// The development-only tuning toggle is injected as a fixed-position control. It
// must not share the scene toolbar's corner offset, or it renders underneath the
// editor and sound buttons and is unreachable in dev.
const styles = await readFile('src/styles.css', 'utf8');

function declaredTop(source, ruleStart) {
  const start = source.indexOf(ruleStart);
  if (start === -1) throw new Error(`Could not find the CSS rule ${ruleStart}`);
  const body = source.slice(start, source.indexOf('}', start));
  const top = /top:\s*([^;}]+)/.exec(body);
  if (!top) throw new Error(`${ruleStart} declares no top offset.`);
  return top[1].replace(/\s+/g, '');
}

const toolbarTop = declaredTop(styles, '.scene-toolbar {');
const tuningTop = declaredTop(mainSource, '#tuning-toggle{position');
if (toolbarTop === tuningTop) {
  throw new Error(
    `The tuning toggle overlaps the scene toolbar: both declare top: ${toolbarTop}. `
    + 'Offset the development-only toggle so it clears the toolbar.'
  );
}

function objectKeys(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1) throw new Error(`Could not inspect translations around ${startMarker}.`);
  return [...source.slice(start, end).matchAll(/^\s{4}([A-Za-z][A-Za-z0-9]*):/gm)]
    .map(match => match[1])
    .sort();
}

const zhKeys = objectKeys(mainSource, "  'zh-CN': {", '  en: {');
const enKeys = objectKeys(mainSource, '  en: {', '\n  }\n};');
if (zhKeys.join('\n') !== enKeys.join('\n')) {
  const onlyZh = zhKeys.filter(key => !enKeys.includes(key));
  const onlyEn = enKeys.filter(key => !zhKeys.includes(key));
  throw new Error(`Translation keys differ. zh-only: ${onlyZh.join(', ')}; en-only: ${onlyEn.join(', ')}`);
}

const bootstrapZhKeys = objectKeys(bootstrapSource, "  'zh-CN': {", '  en: {');
const bootstrapEnKeys = objectKeys(bootstrapSource, '  en: {', '\n  }\n};');
if (bootstrapZhKeys.join('\n') !== bootstrapEnKeys.join('\n')) {
  throw new Error('Bootstrap translation keys differ between Chinese and English.');
}

console.log(`Project checks passed (${zhKeys.length} complete translation keys per locale).`);
