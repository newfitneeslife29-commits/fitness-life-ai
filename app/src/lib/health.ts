import { useEffect, useState } from 'react';
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

const READ = ['steps', 'calories', 'heartRate'] as const;
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

const remembered = () => {
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
        if (!remembered()) return { kind: 'disconnected' };
        return { kind: 'connected', today: await readToday().catch(() => null) };
    } catch {
        return { kind: 'unsupported' };
    }
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
