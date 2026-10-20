import { Capacitor } from '@capacitor/core';
import { appVersion } from './updates';

// Crash reports to Sentry, only in builds made with a DSN (VITE_SENTRY_DSN).
// No personal data: no user, no IP and no usage sessions; the trail before an
// error keeps only screen changes and taps.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let sentry: Promise<typeof import('@sentry/react') | null> | null = null;

export const startErrorReports = () => {
    if (!dsn || sentry) return;
    sentry = Promise.all([import('@sentry/react'), appVersion()]).then(([Sentry, version]) => {
        Sentry.init({
            dsn,
            release: version ? `fitness-life@${version}` : undefined,
            environment: Capacitor.getPlatform(),
            sendDefaultPii: false,
            integrations: defaults => defaults.filter(i => i.name !== 'BrowserSession'),
            beforeBreadcrumb: b => (b.category === 'navigation' || b.category === 'ui.click' ? b : null),
            beforeSend: event => {
                delete event.user;
                return event;
            },
        });
        return Sentry;
    }).catch(() => null);
};

// For errors the app catches itself (a screen that failed to draw).
export const reportError = (error: unknown, componentStack?: string) => {
    void sentry?.then(Sentry => Sentry?.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined));
};
