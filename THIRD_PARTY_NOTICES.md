# Third-party notices

Hyeto depends on third-party software that remains under its own license:

- [Three.js](https://github.com/mrdoob/three.js) — MIT License
- [Vite](https://github.com/vitejs/vite) — MIT License

Transitive development dependencies and their resolved versions are recorded in `package-lock.json`. Their licenses are not replaced by Hyeto's PolyForm Noncommercial license.

Hyeto's rain visualization derives from Rainform / 数据成雨 © 2026 afterimage (<https://rainform.pages.dev/>), which is not a third-party dependency but the upstream work this project is based on. See [NOTICE.md](NOTICE.md).

`public/audio/rain-loop.m4a` is encoded from a WAV that `scripts/generate-rain-audio.mjs` synthesises deterministically. It does not contain a third-party recording, music track or audio sample.

Contributors must verify the origin and redistribution rights of any new code, media, font, audio or dataset before adding it to the repository.

Live and historical precipitation come from [Open-Meteo](https://open-meteo.com/),
used under its free non-commercial terms. Open-Meteo requires no API key and is
queried directly from the browser; no weather data is bundled with this
repository.
