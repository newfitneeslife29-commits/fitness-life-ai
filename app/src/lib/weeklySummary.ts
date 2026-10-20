import { useEffect, useMemo } from 'react';
import { t, type Key } from '../i18n';
import { localDay } from './activity';
import { stepGoalOf, stepsOn } from './movement';
import { scheduleAlert } from './native';
import { autoTargets, waterTargetMl } from './nutrition';
import { currentPause } from './pause';
import { usePremiumActive } from './premium';
import { volume } from './progression';
import { weekStart } from './stats';
import { useStore } from '../store/store';
import type { AppState } from '../store/types';

// The week in numbers (Monday to Sunday): workouts, minutes, weight moved,
// steps and water, with a tip for the next one. Every Sunday at 7 pm a
// notification sums it up and opens the summary page.

export const SUMMARY_HOUR = 19;

type SummaryState = Pick<AppState, 'sessions' | 'steps' | 'cardio' | 'water' | 'profile' | 'bodyWeights' | 'walkPlan' | 'nutritionTargets'>;

export interface WeekSummary {
    start: Date;
    days: number; // days of the week so far (1–7)
    workouts: number;
    target: number;
    minutes: number;
    volumeKg: number;
    steps: number;
    stepDays: number; // days at the step goal
    waterDays: number; // days at the water goal
}

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const weekSummary = (state: SummaryState, start: Date, now = new Date()): WeekSummary => {
    const end = addDays(start, 7);
    const sessions = state.sessions.filter(s => {
        const d = new Date(s.startedAt);
        return d >= start && d < end;
    });
    const last = now < end ? now : addDays(end, -1);
    const days = Math.max(1, Math.min(7, Math.floor((last.getTime() - start.getTime()) / 86_400_000) + 1));
    const weightKg = state.bodyWeights[0]?.weightKg ?? null;
    const protein = state.nutritionTargets?.protein ?? (state.profile && weightKg ? autoTargets(state.profile, weightKg).protein : null);
    const stepGoal = stepGoalOf(state);
    let steps = 0, stepDays = 0, waterDays = 0;
    for (let i = 0; i < days; i++) {
        const day = localDay(addDays(start, i));
        const s = stepsOn(state, day);
        steps += s;
        if (s >= stepGoal) stepDays++;
        const trained = sessions.some(x => localDay(new Date(x.startedAt)) === day);
        const target = state.profile ? waterTargetMl(state.profile, weightKg, { trained, proteinG: protein }) : 2000;
        if ((state.water?.[day] ?? 0) >= target) waterDays++;
    }
    const minutes = Math.round(sessions.reduce((n, s) => n + (s.activeSec ?? Math.max(0, (Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 1000)), 0) / 60);
    return {
        start, days, workouts: sessions.length, target: state.profile?.daysPerWeek ?? 3, minutes,
        volumeKg: sessions.reduce((n, s) => n + volume(s.sets), 0), steps, stepDays, waterDays,
    };
};

// One tip for next week, from what fell short first.
export const weeklyTip = (w: WeekSummary, paused = false): Key => {
    if (paused) return 'weekly.tip.pause';
    if (w.workouts === 0) return 'weekly.tip.start';
    if (w.workouts < w.target) return 'weekly.tip.plan';
    if (w.waterDays < Math.min(4, w.days)) return 'weekly.tip.water';
    if (w.stepDays < Math.min(3, w.days)) return 'weekly.tip.steps';
    return 'weekly.tip.great';
};

// This Sunday at 7 pm, or next week's once it has passed.
export const summaryAlertAt = (now = new Date()) => {
    const sunday = addDays(weekStart(now), 6);
    const at = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), SUMMARY_HOUR, 0, 0);
    return at(sunday) > now ? at(sunday) : at(addDays(sunday, 7));
};

export const useWeekSummary = (offsetWeeks = 0) => {
    const state = useStore(s => s);
    const today = localDay(new Date());
    return useMemo(() => {
        const start = addDays(weekStart(new Date()), offsetWeeks * 7);
        return weekSummary(state, start);
    }, [state.sessions, state.steps, state.cardio, state.water, state.profile, state.bodyWeights, state.walkPlan, state.nutritionTargets, today, offsetWeeks]);
};

// Reschedules Sunday's notification with this week's numbers so far: workouts
// and water only happen in the app, so they are right when it arrives.
export const useWeeklySummaryAlert = () => {
    // Premium: the summary and its Sunday notification.
    const premium = usePremiumActive();
    const on = useStore(s => s.profile !== null && s.profile.weeklySummary !== false) && premium;
    const paused = useStore(s => !!currentPause(s.profile));
    const lang = useStore(s => s.lang);
    const w = useWeekSummary();
    // Also once each week, after Sunday's has gone out.
    const next = summaryAlertAt().getTime();
    useEffect(() => {
        if (!on) {
            void scheduleAlert('weekly', null);
            return;
        }
        const at = summaryAlertAt();
        // After Sunday's has gone out, next week's starts from zero.
        const week = at.getTime() - weekStart(new Date()).getTime() > 7 * 86_400_000 ? { ...w, workouts: 0, waterDays: 0 } : w;
        void scheduleAlert('weekly', {
            at,
            title: t('weekly.alertTitle'),
            body: `${t('weekly.alertBody', { workouts: week.workouts, target: week.target, water: week.waterDays })} ${t(weeklyTip(week, paused))}`,
            link: '/resumen',
        });
    }, [on, paused, lang, w.workouts, w.target, w.waterDays, w.stepDays, next]);
};
