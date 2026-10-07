import { getExercise, type Muscle } from '../data/exercises';
import type { LoggedSet, Session } from '../store/types';
import { estimate1RM, volume } from './progression';

const DAY_MS = 86_400_000;

// Monday 00:00 (local time) of the week containing `date`.
export const weekStart = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - offset);
    return d;
};

const sameWeek = (iso: string, start: Date) => {
    const t = Date.parse(iso);
    return t >= start.getTime() && t < start.getTime() + 7 * DAY_MS + 3_600_000; // +1h covers DST shifts
};

export const sessionsThisWeek = (sessions: Session[], now = new Date()) => {
    const start = weekStart(now);
    return sessions.filter(s => sameWeek(s.startedAt, start));
};

// Sessions and volume per week, oldest first, for the last `weeks` weeks.
export const weeklySeries = (sessions: Session[], weeks = 8, now = new Date()) => {
    const current = weekStart(now);
    return Array.from({ length: weeks }, (_, i) => {
        const start = new Date(current);
        start.setDate(start.getDate() - 7 * (weeks - 1 - i));
        const inWeek = sessions.filter(s => sameWeek(s.startedAt, start));
        return {
            weekStart: start,
            sessions: inWeek.length,
            volumeKg: inWeek.reduce((t, s) => t + volume(s.sets), 0),
        };
    });
};

// Consecutive weeks with at least one session, counting back from this week
// (or from last week, if nothing has been logged yet this week).
export const streakWeeks = (sessions: Session[], now = new Date()) => {
    let start = weekStart(now);
    const has = (d: Date) => sessions.some(s => sameWeek(s.startedAt, d));
    if (!has(start)) start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
    let streak = 0;
    while (has(start)) {
        streak++;
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
    }
    return streak;
};

// Working sets per primary muscle.
export const setsPerMuscle = (sessions: Session[]): Partial<Record<Muscle, number>> => {
    const counts: Partial<Record<Muscle, number>> = {};
    for (const s of sessions) {
        for (const set of s.sets) {
            if (set.warmup) continue;
            const muscle = getExercise(set.exerciseId)?.muscle;
            if (muscle) counts[muscle] = (counts[muscle] ?? 0) + 1;
        }
    }
    return counts;
};

// Best estimated 1RM per session for one exercise, oldest first.
// Bodyweight exercises chart their best reps instead.
export const exerciseSeries = (sessions: Session[], exerciseId: string) => {
    const bodyweight = (getExercise(exerciseId)?.stepKg ?? 1) === 0;
    return sessions
        .map(s => {
            const sets = s.sets.filter(x => x.exerciseId === exerciseId && !x.warmup);
            if (sets.length === 0) return null;
            const value = bodyweight
                ? Math.max(...sets.map(x => x.reps))
                : Math.max(...sets.map(x => estimate1RM(x.weightKg, x.reps)));
            return { date: s.startedAt, value };
        })
        .filter((p): p is { date: string; value: number } => p !== null)
        .reverse();
};

// Sets of the most recent session that included this exercise.
export const lastPerformance = (sessions: Session[], exerciseId: string): LoggedSet[] => {
    for (const s of sessions) {
        const sets = s.sets.filter(x => x.exerciseId === exerciseId);
        if (sets.length > 0) return sets.sort((a, b) => a.setIndex - b.setIndex);
    }
    return [];
};

export const durationMin = (s: Pick<Session, 'startedAt' | 'endedAt'>) =>
    Math.max(1, Math.round((Date.parse(s.endedAt) - Date.parse(s.startedAt)) / 60_000));
