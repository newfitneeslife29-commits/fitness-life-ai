import { useSyncExternalStore } from 'react';
import { isNative } from './native';

// "A new version is available": in the apps, the App Store or Google Play
// says whether there's a newer version; on the web, a new service worker
// has downloaded the new files. Either way the app shows a banner, and the
// user picks when to update (never in the middle of a workout).

export interface Update {
    version?: string;
    apply: () => Promise<void>;
}

let update: Update | null = null;
const listeners = new Set<() => void>();
const publish = (next: Update | null) => {
    update = next;
    listeners.forEach(l => l());
};

export const useUpdate = () => useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l); },
    () => update,
);

// This install's version ("1.0.12"), or null on the web.
let version: Promise<string | null> | null = null;
export const appVersion = () => {
    version ??= isNative()
        ? import('@capacitor/app').then(({ App }) => App.getInfo()).then(i => i.version, () => null)
        : Promise.resolve(null);
    return version;
};

// The store of the phone's country (the App Store looks up one country at a time).
const country = () => {
    const region = (navigator.language.split('-')[1] ?? '').toUpperCase();
    return /^[A-Z]{2}$/.test(region) ? region : undefined;
};

// Asks the store. Returns true when there's an update. Never throws: an app
// not installed from a store, or not published there yet, has nothing to say.
const checkStore = async () => {
    try {
        const { AppUpdate, AppUpdateAvailability } = await import('@capawesome/capacitor-app-update');
        const info = await AppUpdate.getAppUpdateInfo({ country: country() });
        if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return false;
        publish({ version: info.availableVersionName, apply: () => AppUpdate.openAppStore() });
        return true;
    } catch {
        return false;
    }
};

const SIX_HOURS = 6 * 3_600_000;
let lastCheck = 0;
let webCheck: (() => Promise<void>) | null = null;

// Look for an update now (button in Ajustes), or at most every six hours
// (app start and every return to the app). True when there is one.
export const checkForUpdate = async (force = false) => {
    if (update) return true;
    if (!force && Date.now() - lastCheck < SIX_HOURS) return false;
    lastCheck = Date.now();
    if (isNative()) return checkStore();
    await webCheck?.().catch(() => {});
    return update !== null;
};

export const startUpdateChecks = () => {
    if (isNative()) {
        void checkForUpdate();
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void checkForUpdate();
        });
        return;
    }
    if (!('serviceWorker' in navigator)) return;
    void import('virtual:pwa-register').then(({ registerSW }) => {
        const reload = registerSW({
            immediate: true,
            onNeedRefresh: () => publish({ apply: () => reload(true) }),
            onRegisteredSW: (_url, registration) => {
                if (!registration) return;
                webCheck = async () => {
                    await registration.update();
                    // A new version downloads in the background: wait for it (up to 15 s).
                    const worker = registration.installing;
                    if (worker) {
                        await new Promise<void>(done => {
                            const timer = window.setTimeout(done, 15_000);
                            worker.addEventListener('statechange', () => {
                                if (worker.state !== 'installing') { window.clearTimeout(timer); done(); }
                            });
                        });
                    }
                    await new Promise(done => window.setTimeout(done, 100)); // onNeedRefresh runs first
                };
                // A tab left open for days still hears about new versions.
                window.setInterval(() => void checkForUpdate(), SIX_HOURS);
            },
        });
    });
};
