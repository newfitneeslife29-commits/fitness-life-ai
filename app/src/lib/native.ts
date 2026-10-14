import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { t } from '../i18n';

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

// Beeps for the rest timer, made with Web Audio (no sound files). Browsers
// only allow sound after a tap, so a tap on "done" primes it.
let audio: AudioContext | null = null;
export const primeSound = () => {
    try {
        audio ??= new AudioContext();
        if (audio.state !== 'running') void audio.resume();
    } catch {
        audio = null;
    }
};

const beep = (freq: number, ms: number, delayMs = 0) => {
    if (!audio) return;
    const at = audio.currentTime + delayMs / 1000;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + ms / 1000 + 0.02);
};

// Countdown at the end of a rest or a timed set: a tick each of the last
// 10 seconds, higher for the last 3. Over: two beeps and a long vibration.
export const COUNTDOWN_SEC = 10;
export const restTick = (sound: boolean, final = false) => {
    if (sound) beep(final ? 1100 : 880, final ? 130 : 80);
    haptic('tap');
};
export const restOver = (sound: boolean) => {
    if (sound) {
        beep(1320, 160);
        beep(1320, 260, 220);
    }
    if (isNative()) void quiet(() => Haptics.vibrate({ duration: 700 }));
    else navigator.vibrate?.([300, 120, 300]);
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

const notificationsOk = async () => {
    if (notificationsAllowed === null) {
        notificationsAllowed = (await LocalNotifications.requestPermissions()).display === 'granted';
    }
    return notificationsAllowed;
};

// Exact alarms need a special permission on Android 12+ (off by default on
// Android 14+). Asking for one makes the plugin open the system settings, so
// alerts are exact only when it's already allowed; otherwise they may come a
// little late, and nobody gets sent to Settings mid-workout.
let exactAllowed: Promise<boolean> | null = null;
const exactAlarms = () => {
    exactAllowed ??= Capacitor.getPlatform() !== 'android'
        ? Promise.resolve(true)
        : LocalNotifications.checkExactNotificationSetting().then(r => r.exact_alarm === 'granted').catch(() => false);
    return exactAllowed;
};

export const scheduleRestAlert = async (atMs: number) => {
    if (!isNative()) return;
    await quiet(async () => {
        if (!(await notificationsOk())) return;
        await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
        if (atMs <= Date.now() + 1000) return;
        await LocalNotifications.schedule({
            notifications: [{
                id: REST_NOTIFICATION_ID, title: t('notify.restTitle'), body: t('notify.restBody'),
                schedule: { at: new Date(atMs), allowWhileIdle: true }, isExactNotification: await exactAlarms(),
            }],
        });
    });
};

export const cancelRestAlert = async () => {
    if (!isNative()) return;
    await quiet(() => LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] }));
};

// "Your legs have rested 48 h": reminders based on recovery (lib/recovery.ts).
// Each call replaces the previous ones.
const RECOVERY_IDS = [5101, 5102, 5103, 5104];
export const scheduleRecoveryAlerts = async (alerts: { at: Date; title: string; body: string }[]) => {
    if (!isNative()) return;
    await quiet(async () => {
        await LocalNotifications.cancel({ notifications: RECOVERY_IDS.map(id => ({ id })) });
        const due = alerts.filter(a => a.at.getTime() > Date.now() + 60_000).slice(0, RECOVERY_IDS.length);
        if (!due.length || !(await notificationsOk())) return;
        await LocalNotifications.schedule({
            // Hours away: an inexact alarm is fine and needs no special permission.
            notifications: due.map((a, i) => ({ id: RECOVERY_IDS[i], title: a.title, body: a.body, schedule: { at: a.at, allowWhileIdle: true }, isExactNotification: false })),
        });
    });
};

// Weekly reminders (lib/mealplan.ts, lib/reminders.ts): one notification a
// week each, at a weekday and time. Each call replaces the group's previous ones.
export interface WeeklyReminder {
    id: number;
    weekday: number; // 1 = Sunday … 7 = Saturday
    hour: number;
    minute: number;
    title: string;
    body: string;
}
const REMINDER_IDS = {
    meals: Array.from({ length: 70 }, (_, i) => 5200 + i),
    training: Array.from({ length: 7 }, (_, i) => 5300 + i),
};
export const reminderId = (group: keyof typeof REMINDER_IDS, index: number) => REMINDER_IDS[group][index];
export const scheduleWeeklyReminders = async (group: keyof typeof REMINDER_IDS, reminders: WeeklyReminder[]) => {
    if (!isNative()) return;
    await quiet(async () => {
        await LocalNotifications.cancel({ notifications: REMINDER_IDS[group].map(id => ({ id })) });
        if (!reminders.length || !(await notificationsOk())) return;
        await LocalNotifications.schedule({
            notifications: reminders.map(r => ({
                id: r.id, title: r.title, body: r.body,
                schedule: { on: { weekday: r.weekday, hour: r.hour, minute: r.minute }, allowWhileIdle: true }, isExactNotification: false,
            })),
        });
    });
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

// Shares an image (a share card, a before/after) to Instagram, TikTok,
// WhatsApp... In the browser it uses the share sheet when it can take files,
// otherwise it downloads the image.
export const shareImage = async (blob: Blob, name: string, title: string): Promise<'shared' | 'saved' | 'failed'> => {
    try {
        if (isNative()) {
            const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
            const written = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
            await Share.share({ title, files: [written.uri], dialogTitle: title });
            return 'shared';
        }
        const file = new File([blob], name, { type: blob.type });
        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title });
            return 'shared';
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return 'saved';
    } catch (e) {
        if (e instanceof Error && /cancel|abort/i.test(e.message + e.name)) return 'shared';
        return 'failed';
    }
};

// Straight to one app (Android): Instagram or Facebook Stories, or the
// Facebook, Instagram or TikTok app. Elsewhere, or when that app is not
// installed, the share sheet opens instead, where those apps also appear.
export type ShareTarget = 'instagram-story' | 'facebook-story' | 'instagram' | 'facebook' | 'tiktok';
interface StorySharePlugin { share(options: { target: ShareTarget; path: string }): Promise<void> }
const StoryShare = registerPlugin<StorySharePlugin>('StoryShare');

export const shareImageTo = async (target: ShareTarget, blob: Blob, name: string, title: string): Promise<'shared' | 'saved' | 'failed' | 'fallback'> => {
    if (Capacitor.getPlatform() !== 'android') {
        const r = await shareImage(blob, name, title);
        return r === 'shared' ? 'fallback' : r;
    }
    try {
        const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
        const written = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
        await StoryShare.share({ target, path: written.uri });
        return 'shared';
    } catch {
        // App missing (or a phone that blocks it): the share sheet still works.
        const r = await shareImage(blob, name, title);
        return r === 'shared' ? 'fallback' : r;
    }
};

// Saves a backup file: download in the browser, share sheet on the phone
// (so it can go to Files, Drive, email...).
export const saveFile = async (name: string, content: string) => {
    if (isNative()) {
        const written = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
        try {
            await Share.share({ title: t('backup.shareTitle'), url: written.uri, dialogTitle: t('backup.save') });
        } catch (e) {
            // Closing the share sheet is not an error.
            if (!/cancel/i.test(String((e as Error)?.message ?? e))) throw e;
        }
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
    // Status bar colors follow the theme (src/lib/theme.ts).
    void quiet(() => SplashScreen.hide());
    void quiet(() => App.addListener('backButton', ({ canGoBack }) => {
        // An open sheet or dialog closes first (they close on Escape).
        if (document.querySelector('[aria-modal="true"]')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            return;
        }
        if (canGoBack) backHandler();
        else void App.exitApp();
    }));
};
