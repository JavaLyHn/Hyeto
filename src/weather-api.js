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
