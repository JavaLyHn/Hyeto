// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/
//
// Generates the bundled rain loop entirely from deterministic synthesis.
// No recording, music track, sample library or third-party audio is used.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 22_050;
const durationSeconds = 12;
const sampleCount = sampleRate * durationSeconds;
const samples = new Float64Array(sampleCount);
let randomState = 0x7261696e;

function random() {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 0x1_0000_0000;
}

let softBand = 0;
let deepBand = 0;
let previousWhite = 0;
let nextDropAt = 0;
let dropPhase = 0;
let dropDecay = 0;
let dropFrequency = 0;

for (let index = 0; index < sampleCount; index += 1) {
  const white = random() * 2 - 1;
  softBand += (white - softBand) * 0.075;
  deepBand += (white - deepBand) * 0.004;
  const fineRain = white * 0.42 + (white - previousWhite) * 0.16;
  const body = (softBand - deepBand) * 0.9 + deepBand * 0.38;
  previousWhite = white;

  if (index >= nextDropAt) {
    dropPhase = 0;
    dropDecay = 1;
    dropFrequency = 1_600 + random() * 3_600;
    nextDropAt = index + Math.floor(sampleRate * (0.018 + random() * 0.085));
  }

  const drop = Math.sin(dropPhase) * dropDecay;
  dropPhase += Math.PI * 2 * dropFrequency / sampleRate;
  dropDecay *= 0.982;

  const slowPulse = 0.88
    + Math.sin(Math.PI * 2 * index / sampleCount * 5) * 0.06
    + Math.sin(Math.PI * 2 * index / sampleCount * 11 + 0.7) * 0.04;
  samples[index] = (fineRain * 0.12 + body * 0.17 + drop * 0.035) * slowPulse;
}

// Blend the tail into the beginning so looping is free of an audible seam.
const crossfadeSamples = Math.floor(sampleRate * 0.45);
for (let offset = 0; offset < crossfadeSamples; offset += 1) {
  const mix = (offset + 1) / crossfadeSamples;
  const tailIndex = sampleCount - crossfadeSamples + offset;
  samples[tailIndex] = samples[tailIndex] * (1 - mix) + samples[offset] * mix;
}

const bytesPerSample = 2;
const dataSize = sampleCount * bytesPerSample;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * bytesPerSample, 28);
wav.writeUInt16LE(bytesPerSample, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const clamped = Math.max(-1, Math.min(1, samples[index]));
  wav.writeInt16LE(Math.round(clamped * 32_767), 44 + index * bytesPerSample);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../public/audio/rain-loop.wav');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, wav);
console.log(`Generated ${outputPath} (${durationSeconds}s, ${sampleRate} Hz, mono PCM).`);
