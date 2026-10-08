import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// One place for device features. Inside the iOS/Android apps they use the
// native plugins; in the browser they fall back to web APIs or do nothing.

export const isNative = () => Capacitor.isNativePlatform();

// Safety net: never leave the splash screen up if the app fails to start.
if (isNative()) window.setTimeout(() => { void SplashScreen.hide().catch(() => {}); }, 5000);

const quiet = async (fn: () => Promise<unknown>) => {
    try {
        await fn();
    } catch {
        // A missing permission or an unsupported device is never fatal.
    }
};

export const haptic = (kind: 'tap' | 'success' | 'warning' = 'tap') => {
    if (isNative()) {
        void quiet(() => kind === 'tap'
            ? Haptics.impact({ style: ImpactStyle.Light })
            : Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Warning }));
    } else {
        navigator.vibrate?.(kind === 'tap' ? 15 : [60, 40, 60]);
    }
};

// Keep the screen on during a workout.
let wakeLock: { release: () => Promise<void> } | null = null;
export const keepAwake = async (on: boolean) => {
    if (isNative()) {
        await quiet(() => (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()));
        return;
    }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (on && nav.wakeLock && document.visibilityState === 'visible') {
        await quiet(async () => { wakeLock = await nav.wakeLock!.request('screen'); });
    } else if (!on && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        await quiet(() => lock.release());
    }
};

// Rest timer alert that fires even with the phone locked (native only;
// the web app vibrates while it is open).
const REST_NOTIFICATION_ID = 4711;
let notificationsAllowed: boolean | null = null;

export const scheduleRestAlert = async (atMs: number) => {
    if (!isNative()) return;
    await quiet(async () => {
        if (notificationsAllowed === null) {
            notificationsAllowed = (await LocalNotifications.requestPermissions()).display === 'granted';
        }
        if (!notificationsAllowed) return;
        await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
        if (atMs <= Date.now() + 1000) return;
        await LocalNotifications.schedule({
            notifications: [{ id: REST_NOTIFICATION_ID, title: 'Descanso terminado', body: 'A por la siguiente serie.', schedule: { at: new Date(atMs), allowWhileIdle: true } }],
        });
    });
};

export const cancelRestAlert = async () => {
    if (!isNative()) return;
    await quiet(() => LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] }));
};

// Share sheet; falls back to the clipboard. Returns what happened.
export const shareText = async (title: string, text: string): Promise<'shared' | 'copied' | 'failed'> => {
    try {
        if (isNative()) {
            await Share.share({ title, text, dialogTitle: title });
            return 'shared';
        }
        if (navigator.share) {
            await navigator.share({ title, text });
            return 'shared';
        }
        await navigator.clipboard.writeText(text);
        return 'copied';
    } catch (e) {
        // Closing the share sheet is not an error worth reporting.
        if (e instanceof Error && /cancel|abort/i.test(e.message + e.name)) return 'shared';
        return 'failed';
    }
};

// Saves a backup file: download in the browser, share sheet on the phone
// (so it can go to Files, Drive, email...).
export const saveFile = async (name: string, content: string) => {
    if (isNative()) {
        const written = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Copia de Fitness Life', url: written.uri, dialogTitle: 'Guardar copia' });
        return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
};

// Status bar, splash and the Android back button. Safe to call repeatedly:
// setup runs once and the latest `onBack` is used.
let backHandler: () => void = () => {};
let initialized = false;
export const initNative = (onBack: () => void) => {
    backHandler = onBack;
    if (!isNative() || initialized) return;
    initialized = true;
    void quiet(() => StatusBar.setStyle({ style: Style.Dark }));
    if (Capacitor.getPlatform() === 'android') void quiet(() => StatusBar.setBackgroundColor({ color: '#0b0d10' }));
    void quiet(() => SplashScreen.hide());
    void quiet(() => App.addListener('backButton', ({ canGoBack }) => (canGoBack ? backHandler() : App.exitApp())));
};
