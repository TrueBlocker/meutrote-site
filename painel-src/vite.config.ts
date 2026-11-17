import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O painel é publicado em /meutrote-site/painel/ (GitHub Pages). O build sai direto na pasta do site.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../painel',
    emptyOutDir: true,
    sourcemap: false,
    assetsDir: 'assets',
  },
});
