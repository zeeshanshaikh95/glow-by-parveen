import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base path is configurable so the built app works both locally and on
// GitHub Pages project sites (https://user.github.io/<repo>/).
// Set VITE_BASE=/glow-by-parveen/ (with trailing slash) for GitHub Pages.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    // Bind all interfaces so both 127.0.0.1 and ::1 work (Windows binds ::1 by
    // default), and so the mobile-first UI can be tested on a phone over LAN.
    host: true,
    proxy: {
      // Local dev: proxy /api and /uploads to the Express server.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
