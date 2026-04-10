import { defineConfig } from 'vite';
import path             from 'path';

export default defineConfig({
  /* Serve public/ as the web root so index.html is at localhost:3000/ */
  root:      path.resolve(__dirname, 'public'),
  publicDir: false,

  resolve: {
    alias: {
      /* /src in HTML/JS → <project>/src/ */
      '/src': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  build: {
    outDir:     path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
