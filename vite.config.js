import { defineConfig } from 'vite';
import path             from 'path';

export default defineConfig({
  /* Serve public/ as the web root */
  root:      path.resolve(__dirname, 'public'),
  publicDir: false,

  resolve: {
    alias: {
      '/src': path.resolve(__dirname, 'src'),
    },
  },

  // ── Tell Vite that firebase, L (Leaflet), Chart are CDN globals ──────────
  // This prevents the "firebase/L/Chart is not declared" esbuild error
  // because these libs are loaded via <script> tags in index.html, NOT npm.
  optimizeDeps: {
    exclude: [],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir:      path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
