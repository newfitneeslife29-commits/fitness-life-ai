import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/screens.css';
import './styles/ui.css';
import './styles/v09.css';
import { initNative, isNative } from './lib/native';

if (isNative()) void initNative();
else void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));

const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && location.hash === '#galeria') {
  void import('./dev/Gallery').then(({ Gallery }) => root.render(<Gallery />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Acceso de depuración solo en desarrollo.
if (import.meta.env.DEV) {
  void Promise.all([import('./stores/gameStore'), import('./lib/online'), import('./stores/appStore')]).then(([g, o, a]) => {
    (window as unknown as Record<string, unknown>).__parques = { game: g.useGame, online: o.useOnline, app: a.useApp };
  });
}
