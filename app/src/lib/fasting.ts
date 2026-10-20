import { useEffect } from 'react';
import { t } from '../i18n';
import { scheduleAlert } from './native';
import { useStore } from '../store/store';

// Intermittent fasting: hours fasting out of 24 (16 = 16:8).
export const FAST_PLANS = [12, 14, 16, 18, 20];

export const fastProgress = (startedAt: string, hours: number, now = Date.now()) => {
    const start = new Date(startedAt).getTime();
    const goalAt = start + hours * 3_600_000;
    const elapsedMs = Math.max(0, now - start);
    return { elapsedMs, goalAt, leftMs: Math.max(0, goalAt - now), reached: now >= goalAt, pct: Math.min(100, (elapsedMs / (hours * 3_600_000)) * 100) };
};

// "16 h 05 min"; time left rounds up (just started: "16 h 00 min" to go).
export const fmtHoursMin = (ms: number, roundUp = false) => {
    const min = (roundUp ? Math.ceil : Math.floor)(ms / 60_000);
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
};

// The notification when the fast reaches its goal (also with the app closed).
export const useFastingAlert = () => {
    const fasting = useStore(s => s.fasting);
    const lang = useStore(s => s.lang);
    useEffect(() => {
        const f = fasting?.startedAt ? fasting : null;
        void scheduleAlert('fasting', f && {
            at: new Date(fastProgress(f.startedAt!, f.hours).goalAt),
            title: t('fasting.alertTitle'), body: t('fasting.alertBody', { h: f.hours }),
        });
    }, [fasting?.startedAt, fasting?.hours, lang]);
};
