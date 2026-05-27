import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Documentación: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Tamaño máximo de chunk antes de warning (en KB)
    chunkSizeWarningLimit: 1000,
  },
});
