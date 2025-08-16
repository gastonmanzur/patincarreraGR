import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
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
