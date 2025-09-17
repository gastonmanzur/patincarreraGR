import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the build works even when it's deployed inside
  // a subdirectory (e.g. Hostinger's `public_html/dist` during manual uploads).
  // Without this setting the generated HTML points to `/assets/...`, which
  // fails with 404 errors when the site isn't served from the domain root.
  base: './',
  plugins: [react()],
  // Proxy only uploaded files during development. API requests now use an
  // absolute backend URL defined in `src/api.js`, which avoids development
  // proxy connection issues.
  server: {
    proxy: {
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
