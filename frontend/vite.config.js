import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/veille-ia-web/',
  root: 'frontend',
  plugins: [react()],
  server: { port: 5173, host: '0.0.0.0', proxy: { '/api': 'http://localhost:3001' } },
  build: { outDir: '../dist', emptyOutDir: true }
});
