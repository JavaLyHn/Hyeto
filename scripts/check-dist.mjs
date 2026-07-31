import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const details = await stat(absolute);
    if (details.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const files = await walk(dist);
const relativeFiles = files.map(file => path.relative(dist, file));
const requiredFiles = [
  'index.html',
  '_headers',
  'robots.txt',
  'favicon.png',
  'apple-touch-icon.png',
  'audio/rain-loop.m4a'
];

const uncompressedAudio = relativeFiles.filter(file => file.endsWith('.wav'));
if (uncompressedAudio.length) {
  throw new Error(`Ship compressed audio only; found ${uncompressedAudio.join(', ')}`);
}

for (const file of requiredFiles) {
  if (!relativeFiles.includes(file)) throw new Error(`Production output is missing ${file}.`);
}

const sourceMaps = relativeFiles.filter(file => file.endsWith('.map'));
if (sourceMaps.length) throw new Error(`Production source maps found: ${sourceMaps.join(', ')}`);

const textFiles = files.filter(file => /\.(?:html|css|js|txt)$/.test(file));
const text = (await Promise.all(textFiles.map(file => readFile(file, 'utf8')))).join('\n');

if (text.includes('sourceMappingURL=')) throw new Error('Production output references source maps.');
if (text.includes('tuning-panel')) throw new Error('Development tuning panel leaked into production output.');
if (!text.includes('PolyForm Noncommercial 1.0.0')) {
  throw new Error('Production output is missing the noncommercial license notice.');
}

console.log(`Distribution checks passed (${relativeFiles.length} files, no source maps or tuning console).`);
