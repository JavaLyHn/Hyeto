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
