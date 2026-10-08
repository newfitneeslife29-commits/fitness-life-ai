import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import { isNative } from './lib/native';
import { hydrateFromNative } from './store/store';

if (!isNative() && 'serviceWorker' in navigator) registerSW({ immediate: true });

// In the apps, restore saved data before the first render (the splash screen
// is still up), so a returning user never sees the onboarding by mistake.
void hydrateFromNative().finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <HashRouter>
                <App />
            </HashRouter>
        </React.StrictMode>,
    );
});
