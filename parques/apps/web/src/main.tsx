import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/screens.css';
import './styles/ui.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Acceso de depuración solo en desarrollo.
if (import.meta.env.DEV) {
  void Promise.all([import('./stores/gameStore'), import('./lib/online')]).then(([g, o]) => {
    (window as unknown as Record<string, unknown>).__parques = { game: g.useGame, online: o.useOnline };
  });
}
