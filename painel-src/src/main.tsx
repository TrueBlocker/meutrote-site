import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilo.css';

// o painel nunca roda dentro de outro site (proteção contra clickjacking; o GitHub Pages não manda o cabeçalho)
if (window.top !== window.self) {
  document.body.textContent = 'O painel não pode ser aberto dentro de outra página.';
} else {
  createRoot(document.getElementById('raiz')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
