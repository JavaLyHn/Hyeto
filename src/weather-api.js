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
