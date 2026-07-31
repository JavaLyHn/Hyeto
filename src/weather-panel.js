// Hyeto — Copyright © 2026 JavaLyHn. PolyForm Noncommercial 1.0.0.
// Rain visualization derived from Rainform / 数据成雨 by afterimage
// Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/

const SEARCH_DEBOUNCE_MS = 300;

export const MINIMUM_QUERY_LENGTH = 2;

const ERROR_KEYS = {
  network: 'weatherErrorNetwork',
  notFound: 'weatherErrorNotFound',
  empty: 'weatherErrorEmpty',
  range: 'weatherErrorRange',
  rateLimit: 'weatherErrorRateLimit',
  shape: 'weatherErrorShape'
};

// Both duplicate-name cities and sparsely populated results have to read cleanly,
// so empty parts collapse rather than leaving stray separators.
export function describeCity(city) {
  return [city.name, city.admin1, city.country].filter(Boolean).join(' / ');
}

// An unrecognised failure must still produce a message the viewer can act on.
export function errorKeyFor(error) {
  return ERROR_KEYS[error?.code] ?? 'weatherErrorNetwork';
}

export function nextActiveIndex(current, step, length) {
  if (length <= 0) return -1;
  return (current + step + length) % length;
}

// A superseded request must not run its own completion side effects (status
// text, re-enabling controls) — only the invocation that is still the most
// recently issued one may. Deliberately independent of AbortSignal state: a
// request's own controller reports itself as aborted the instant it is
// cancelled, which is indistinguishable from "aborted because a newer one
// replaced it" and "aborted for some unrelated reason" without this check.
// Kept pure and exported so the comparison itself is assertable without a
// DOM or a real AbortController.
export function isLatestRequest(token, latestToken) {
  return token === latestToken;
}

// Kept pure and exported so the status line's rules are assertable: a dry day
// must announce itself, and dropped hours must be disclosed rather than being
// silently zeroed and looking like real weather.
export function composeStatus(i18n, city, meta) {
  const parts = [i18n('weatherLoaded', {
    city: city.name,
    date: meta.date,
    peak: meta.peak.toFixed(1)
  })];
  if (meta.gaps > 0) parts.push(i18n('weatherGaps', { count: meta.gaps }));
  if (meta.peak === 0) parts.push(i18n('weatherNoRain'));
  return parts.join(' · ');
}

export function createWeatherPanel({ mount, api, i18n, onApply, setStatus, setError }) {
  let searchTimer = 0;
  // `pending` and `activeLoad` are deliberately separate: the city search and
  // the precipitation load are independent request lifecycles that happen to
  // share this panel. Dismissing the suggestion list must not cancel an
  // in-flight load, and starting a load must not cancel a city search — a
  // single shared controller previously conflated the two, so cancelling
  // either one could abort the other and leave its controls stuck disabled.
  let pending = null;
  let activeLoad = null;
  let results = [];
  let activeIndex = -1;
  let selectedCity = null;

  mount.innerHTML = `
    <div class="weather-panel__heading"><h2 data-weather="title"></h2></div>
    <label class="weather-panel__field">
      <span data-weather="cityLabel"></span>
      <input
        type="text"
        class="weather-panel__input"
        data-weather="city"
        role="combobox"
        aria-expanded="false"
        aria-autocomplete="list"
        aria-controls="weather-panel-results"
        autocomplete="off"
      />
    </label>
    <ul id="weather-panel-results" class="weather-panel__results" role="listbox" hidden></ul>
    <label class="weather-panel__field">
      <span data-weather="dateLabel"></span>
      <input type="date" class="weather-panel__date" data-weather="date" />
    </label>
    <div class="weather-panel__actions">
      <button type="button" class="weather-panel__button" data-weather="today"></button>
      <button type="button" class="weather-panel__button" data-weather="wettest"></button>
    </div>
  `;

  const title = mount.querySelector('[data-weather="title"]');
  const cityLabel = mount.querySelector('[data-weather="cityLabel"]');
  const cityInput = mount.querySelector('[data-weather="city"]');
  const resultList = mount.querySelector('#weather-panel-results');
  const dateLabel = mount.querySelector('[data-weather="dateLabel"]');
  const dateInput = mount.querySelector('[data-weather="date"]');
  const todayButton = mount.querySelector('[data-weather="today"]');
  const wettestButton = mount.querySelector('[data-weather="wettest"]');

  title.textContent = i18n('weatherTitle');
  cityLabel.textContent = i18n('weatherCityLabel');
  cityInput.placeholder = i18n('weatherCityPlaceholder');
  dateLabel.textContent = i18n('weatherDateLabel');
  todayButton.textContent = i18n('weatherToday');
  wettestButton.textContent = i18n('weatherWettest');

  // The archive holds data only through yesterday. This max is an input
  // affordance, not the authoritative check — that is the 'empty' error — so a
  // one-day skew between the browser's zone and the city's is harmless.
  const yesterday = new Date(Date.now() - 86_400_000);
  dateInput.max = yesterday.toISOString().slice(0, 10);

  // Distinct from 'weatherErrorNotFound': that key means a search ran and
  // matched nothing. Here no search has necessarily happened at all — a
  // shortcut or the date field was used before any city was chosen — so it
  // must not be misread as a failed search.
  function requireCity() {
    if (selectedCity) return selectedCity;
    setError(i18n('weatherErrorNoCity'));
    return null;
  }

  function busy(isBusy) {
    todayButton.disabled = isBusy;
    wettestButton.disabled = isBusy;
    dateInput.disabled = isBusy;
  }

  function announce(city, result) {
    setStatus(composeStatus(i18n, city, result.meta));
  }

  async function run(task) {
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    setError('');
    setStatus(i18n('weatherLoading'));
    busy(true);
    try {
      const result = await task(controller.signal);
      return isLatestRequest(controller, activeLoad) ? result : null;
    } catch (error) {
      if (!isLatestRequest(controller, activeLoad)) return null;
      setStatus('');
      reportError(error);
      return null;
    } finally {
      if (isLatestRequest(controller, activeLoad)) busy(false);
    }
  }

  async function loadToday(city) {
    const target = city ?? requireCity();
    if (!target) return false;
    const result = await run(signal => api.fetchTodayPrecipitation({
      latitude: target.latitude,
      longitude: target.longitude,
      signal
    }));
    if (!result) return false;
    onApply(result.values, result.meta);
    announce(target, result);
    return true;
  }

  async function loadDate(date) {
    const target = requireCity();
    if (!target || !date) return false;
    const result = await run(signal => api.fetchArchivePrecipitation({
      latitude: target.latitude,
      longitude: target.longitude,
      date,
      signal
    }));
    if (!result) return false;
    onApply(result.values, result.meta);
    announce(target, result);
    return true;
  }

  todayButton.addEventListener('click', () => {
    dateInput.value = '';
    loadToday();
  });

  dateInput.addEventListener('change', () => {
    if (dateInput.value) loadDate(dateInput.value);
  });

  wettestButton.addEventListener('click', async () => {
    const target = requireCity();
    if (!target) return;
    const best = await run(signal => api.findWettestRecentDay({
      latitude: target.latitude,
      longitude: target.longitude,
      signal
    }));
    if (!best) return;
    dateInput.value = best.date;
    await loadDate(best.date);
  });

  mount.addEventListener('weather-city-selected', () => {
    dateInput.value = '';
  });

  function reportError(error) {
    setError(i18n(errorKeyFor(error)));
  }

  // Closing the list also abandons any in-flight search: otherwise a request the
  // user has already dismissed (or acted past) can resolve later and repaint a
  // dropdown they no longer expect to see.
  function closeResults() {
    pending?.abort();
    pending = null;
    results = [];
    activeIndex = -1;
    resultList.replaceChildren();
    resultList.hidden = true;
    cityInput.setAttribute('aria-expanded', 'false');
    cityInput.removeAttribute('aria-activedescendant');
  }

  function paintActive() {
    [...resultList.children].forEach((node, index) => {
      const active = index === activeIndex;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) cityInput.setAttribute('aria-activedescendant', node.id);
    });
  }

  function selectCity(city) {
    selectedCity = city;
    cityInput.value = describeCity(city);
    closeResults();
    mount.dispatchEvent(new CustomEvent('weather-city-selected', { detail: city }));
  }

  function renderResults(cities) {
    results = cities;
    activeIndex = cities.length ? 0 : -1;
    resultList.replaceChildren(...cities.map((city, index) => {
      const item = document.createElement('li');
      item.id = `weather-panel-result-${index}`;
      item.className = 'weather-panel__result';
      item.setAttribute('role', 'option');
      item.textContent = describeCity(city);
      item.addEventListener('mousedown', event => {
        event.preventDefault();
        selectCity(city);
      });
      return item;
    }));
    resultList.hidden = cities.length === 0;
    cityInput.setAttribute('aria-expanded', cities.length ? 'true' : 'false');
    paintActive();
  }

  async function search(query) {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    setError('');
    setStatus(i18n('weatherSearching'));
    try {
      const cities = await api.geocodeCity(query, {
        language: document.documentElement.lang || 'en',
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      renderResults(cities);
      setStatus('');
    } catch (error) {
      if (controller.signal.aborted) return;
      closeResults();
      setStatus('');
      reportError(error);
    }
  }

  cityInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    const query = cityInput.value.trim();
    if (query.length < MINIMUM_QUERY_LENGTH) {
      closeResults();
      return;
    }
    searchTimer = window.setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
  });

  cityInput.addEventListener('keydown', event => {
    // Enter must never reach the surrounding <form>: the city input is one field
    // among the rainfall editor's draft controls, and native submit-on-Enter would
    // silently apply unrelated staged data. This holds whether or not the
    // suggestion list is open, so the check runs before the hidden-list guard below.
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!resultList.hidden && results[activeIndex]) {
        selectCity(results[activeIndex]);
      }
      return;
    }
    if (resultList.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = nextActiveIndex(activeIndex, step, results.length);
      paintActive();
      return;
    }
    if (event.key === 'Escape') {
      // Stop here so the first Escape only dismisses the popup; only a second
      // Escape (with the list already closed, hitting the guard above) reaches
      // the ancestor listener that closes the whole editor dialog.
      event.preventDefault();
      event.stopPropagation();
      closeResults();
    }
  });

  return {
    loadToday,
    getSelectedCity: () => selectedCity,
    setSelectedCity: city => {
      selectedCity = city;
      cityInput.value = city ? describeCity(city) : '';
    },
    reportError,
    destroy() {
      window.clearTimeout(searchTimer);
      pending?.abort();
      activeLoad?.abort();
      mount.replaceChildren();
    }
  };
}
