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
    // Keyed by the middle of the bucket: on Android the buckets are 24 h long,
    // so after a daylight-saving change their start falls at 23:00 or 01:00.
    return Object.fromEntries(samples.map(s => [localDay(new Date(Date.parse(s.startDate) + 12 * 3600_000)), Math.round(s.value)]));
};

export interface SleepNight { day: string; bedAt: string; wakeAt: string; minutes: number }

type Span = [number, number];
// Minutes covered by the spans, overlaps counted once (a watch and the phone
// can both record the same night).
const coveredMinutes = (spans: Span[]) => {
    let total = 0;
    let end = -Infinity;
    for (const [s, e] of [...spans].sort((x, y) => x[0] - y[0])) {
        if (e <= end) continue;
        total += e - Math.max(s, end);
        end = e;
    }
    return total / 60000;
};

const NIGHT_GAP = 3 * 3600_000;

// Sleep samples grouped into nights (samples less than 3 h apart), each one
// on the day of waking up. Time asleep counts the sleep stages; a phone
// without a watch may only record "in bed", which then counts.
export const sleepNights = (samples: { startDate: string; endDate: string; sleepState?: string }[]): SleepNight[] => {
    const spans = samples
        .map(s => ({ start: Date.parse(s.startDate), end: Date.parse(s.endDate), state: s.sleepState }))
        .filter(s => s.end > s.start)
        .sort((a, b) => a.start - b.start);
    const sessions: { bed: number; wake: number; asleep: Span[]; inBed: Span[] }[] = [];
    for (const s of spans) {
        let n = sessions[sessions.length - 1];
        if (!n || s.start - n.wake > NIGHT_GAP) sessions.push(n = { bed: s.start, wake: s.end, asleep: [], inBed: [] });
        n.wake = Math.max(n.wake, s.end);
        if (s.state === 'inBed') n.inBed.push([s.start, s.end]);
        else if (s.state !== 'awake') n.asleep.push([s.start, s.end]);
    }
    const nights = new Map<string, SleepNight>();
    for (const n of sessions) {
        const minutes = Math.round(coveredMinutes(n.asleep) || coveredMinutes(n.inBed));
        if (minutes < 60) continue;
        const day = localDay(new Date(n.wake));
        const prev = nights.get(day);
        // A nap the same day doesn't replace the night.
        if (prev && prev.minutes >= minutes) continue;
        nights.set(day, { day, bedAt: new Date(n.bed).toISOString(), wakeAt: new Date(n.wake).toISOString(), minutes });
    }
    return [...nights.values()];
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
