import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: funciona en https://<usuario>.github.io/<repositorio>/
  base: './',
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 5000,
  },
});
