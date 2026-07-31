// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
import assert from 'node:assert/strict';
import { WeatherError } from '../src/weather-api.js';
import {
  MINIMUM_QUERY_LENGTH,
  describeCity,
  errorKeyFor,
  nextActiveIndex,
  composeStatus
} from '../src/weather-panel.js';

// Duplicate city names are distinguished by admin1.
assert.equal(
  describeCity({ name: '杭州', admin1: '浙江', country: '中国' }),
  '杭州 / 浙江 / 中国'
);
assert.equal(
  describeCity({ name: '杭州', admin1: '四川', country: '中国' }),
  '杭州 / 四川 / 中国'
);

// Missing parts collapse instead of leaving empty separators.
assert.equal(describeCity({ name: 'Shanghai', admin1: '', country: '' }), 'Shanghai');
assert.equal(describeCity({ name: 'Shanghai', admin1: '', country: 'China' }), 'Shanghai / China');

// Every error code maps to its own message key.
assert.equal(errorKeyFor(new WeatherError('network', 'x')), 'weatherErrorNetwork');
assert.equal(errorKeyFor(new WeatherError('notFound', 'x')), 'weatherErrorNotFound');
assert.equal(errorKeyFor(new WeatherError('empty', 'x')), 'weatherErrorEmpty');
assert.equal(errorKeyFor(new WeatherError('range', 'x')), 'weatherErrorRange');
assert.equal(errorKeyFor(new WeatherError('rateLimit', 'x')), 'weatherErrorRateLimit');
assert.equal(errorKeyFor(new WeatherError('shape', 'x')), 'weatherErrorShape');

// An unexpected failure still produces a usable message rather than blank text.
assert.equal(errorKeyFor(new TypeError('boom')), 'weatherErrorNetwork');
assert.equal(errorKeyFor(undefined), 'weatherErrorNetwork');

// Arrow keys wrap in both directions.
assert.equal(nextActiveIndex(0, 1, 3), 1);
assert.equal(nextActiveIndex(2, 1, 3), 0);
assert.equal(nextActiveIndex(0, -1, 3), 2);
assert.equal(nextActiveIndex(-1, 1, 3), 0);

// The search gate is two characters, so a single Chinese character never queries.
assert.equal(MINIMUM_QUERY_LENGTH, 2);

// The i18n helper is injected, so the test supplies a predictable stand-in.
const fakeI18n = (key, vars = {}) => {
  if (key === 'weatherLoaded') return `loaded ${vars.city} ${vars.date} ${vars.peak}`;
  if (key === 'weatherGaps') return `gaps ${vars.count}`;
  if (key === 'weatherNoRain') return 'no rain';
  return key;
};
const city = { name: 'Shanghai', admin1: '', country: 'China' };

// A normal load reports city, date and peak to one decimal place.
assert.equal(
  composeStatus(fakeI18n, city, { date: '2026-07-18', peak: 11, gaps: 0 }),
  'loaded Shanghai 2026-07-18 11.0'
);

// Missing hours are disclosed rather than silently zeroed out of sight.
assert.equal(
  composeStatus(fakeI18n, city, { date: '2026-07-18', peak: 4.25, gaps: 3 }),
  'loaded Shanghai 2026-07-18 4.3 · gaps 3'
);

// A dry day says so explicitly, so it cannot be mistaken for a failed load.
assert.equal(
  composeStatus(fakeI18n, city, { date: '2026-07-31', peak: 0, gaps: 0 }),
  'loaded Shanghai 2026-07-31 0.0 · no rain'
);

// Both notes can appear together.
assert.equal(
  composeStatus(fakeI18n, city, { date: '2026-07-31', peak: 0, gaps: 2 }),
  'loaded Shanghai 2026-07-31 0.0 · gaps 2 · no rain'
);

console.log('Weather panel checks passed.');
