import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // src/main.js awaits the prepared audio graph at module scope so the audio and
    // scene downloads overlap. Top-level await needs es2022, which raises the floor
    // to Safari 15 / Chrome 89 — both already below this project's WebGL2 baseline.
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        banner: '/*! Hyeto © 2026 JavaLyHn · PolyForm Noncommercial 1.0.0 · derived from Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/ */'
      }
    }
  }
});
