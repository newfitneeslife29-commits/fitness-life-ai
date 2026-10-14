import { useEffect, useState } from 'react';
import { localDay } from './activity';
import { isNative } from './native';

// Steps, active calories and heart rate from Health Connect (Android) or
// Apple Health (iOS): whatever the phone, an Apple Watch, Garmin or Samsung
// watch syncs there. Read-only, and only on the device: nothing is uploaded.

export interface HeartSummary { avg: number; min: number; max: number; last: number }
export interface HealthToday {
    steps: number | null;
    activeKcal: number | null;
    heart: HeartSummary | null;
    at: string;
}
export type HealthState =
    | { kind: 'unsupported' } // web, or a device without Health Connect / HealthKit
    | { kind: 'install' } // Android without the Health Connect app
    | { kind: 'disconnected' }
    | { kind: 'connected'; today: HealthToday | null };

const READ = ['steps', 'calories', 'heartRate', 'sleep'] as const;
const CONNECTED_KEY = 'fitness-life:health';

const plugin = async () => (await import('@capgo/capacitor-health')).Health;

export const summarizeHeart = (samples: { value: number; startDate: string }[]): HeartSummary | null => {
    const values = samples.filter(s => s.value > 0);
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const bpm = values.map(s => s.value);
    return {
        avg: Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length),
        min: Math.round(Math.min(...bpm)),
        max: Math.round(Math.max(...bpm)),
        last: Math.round(sorted[sorted.length - 1].value),
    };
};

export const healthRemembered = () => {
    try {
        return localStorage.getItem(CONNECTED_KEY) === '1';
    } catch {
        return false;
    }
};
const remember = (on: boolean) => {
    try {
        if (on) localStorage.setItem(CONNECTED_KEY, '1');
        else localStorage.removeItem(CONNECTED_KEY);
    } catch {
        // Not fatal: the user is asked to connect again.
    }
};

export const readToday = async (now = new Date()): Promise<HealthToday> => {
    const Health = await plugin();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endDate = now.toISOString();
    const sum = async (dataType: 'steps' | 'calories') => {
        try {
            const { samples } = await Health.queryAggregated({ dataType, startDate, endDate, bucket: 'day', aggregation: 'sum' });
            return samples.length ? Math.round(samples.reduce((t, s) => t + s.value, 0)) : 0;
        } catch {
            return null;
        }
    };
    const heart = await Health.readSamples({ dataType: 'heartRate', startDate, endDate, limit: 1000 })
        .then(r => summarizeHeart(r.samples)).catch(() => null);
    return { steps: await sum('steps'), activeKcal: await sum('calories'), heart, at: now.toISOString() };
};

const status = async (): Promise<HealthState> => {
    if (!isNative()) return { kind: 'unsupported' };
    try {
        const Health = await plugin();
        const { available, platform } = await Health.isAvailable();
        // Android 9–13 need the Health Connect app from Google Play (or an update of it).
        if (!available) return platform === 'android' ? { kind: 'install' } : { kind: 'unsupported' };
        if (!healthRemembered()) return { kind: 'disconnected' };
        return { kind: 'connected', today: await readToday().catch(() => null) };
    } catch {
        return { kind: 'unsupported' };
    }
};

// Steps of each of the last `days` local days.
export const readStepDays = async (days: number, now = new Date()): Promise<Record<string, number>> => {
    const Health = await plugin();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    const { samples } = await Health.queryAggregated({ dataType: 'steps', startDate: start.toISOString(), endDate: now.toISOString(), bucket: 'day', aggregation: 'sum' });
    return Object.fromEntries(samples.map(s => [localDay(new Date(s.startDate)), Math.round(s.value)]));
};

export interface SleepNight { day: string; bedAt: string; wakeAt: string; minutes: number }

// Sleep samples grouped by the day of waking up. Time asleep counts the
// sleep stages; a phone without a watch may only record "in bed", which then counts.
export const sleepNights = (samples: { startDate: string; endDate: string; sleepState?: string }[]): SleepNight[] => {
    const nights = new Map<string, { bed: number; wake: number; asleep: number; inBed: number }>();
    for (const s of samples) {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        if (!(end > start)) continue;
        const day = localDay(new Date(end));
        const n = nights.get(day) ?? { bed: start, wake: end, asleep: 0, inBed: 0 };
        n.bed = Math.min(n.bed, start);
        n.wake = Math.max(n.wake, end);
        const minutes = (end - start) / 60000;
        if (s.sleepState === 'inBed') n.inBed += minutes;
        else if (s.sleepState !== 'awake') n.asleep += minutes;
        nights.set(day, n);
    }
    return [...nights].map(([day, n]) => ({
        day, bedAt: new Date(n.bed).toISOString(), wakeAt: new Date(n.wake).toISOString(), minutes: Math.round(n.asleep || n.inBed),
    })).filter(n => n.minutes >= 60);
};

export const readSleep = async (nights: number, now = new Date()) => {
    const Health = await plugin();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - nights, 12);
    const { samples } = await Health.readSamples({ dataType: 'sleep', startDate: start.toISOString(), endDate: now.toISOString(), limit: 1000 });
    return sleepNights(samples);
};

export const connectHealth = async (): Promise<boolean> => {
    const Health = await plugin();
    const result = await Health.requestAuthorization({ read: [...READ] });
    // HealthKit never says what was refused (privacy); Health Connect does.
    const ok = result.readAuthorized.length > 0 || result.readDenied.length < READ.length;
    remember(ok);
    return ok;
};

export const disconnectHealth = () => remember(false);

export const openHealthSettings = async () => (await plugin()).openHealthConnectSettings();

// The card's state, refreshed when the app comes back to the foreground.
export const useHealth = () => {
    const [state, setState] = useState<HealthState | null>(null);
    const refresh = () => { void status().then(setState); };
    useEffect(() => {
        refresh();
        const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);
    return { state, refresh };
};
