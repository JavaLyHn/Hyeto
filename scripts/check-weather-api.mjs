// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
import assert from 'node:assert/strict';
import {
  PRECIPITATION_POINT_COUNT,
  WeatherError,
  reduceHourlySeries,
  geocodeCity,
  fetchTodayPrecipitation,
  fetchArchivePrecipitation,
  findWettestRecentDay
} from '../src/weather-api.js';

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

// Accepts either a thunk (called and awaited here) or an already-started promise,
// so it can check both a pre-aborted call and one aborted mid-flight.
async function expectAbortError(promiseOrThunk) {
  const promise = typeof promiseOrThunk === 'function' ? promiseOrThunk() : promiseOrThunk;
  try {
    await promise;
  } catch (error) {
    assert.equal(error.name, 'AbortError', `expected an AbortError, got ${error?.name}`);
    assert.ok(!(error instanceof WeatherError), 'a caller-initiated abort must not be reported as a WeatherError');
    return;
  }
  assert.fail('expected an AbortError');
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
  // Pinned to the exact parameter value, not a substring: 'language=zh-CN'
  // also `includes('language=zh')`, which is exactly the bug this project
  // shipped — a BCP 47 tag passed straight through to a parameter that wants
  // a bare ISO-639-1 subtag, silently returning zero results.
  assert.ok(/[?&]language=zh(?:&|$)/.test(fetchImpl.calls[0]),
    `expected an exact language=zh parameter, got ${fetchImpl.calls[0]}`);
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

// A signal that is already aborted before the call prevents the request entirely.
{
  const fetchImpl = fakeFetch();
  const controller = new AbortController();
  controller.abort();
  await expectAbortError(() => geocodeCity('shanghai', { signal: controller.signal, fetch: fetchImpl }));
  assert.equal(fetchImpl.calls.length, 0);
}

// A caller-initiated abort mid-flight surfaces as an AbortError, not a network WeatherError.
{
  const calls = [];
  const fetchImpl = (url, { signal } = {}) => {
    calls.push(String(url));
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    });
  };
  const controller = new AbortController();
  const promise = geocodeCity('shanghai', { signal: controller.signal, fetch: fetchImpl });
  controller.abort();
  await expectAbortError(promise);
  assert.equal(calls.length, 1);
}

// A rejection that is not caused by the caller's own signal aborting (this is how a
// genuine timeout — this function's own controller firing — looks from the outside)
// is still reported as 'network', never mistaken for a caller-initiated cancellation.
{
  const controller = new AbortController();
  const fetchImpl = async () => {
    throw new DOMException('The operation was aborted.', 'AbortError');
  };
  await expectAsyncCode('network', () =>
    geocodeCity('shanghai', { signal: controller.signal, fetch: fetchImpl }));
}

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
  // This day's non-null hours must peak above the intended winner (11) so
  // that deleting the null-skip guard below would actually change the
  // result: at the previous value (9, below 11) removing the guard was a
  // no-op and the assertion could not fail either way.
  push('2026-07-17', Array.from({ length: 24 }, (_, index) => (index === 5 ? null : 15)));
  push('2026-07-18', Array.from({ length: 24 }, (_, index) => (index === 9 ? 11 : 1)));
  // The scan's own last day — always the current local day in the real API —
  // is deliberately shorter than 24 hours here, so it is excluded from
  // competing and does not become `best` itself.
  push('2026-07-19', Array.from({ length: 6 }, () => 30));

  const fetchImpl = fakeFetch({ body: { timezone: 'Asia/Shanghai', hourly: { time: times, precipitation: amounts } } });
  const best = await findWettestRecentDay({ latitude: 31.23, longitude: 121.47, days: 60, fetch: fetchImpl });
  assert.equal(best.date, '2026-07-18');
  assert.equal(best.peak, 11);
  assert.equal(best.total, 34);
  assert.equal(best.isToday, false, 'the winner is not the payload\'s last date, so it must not be flagged as today');
  assert.ok(fetchImpl.calls[0].includes('past_days=60'));
}

// When the payload's own last date is the winner, it must be flagged so a
// caller can route it through the forecast path instead of the archive,
// which cannot serve the current day at all.
{
  const times = [];
  const amounts = [];
  const push = (date, hours) => {
    hours.forEach((value, index) => {
      times.push(`${date}T${String(index).padStart(2, '0')}:00`);
      amounts.push(value);
    });
  };
  push('2026-07-20', Array.from({ length: 24 }, () => 1));
  push('2026-07-21', Array.from({ length: 24 }, () => 20));

  const fetchImpl = fakeFetch({ body: { timezone: 'UTC', hourly: { time: times, precipitation: amounts } } });
  const best = await findWettestRecentDay({ latitude: 1, longitude: 1, fetch: fetchImpl });
  assert.equal(best.date, '2026-07-21');
  assert.equal(best.isToday, true);
}

// A dry window raises 'empty'.
{
  const times = Array.from({ length: 24 }, (_, index) => `2026-07-16T${String(index).padStart(2, '0')}:00`);
  const fetchImpl = fakeFetch({
    body: { timezone: 'UTC', hourly: { time: times, precipitation: times.map(() => 0) } }
  });
  await expectAsyncCode('empty', () => findWettestRecentDay({ latitude: 1, longitude: 1, fetch: fetchImpl }));
}

console.log('Weather API checks passed.');
