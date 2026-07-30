import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        banner: '/*! Rainform © 2026 afterimage · PolyForm Noncommercial 1.0.0 · https://rainform.pages.dev/ */'
      }
    }
  }
});
