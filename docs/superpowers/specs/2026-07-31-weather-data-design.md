# Weather data integration — design

Date: 2026-07-31
Status: implemented

## Goal

Let a viewer load real precipitation data into the scene, for both a live "today"
reading and any historical day, replacing the hand-authored demo curve.

Today the 25 hourly values are hardcoded in `src/main.js` as `defaultRainfall`,
and the only network requests in the whole app fetch the rain audio. Editing the
curve is deliberately session-only.

## Data source: Open-Meteo

Chosen because it needs no API key. That matters more than it sounds: the project
is a client-only static site with no server runtime and no secret environment
variables (`docs/ARCHITECTURE.md`). Any keyed provider — QWeather,
OpenWeatherMap — would either expose its key in the bundle or force a proxy,
which would destroy that property.

Open-Meteo's free tier is non-commercial and capped near 10,000 requests/day,
which aligns with this project's own PolyForm Noncommercial license.

Three hosts are used:

| Host | Purpose | Coverage (verified 2026-07-31) |
|---|---|---|
| `geocoding-api.open-meteo.com` | city search | Chinese names work with `language=zh` |
| `api.open-meteo.com` | today / forecast | current day onward |
| `archive-api.open-meteo.com` | historical days | 1940 through yesterday |

`precipitation` is returned in mm per hour, the same unit the scene already uses,
so no conversion is needed.

### Interface routing instead of timezone arithmetic

Local-timezone date math is the most error-prone part of this kind of feature, so
the design avoids it entirely. Both paths request two days and take the first 25
hourly points, which is exactly `D 00:00…23:00` plus `D+1 00:00`:

| User action | Host | Parameters |
|---|---|---|
| "Today, live" button | forecast | `forecast_days=2`, `timezone=auto` |
| A date `D` is chosen | archive | `start_date=D`, `end_date=D+1`, `timezone=auto` |

`timezone=auto` makes Open-Meteo resolve the zone from the coordinates, so the
returned timestamps are already local to the chosen city.

The "is this date today?" boundary is never computed. The archive holds data only
through yesterday, so a hand-typed (or spun past `max` with the date input's own
arrows) current date reaches the archive host anyway and is rejected outright —
HTTP 400, mapped by `requestJson`'s generic `!response.ok` branch to
`WeatherError('network')`, the same code an actual connectivity failure
produces. The viewer is told to check their network for a request that failed
only because of the date it named. Deterministic, and no timezone comparison.
(The "wettest recent day" shortcut cannot hit this wall through its own normal
operation: it routes a same-day result through the forecast path instead of the
archive — see Shortcuts, above.)

Coordinates snap to the model grid — requesting `31.2304, 121.4737` returns
`31.2478, 121.5`. These are gridded forecast values at roughly 11 km resolution,
not station observations. Acceptable for a visualisation; the docs should not
describe them as measurements.

## Architecture

Two new modules, chosen so the network layer can be understood and tested without
a DOM and the panel can be understood without knowing any API shape. `src/main.js`
is already 7387 lines; this feature adds no significant weight to it.

### `src/weather-api.js` — no DOM access

```js
export class WeatherError extends Error {}
// .code: 'network' | 'notFound' | 'empty' | 'range' | 'rateLimit' | 'shape'

export function geocodeCity(query, { language, signal })
  → Promise<Array<{ id, name, admin1, country, latitude, longitude }>>

export function fetchTodayPrecipitation({ latitude, longitude, signal })
  → Promise<Result>

export function fetchArchivePrecipitation({ latitude, longitude, date, signal })
  → Promise<Result>

export function findWettestRecentDay({ latitude, longitude, days = 60, signal })
  → Promise<{ date, peak, total, isToday }>

// Result = {
//   values: number[25],
//   meta: {
//     date: string,              // resolved local date of the first point, YYYY-MM-DD
//     source: 'forecast' | 'archive',
//     timezone: string,          // as resolved by timezone=auto
//     peak: number,              // max of values, mm/h
//     gaps: number               // how many of the 25 points were null and became 0
//   }
// }
```

`geocodeCity` defaults `language` to the app's current locale, so a Chinese UI gets
Chinese place names and an English UI gets English ones.

`fetch` is injectable so the validation script can drive it without network access.
Every call accepts an `AbortSignal` and carries a 10-second timeout; Open-Meteo
normally responds inside a second.

`findWettestRecentDay` calls the forecast host with `past_days=60&forecast_days=1`,
groups by local date, keeps only complete 24-hour days, and returns the day with
the highest peak. `forecast_days=1` always appends exactly one more day beyond
the `past_days` history, and that day is the current local one — a complete,
eligible 24-hour day as far as this scan can tell, even though the archive host
(below) cannot serve it at all. `isToday` is `true` exactly when the winning day
is that appended day, identified by comparing against the payload's own last
date rather than a real clock, so callers can route it around the archive.

### `src/weather-panel.js` — no `fetch` access

```js
export function createWeatherPanel({ mount, api, i18n, onApply, setStatus, setError })
  → { destroy() }
```

Everything is injected and the panel owns only the `mount` subtree. It never
queries `#rainfall-editor-status` or `#rainfall-editor-errors` directly — it
writes through `setStatus` / `setError`, so `main.js` can change those elements
without touching the panel.

`i18n` must be injected rather than imported. `scripts/check-project.mjs` parses
the `messages` object out of `src/main.js` by literal indentation markers
(`  'zh-CN': {`, `  en: {`, closing `\n  }\n};`) to enforce Chinese/English key
parity, so all new copy has to live in `main.js` to stay covered by that gate.
Injection also keeps the dependency direction one-way and avoids a circular import.

New keys must be plain alphanumeric identifiers at four-space indentation, matching
the validator's `^\s{4}([A-Za-z][A-Za-z0-9]*):` pattern. Values may be strings or
interpolation arrow functions, as `dataLengthError` already is. 19 new keys were
needed, in both locale blocks, bringing the project total to 71 complete
translation keys per locale. Eighteen of those cover the panel's own labels,
statuses and error messages. The nineteenth, `weatherErrorNoCity`, was added
during implementation: the no-city-selected path (a shortcut or the date input
used before any city had been chosen) had been reusing `weatherErrorNotFound`,
which told the viewer their search had matched nothing when no search had
happened at all.

## UI

A new "weather data" section at the top of the existing rainfall editor dialog,
above the draggable chart. This reuses the dialog, its scroll container, its
`aria-live="polite"` status region and its `role="alert"` error region, and adds
no new focus trap, `inert` handling or mobile layout work.

- **City search** — 300 ms debounce, minimum two characters. Results show
  `name / admin1 / country`, which is required for disambiguation: 杭州 matches
  both 浙江 and 四川. Keyboard: arrows to move, Enter to select, Escape to close.
  ARIA combobox pattern with `role="listbox"`, `role="option"` and
  `aria-activedescendant`.
- **Date input** — `<input type="date">` with `max` set to the browser-local
  yesterday. This is an input affordance only; the authoritative check is the
  API's `empty` response, so a one-day skew across timezones is harmless.
- **Shortcuts** — "Today, live" goes straight to the forecast path. "Wettest
  recent day" resolves a date via `findWettestRecentDay`. When the winner is a
  genuinely historical day it loads through the archive path and fills the date
  input only once that load has succeeded — never before, since a failed load
  must not leave the input showing a date whose data was never applied. When the
  winner is `isToday`, it instead loads through the forecast path, exactly like
  "Today, live", and leaves the date input empty; the archive host has no data
  for the current day at all, so routing it there would trade a good result for
  a guaranteed failure. The second shortcut exists because picking an arbitrary
  historical date usually lands on light or no rain.
- **Concurrency** — the panel keeps two independent `AbortController`s, not one:
  a search controller, aborted whenever the suggestion list is dismissed or a
  new search supersedes it, and a load controller, aborted only when a newer
  precipitation load supersedes it. These must stay separate. An earlier
  version shared a single controller between the city search and the
  precipitation load; dismissing the suggestion list then aborted an
  in-flight load, and the load's own cleanup skipped re-enabling its
  controls because it read the shared controller's abort state, leaving
  every load control permanently disabled with the status stuck on
  "loading". Do not simplify this back into one controller. Because a
  controller reports itself as aborted the instant anything cancels it —
  indistinguishable, from the signal alone, between "superseded" and
  "aborted for some unrelated reason" — currency is checked instead as an
  identity comparison against the panel's current load controller, never by
  inspecting the signal's own `aborted` state. Buttons disable while loading.
- **After a successful load** — the status region shows city, date and peak, and
  the curve stays fully draggable. It is never locked. When `meta.gaps > 0` the
  status appends a note that N hours were missing.

## Data lifecycle

The curve itself is never persisted, preserving the upstream decision recorded at
`src/main.js:221-222`: every reload starts from the built-in curve so a stale
browser value cannot override the demo.

`localStorage` stores only the last selected city under `rf-weather-city`, matching
the existing `rf-quality` / `rf-features` prefix.

### Startup sequence

```
1. Page boots on the default curve with zero network dependency; scene renders.
2. Once the scene is ready, if rf-weather-city exists, fire an asynchronous
   "today, live" request. It must never block or delay boot.
3. Success, peak > 0  → applyRainfallData(values); status shows city / date / peak.
4. Success, peak == 0 → leave the default curve in place; status notes that there
                        was no rain and default data is shown.
5. Failure            → leave the default curve in place; the editor toolbar
                        button shows a failure marker and the error region carries
                        the message.
```

Steps 4 and 5 leave the curve alone rather than reverting anything: the scene is
still showing the default curve from step 1, so no replacement ever happens. This
is distinct from the manual path, where a failed load must not disturb a dataset
the user already has on screen.

The toolbar failure marker is a `data-*` attribute on the editor toggle button,
following the existing `root.dataset.appState` convention, styled in `styles.css`
rather than driven by inline style changes.

Step 5's message is deliberately retained across the editor's own reopen
behaviour, and this is not incidental. Opening the rainfall editor already calls
`syncInputs` for its own reasons — populating the number inputs and chart from
`activeRainfall` — and `syncInputs` unconditionally clears the error region. Left
alone, that means the toolbar's failure marker invites the viewer to open the
panel and read why the load failed, and opening the panel is exactly what
destroys that explanation. The wiring keeps the last weather error message
aside and re-asserts it into the error region immediately after `syncInputs`
runs, every time the editor opens, until a later load succeeds and clears the
message and the marker together. Do not remove the reassertion as apparently
redundant with `syncInputs`; it exists because of `syncInputs`, not despite it.

A stored city is validated on read: if `rf-weather-city` is missing any of
`name`, `latitude` or `longitude`, or the coordinates are not finite numbers, the
entry is discarded and startup proceeds as if no city were saved. This keeps an
older or hand-edited value from breaking boot.

Step 2's non-blocking requirement protects the boot work already landed in
`7826eec`, which took first-load transfer from roughly 1755 KB to 284 KB by
overlapping the audio and scene downloads. A blocking weather request would give
that back.

Known cost: swapping the dataset runs `rebuildRainfallSystems()`, which recreates
the axis, rain chains, waterfall, glints and mist. That produces a visible rebuild
roughly a second after load. It is the same code path as a manual apply, so the
cost is pre-existing, but automatic triggering makes it visible to first-time
viewers. No transition animation is in scope.

### Deliberate asymmetry on dry days

This is intentional and should not be filed as a bug:

| Path | Peak is 0 | Reasoning |
|---|---|---|
| Manual "today, live" | apply the empty scene, note it | the user explicitly asked for that day's truth |
| Automatic on startup | keep the default curve, note it | do not let the weather decide the artwork's first impression |

Magnitudes are never normalised or rescaled. The axis displays real mm/h, so
scaling the values would make those numbers false. Light rain renders as light
rain: `rainCapacityResponse` is `0.05 + (max/10)^0.62 × 0.95`, so a 0.2 mm/h peak
still yields about 14% of particle capacity rather than nothing. Only an exact
zero reaches the existing `dry` branch and empties the scene. Viewers who want
heavy rain use a historical day.

Measured for Shanghai over 61 days: 11 days (18%) were completely dry and only 9
days peaked at or above 5 mm/h.

## Error handling

| `code` | Trigger | Message intent |
|---|---|---|
| `network` | fetch failure, timeout, CSP block, or a same-day archive request (a hand-typed or spun-past-`max` current date; see Routing, above) | cannot reach the weather service, check the network |
| `notFound` | geocoding returned nothing | city not found |
| `empty` | all 25 points null — a genuine data gap, not a same-day request, which reaches `network` instead (see above) | no data for that date, try "today, live" |
| `range` | the date is not in `YYYY-MM-DD` form | the date must be formatted correctly |
| `rateLimit` | HTTP 429 | too many requests, try again later |
| `shape` | the payload is malformed or has fewer than 25 points | the weather service returned unrecognisable data |

`range` is a local format check, not a range check, despite its name: it is
`nextCalendarDay`'s regex guard rejecting a string that isn't `YYYY-MM-DD`,
which the date input's own `type="date"` makes hard to reach by hand. A
well-formatted but genuinely out-of-range date — `1900-01-01`, decades before
the archive begins — passes that regex, reaches the archive host, and comes
back as a non-200, non-429 response. `requestJson`'s generic `!response.ok`
branch then maps it to `WeatherError('network')`, indistinguishable from an
actual connectivity failure. Do not add local range validation to make
`range` fire for this case — that is out of scope here, and the code's
current behaviour is not a bug, only under-described. A UI that keys "pick a
date after 1940" prompting on `code === 'range'` would never fire it; the
viewer is told to check their network instead.

(`nextCalendarDay` has a second, dead `range` throw guarding
`!Number.isFinite(stamp)` after the regex has already matched: `Date.UTC`
cannot produce a non-finite result for any 4-digit-year input the regex
accepts, so this branch is unreachable. Harmless, but worth knowing before
relying on it.)

This table is not the full set of ways a request can end. A caller-initiated
abort — the panel superseding its own in-flight search or load — propagates the
original `AbortError`, not a `WeatherError`, and is never reported through
`setError`; the panel simply discards the stale response. Only the module's own
10-second timeout produces `WeatherError('network')`. A caller must therefore
distinguish "I cancelled this" from "the network failed" by consulting its own
signal's state, never by inspecting the error object it receives, since the two
cases are not distinguishable from the error alone.

Any failure leaves whatever curve is on screen untouched and writes only to the
error region. A failed load never replaces a dataset the viewer already loaded,
and never substitutes the default curve for one, because the viewer must be able
to tell "the load failed" apart from "it genuinely did not rain".

Null handling is deliberately strict on one side: 25 nulls raise `empty` rather
than rendering as a dry day, since a data gap presented as a real clear day would
be fabricated data. Partial nulls become zeros but increment `meta.gaps`, which the
panel surfaces.

## Validation

The project has no test framework — `npm run check` is static validation only, and
introducing vitest or jest is a separate decision, out of scope here.

Instead, `weather-api.js` takes an injectable `fetch`, and a new
`scripts/check-weather-api.mjs` drives it with Node's assert module and no network,
wired into `npm run check`:

- 48 returned points reduce to the first 25
- all-null input raises `empty`
- partial nulls become zeros and `meta.gaps` counts them correctly
- a series whose length is not 25 raises an error
- HTTP 429 raises `rateLimit`
- empty geocoding results raise `notFound`

`weather-panel.js`'s own pure decisions — city-label formatting, the error-code
to i18n-key mapping, arrow-key index wrapping, the loaded/gaps/dry status line,
the locale-to-ISO-639-1 reduction for the geocoding `language` parameter, and the
request-currency identity comparison — are asserted the same way, with no DOM
and a fake `i18n`, by `scripts/check-weather-panel.mjs`, also wired into
`npm run check`.

Panel *interaction* — typing, debounce timing, keyboard behaviour, and the
concurrency guarantees that are not expressible as a pure function — is verified
against a real DOM instead of by hand. `probe/weather-panel.html` mounts the
panel with a fake `api` and drives it with dispatched events, setting a
`data-probe` attribute once every check has run. `scripts/check-weather-dom.mjs`
serves that page from a throwaway local Vite instance, loads it in headless
Chrome, and reads the attribute back. This needs a real browser and a bound
port, which `npm run check` must not depend on, so it is wired into the separate
opt-in `npm run check:dom` instead.

`check-dist.mjs` needs no change: the new modules bundle into the existing chunk
and add no assets.

## Files

| File | Change |
|---|---|
| `src/weather-api.js` | new — network layer |
| `src/weather-panel.js` | new — panel layer |
| `src/main.js` | 19 bilingual i18n keys, ~20 lines of wiring |
| `index.html` | container for the new editor section |
| `src/styles.css` | panel styles following the `rainfall-editor__*` convention |
| `public/_headers` | three Open-Meteo hosts added to `connect-src` |
| `scripts/check-weather-api.mjs` | new — pure-logic assertions for `weather-api.js` |
| `scripts/check-weather-panel.mjs` | new — pure-logic assertions for `weather-panel.js` |
| `probe/weather-panel.html` | new — real-DOM harness for the panel, driven by a fake `api` |
| `scripts/check-weather-dom.mjs` | new — headless-Chrome runner for the probe, opt-in via `check:dom` |
| `package.json` | `check` runs the new pure-logic scripts; `check:dom` runs the probe separately |
| `THIRD_PARTY_NOTICES.md` | Open-Meteo data attribution |
| `README.md` | describe the feature and its data source |

`connect-src` is currently `'self' https://cloudflareinsights.com`. Without the
three additions every request is blocked by the browser before it leaves the page.

## Out of scope

- A model selector. `models=cma_grapes_global` (China Meteorological
  Administration) was verified to work, but the default blended best-match is
  sufficient.
- Relaxing `Permissions-Policy: geolocation=()`. Browser geolocation stays off;
  the city search replaces it.
- Saved cities or multi-city comparison.
- A test framework.
- A transition animation for dataset swaps.

## Risks the author must confirm

1. **Reachability of `*.open-meteo.com` from mainland China.** This was not
   verified — the development network is not representative. If the audience is
   primarily in China, test before shipping. The fallback, a keyed Chinese
   provider behind a proxy, would break the no-server architecture.
2. **The ~10,000 requests/day free-tier cap.** Automatic startup loading means
   every visit with a saved city issues requests.
