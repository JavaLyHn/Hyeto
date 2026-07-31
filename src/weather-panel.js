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

export function createWeatherPanel({ mount, api, i18n, onApply, setStatus, setError }) {
  let searchTimer = 0;
  let pending = null;
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
  `;

  const title = mount.querySelector('[data-weather="title"]');
  const cityLabel = mount.querySelector('[data-weather="cityLabel"]');
  const cityInput = mount.querySelector('[data-weather="city"]');
  const resultList = mount.querySelector('#weather-panel-results');

  title.textContent = i18n('weatherTitle');
  cityLabel.textContent = i18n('weatherCityLabel');
  cityInput.placeholder = i18n('weatherCityPlaceholder');

  function reportError(error) {
    setError(i18n(errorKeyFor(error)));
  }

  function closeResults() {
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
    if (resultList.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = nextActiveIndex(activeIndex, step, results.length);
      paintActive();
      return;
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      selectCity(results[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeResults();
    }
  });

  return {
    getSelectedCity: () => selectedCity,
    setSelectedCity: city => {
      selectedCity = city;
      cityInput.value = city ? describeCity(city) : '';
    },
    reportError,
    destroy() {
      window.clearTimeout(searchTimer);
      pending?.abort();
      mount.replaceChildren();
    }
  };
}
