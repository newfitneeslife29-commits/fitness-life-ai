import { describe, expect, it } from 'vitest';
import type { AppState, Session } from '../store/types';
import { summaryAlertAt, weekSummary, weeklyTip } from './weeklySummary';

const session = (day: number, minutes: number): Session => ({
    id: `s${day}`, routineId: null, routineName: 'x', startedAt: new Date(2026, 9, day, 18).toISOString(),
    endedAt: new Date(2026, 9, day, 18, minutes).toISOString(), sets: [{ exerciseId: 'press-banca', weightKg: 50, reps: 10 }],
} as Session);

const base = {
    sessions: [session(19, 40), session(21, 50), session(12, 30)],
    steps: { '2026-10-19': 9000, '2026-10-20': 3000 },
    cardio: [],
    water: { '2026-10-19': 3000, '2026-10-20': 500 },
    profile: { daysPerWeek: 3, sex: 'hombre', activity: 'ligero' },
    bodyWeights: [],
    walkPlan: null,
    nutritionTargets: null,
} as unknown as Pick<AppState, 'sessions' | 'steps' | 'cardio' | 'water' | 'profile' | 'bodyWeights' | 'walkPlan' | 'nutritionTargets'>;

describe('weekly summary', () => {
    it('adds up Monday to Sunday', () => {
        const w = weekSummary(base, new Date(2026, 9, 19), new Date(2026, 9, 25, 20));
        expect(w).toMatchObject({ days: 7, workouts: 2, target: 3, minutes: 90, volumeKg: 1000, steps: 12000, stepDays: 1 });
        // 2.5 l without a weight, +0.5 l on a training day: the 19th (3 l) is in.
        expect(w.waterDays).toBe(1);
    });

    it('counts only the days so far in a running week', () => {
        expect(weekSummary(base, new Date(2026, 9, 19), new Date(2026, 9, 20, 9)).days).toBe(2);
    });

    it('tips on what fell short first', () => {
        const w = weekSummary(base, new Date(2026, 9, 19), new Date(2026, 9, 25, 20));
        expect(weeklyTip(w)).toBe('weekly.tip.plan');
        expect(weeklyTip({ ...w, workouts: 3 })).toBe('weekly.tip.water');
        expect(weeklyTip({ ...w, workouts: 3, waterDays: 5 })).toBe('weekly.tip.steps');
        expect(weeklyTip({ ...w, workouts: 3, waterDays: 5, stepDays: 4 })).toBe('weekly.tip.great');
        expect(weeklyTip({ ...w, workouts: 0 })).toBe('weekly.tip.start');
        expect(weeklyTip(w, true)).toBe('weekly.tip.pause');
    });

    it('goes out on Sunday at 7 pm', () => {
        expect(summaryAlertAt(new Date(2026, 9, 20, 9))).toEqual(new Date(2026, 9, 25, 19, 0, 0));
        expect(summaryAlertAt(new Date(2026, 9, 25, 18, 59))).toEqual(new Date(2026, 9, 25, 19, 0, 0));
        expect(summaryAlertAt(new Date(2026, 9, 25, 19, 1))).toEqual(new Date(2026, 10, 1, 19, 0, 0));
    });
});
