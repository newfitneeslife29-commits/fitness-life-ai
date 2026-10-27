import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { addPoint } from './cardio';
import { isNative, keepAwake } from './native';
import { actions, getState, useStore } from '../store/store';

// GPS for the walk or ride being recorded, while the app is open, with the
// screen kept on. No background location: App Review rejects it for anything
// but navigation (2.5.4), and Google Play wants a declaration with a video.
// On iPhone it goes through the native plugin, asking only "while using the
// app"; on Android and the web, through the web view. Points only update the
// distance on the phone: the route itself is never stored or sent.

let running = false;

const nativeGps = () => isNative() && Capacitor.getPlatform() === 'ios';

const onFix = (lat: number, lon: number, accuracy: number, at: number) =>
    actions.updateCardio(a => addPoint(a, { lat, lon, accuracy, at }));

let webWatch: number | null = null;

// After a refusal it stops listening, so the next try (once the location is
// allowed in Settings) starts again.
const fail = (denied: boolean) => {
    actions.updateCardio(a => ({ ...a, gps: denied ? 'denied' : 'off' }));
    if (denied) void stopTracking();
};

export const startTracking = async () => {
    if (running || !getState().cardioActive) return;
    running = true;
    void keepAwake(true);
    if (!nativeGps()) {
        if (!('geolocation' in navigator)) {
            running = false;
            return fail(false);
        }
        webWatch = navigator.geolocation.watchPosition(
            p => onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.timestamp),
            e => fail(e.code === e.PERMISSION_DENIED),
            { enableHighAccuracy: true, maximumAge: 0 },
        );
        return;
    }
    try {
        const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
        // Without backgroundMessage the plugin stays in the foreground.
        await BackgroundGeolocation.start({
            requestPermissions: true,
            stale: false,
            distanceFilter: 5,
        }, (location, error) => {
            if (error) return fail(error.code === 'NOT_AUTHORIZED');
            if (location) onFix(location.latitude, location.longitude, location.accuracy, location.time ?? Date.now());
        });
    } catch {
        running = false;
        fail(false);
    }
};

export const stopTracking = async () => {
    if (!running) return;
    running = false;
    void keepAwake(false);
    if (webWatch !== null) {
        navigator.geolocation.clearWatch(webWatch);
        webWatch = null;
        return;
    }
    try {
        const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
        await BackgroundGeolocation.stop();
    } catch {
        // Already stopped.
    }
};

export const openLocationSettings = async () => {
    if (!isNative()) return;
    try {
        const { BackgroundGeolocation } = await import('@capgo/background-geolocation');
        await BackgroundGeolocation.openSettings();
    } catch {
        // Nothing to open.
    }
};

// Keeps the GPS on while a walk or ride is being recorded, wherever the app
// is (also after it was closed and opened again), off once it ends (finished,
// discarded, data reset or replaced). Coming back to the app tries again
// after the location was refused.
export const useTracking = () => {
    const on = useStore(s => !!s.cardioActive);
    useEffect(() => {
        if (!on) {
            void stopTracking();
            return;
        }
        void startTracking();
        const retry = () => { if (document.visibilityState === 'visible') void startTracking(); };
        document.addEventListener('visibilitychange', retry);
        return () => document.removeEventListener('visibilitychange', retry);
    }, [on]);
};
