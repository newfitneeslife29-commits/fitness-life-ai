import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getLang, loadLang } from './i18n';
import { restoreTabIcon } from './lib/appIcon';
import { startErrorReports } from './lib/errors';
import { startUpdateChecks } from './lib/updates';
import { hydrateFromNative } from './store/store';

startErrorReports();
startUpdateChecks();
restoreTabIcon();

// In the apps, restore saved data before the first render (the splash screen
// is still up), so a returning user never sees the onboarding by mistake.
// A language that isn't bundled loads before the first render too (if it
// can't, the app shows English).
void hydrateFromNative().then(() => loadLang(getLang())).catch(() => {}).finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <ErrorBoundary>
                <HashRouter>
                    <App />
                </HashRouter>
            </ErrorBoundary>
        </React.StrictMode>,
    );
});
