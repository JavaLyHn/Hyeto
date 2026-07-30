import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        banner: '/*! Hyeto © 2026 JavaLyHn · PolyForm Noncommercial 1.0.0 · derived from Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/ */'
      }
    }
  }
});
