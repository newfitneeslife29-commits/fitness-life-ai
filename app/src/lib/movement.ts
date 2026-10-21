import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { getWalkPlan, type WalkWeek } from '../data/walking';
import { localDay } from './activity';
import { healthRemembered, readSleep, readStepDays } from './health';
import { isNative } from './native';
import { actions, useStore } from '../store/store';
import type { AppState, CardioSession, SleepEntry, WalkPlanState } from '../store/types';

// Steps, sleep and the walking plan. Steps come from Apple Health / Health
// Connect when connected, otherwise from the iPhone's motion sensor (it keeps
// a week of history); they are saved by day so the history stays in the app.

export const DEFAULT_STEP_GOAL = 8000;
const PEDOMETER_KEY = 'fitness-life:pedometer';

const flag = {
    get: () => { try { return localStorage.getItem(PEDOMETER_KEY) === '1'; } catch { return false; } },
    set: () => { try { localStorage.setItem(PEDOMETER_KEY, '1'); } catch { /* asked again next time */ } },
};

// The phone's own step counter can give past days only on iPhone.
export const pedometerSupported = () => isNative() && Capacitor.getPlatform() === 'ios';
export const pedometerOn = () => pedometerSupported() && flag.get();

// The module, not the plugin: a Capacitor plugin can't be the value of a
// promise (awaiting it calls a native "then" that doesn't exist).
const pedometer = () => import('@capgo/capacitor-pedometer');

export const enablePedometer = async () => {
    const { CapacitorPedometer: P } = await pedometer();
    const status = await P.requestPermissions();
    const ok = Object.values(status).some(v => v === 'granted');
    if (ok) flag.set();
    return ok;
};

const readPedometerDays = async (days: number, now = new Date()) => {
    const { CapacitorPedometer: P } = await pedometer();
    const out: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const end = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        const m = await P.getMeasurement({ start: start.getTime(), end: end.getTime() }).catch(() => null);
        if (m) out[localDay(start)] = Math.round(m.numberOfSteps ?? 0);
    }
    return out;
};

// Reads what the phone knows and saves it: 30 days of steps and a week of
// sleep from Health, or a week of steps from the iPhone's sensor.
export const syncMovement = async () => {
    if (!isNative()) return;
    if (healthRemembered()) {
        const steps = await readStepDays(30).catch(() => null);
        if (steps) actions.recordSteps(steps);
        const nights = await readSleep(8).catch(() => null);
        if (nights?.length) actions.logSleep(nights.map(n => ({ ...n, source: 'health' as const })));
    } else if (pedometerOn()) {
        const steps = await readPedometerDays(7).catch(() => null);
        if (steps) actions.recordSteps(steps);
    }
};

// On opening the app and each time it comes back.
export const useMovementSync = () => {
    useEffect(() => {
        void syncMovement();
        const onVisible = () => { if (document.visibilityState === 'visible') void syncMovement(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);
};

// Steps of a day: the saved count, plus walks recorded with GPS when the
// phone had nothing to count with.
export const stepsOn = (state: Pick<AppState, 'steps' | 'cardio'>, day: string) => {
    const saved = state.steps?.[day] ?? 0;
    if (saved > 0) return saved;
    return (state.cardio ?? []).filter(c => localDay(new Date(c.startedAt)) === day).reduce((n, c) => n + (c.steps ?? 0), 0);
};

// ---------- Sleep ----------

export const sleepMinutes = (bed: Date, wake: Date) => Math.max(0, Math.round((wake.getTime() - bed.getTime()) / 60000));

// "Typed by hand": bedtime the evening before the day of waking up when it is later than the wake time.
export const manualSleep = (day: Date, bed: string, wake: string): Omit<SleepEntry, 'id'> => {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    const wakeAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), wh, wm);
    const bedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), bh, bm);
    if (bedAt >= wakeAt) bedAt.setDate(bedAt.getDate() - 1);
    return { day: localDay(day), bedAt: bedAt.toISOString(), wakeAt: wakeAt.toISOString(), minutes: sleepMinutes(bedAt, wakeAt), source: 'manual' };
};

export type SleepRating = 'short' | 'good' | 'long';
export const sleepRating = (minutes: number): SleepRating => (minutes < 7 * 60 ? 'short' : minutes > 9 * 60 ? 'long' : 'good');

// ---------- Walking plan ----------

export interface WalkToday {
    week: number; // 0-based
    walk: number; // 0-based within the week
    spec: WalkWeek;
    doneThisWeek: number;
    finished: boolean;
}

// Where the plan is: the week by calendar (from the start day), the next walk
// not done yet. Walks missed in a week are left behind.
export const walkPlanStatus = (plan: WalkPlanState, now = new Date()): WalkToday | null => {
    const def = getWalkPlan(plan.id);
    if (!def) return null;
    const start = new Date(plan.startedAt);
    // Rounded: a day across a daylight-saving change lasts 23 or 25 hours.
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86_400_000);
    const week = Math.min(def.weeks.length - 1, Math.max(0, Math.floor(days / 7)));
    const spec = def.weeks[week];
    const doneThisWeek = plan.done.filter(k => k.startsWith(`${week}:`)).length;
    const lastWeekDone = week === def.weeks.length - 1 && doneThisWeek >= spec.walks;
    return { week, walk: Math.min(doneThisWeek, spec.walks - 1), spec, doneThisWeek, finished: lastWeekDone || days >= def.weeks.length * 7 };
};

export const stepGoalOf = (state: Pick<AppState, 'profile' | 'walkPlan'>) => {
    const status = state.walkPlan ? walkPlanStatus(state.walkPlan) : null;
    return status && !status.finished ? status.spec.steps : state.profile?.stepGoal ?? DEFAULT_STEP_GOAL;
};

// Totals of walks and rides since a date.
export const cardioTotals = (sessions: CardioSession[], since: Date) => {
    const list = sessions.filter(s => new Date(s.startedAt) >= since);
    return {
        count: list.length,
        distanceM: list.reduce((n, s) => n + s.distanceM, 0),
        durationSec: list.reduce((n, s) => n + s.durationSec, 0),
        kcal: list.reduce((n, s) => n + s.kcal, 0),
    };
};

export const useStepsToday = () => useStore(s => stepsOn(s, localDay(new Date())));
