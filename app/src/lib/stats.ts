import { getExercise, type Muscle } from '../data/exercises';
import type { LoggedSet, Session } from '../store/types';
import { estimate1RM, volume } from './progression';

// Monday 00:00 (local time) of the week containing `date`.
export const weekStart = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - offset);
    return d;
};

// Up to the next Monday 00:00 built from the calendar date, so weeks with a
// daylight-saving change (23 or 25 hours in a day) don't overlap.
const sameWeek = (iso: string, start: Date) => {
    const t = Date.parse(iso);
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7).getTime();
    return t >= start.getTime() && t < next;
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

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// One cell per day for the last `weeks` weeks (Monday-first columns), with the
// number of sessions and volume that day. Days after `now` are marked future.
export const trainingCalendar = (sessions: Session[], weeks = 18, now = new Date()) => {
    const byDay = new Map<string, { count: number; volumeKg: number }>();
    for (const s of sessions) {
        const k = dayKey(new Date(s.startedAt));
        const cur = byDay.get(k) ?? { count: 0, volumeKg: 0 };
        byDay.set(k, { count: cur.count + 1, volumeKg: cur.volumeKg + volume(s.sets) });
    }
    const first = weekStart(now);
    first.setDate(first.getDate() - 7 * (weeks - 1));
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
        const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
        const info = byDay.get(dayKey(date)) ?? { count: 0, volumeKg: 0 };
        return { date, ...info, future: date.getTime() > today };
    }));
};

// This calendar month so far against the same days of last month: workouts,
// minutes and volume. Comparing the same number of days keeps the first days
// of a month from always looking like a drop.
export const monthCompare = (sessions: Session[], now = new Date()) => {
    const day = now.getDate();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const lastEnd = new Date(lastStart.getFullYear(), lastStart.getMonth(), Math.min(day, lastDays), 23, 59, 59, 999).getTime();
    const sum = (list: Session[]) => ({
        workouts: list.length,
        minutes: list.reduce((m, s) => m + durationMin(s), 0),
        volumeKg: list.reduce((v, s) => v + volume(s.sets), 0),
    });
    const at = (s: Session) => Date.parse(s.startedAt);
    return {
        current: sum(sessions.filter(s => at(s) >= thisStart && at(s) <= now.getTime())),
        previous: sum(sessions.filter(s => at(s) >= lastStart.getTime() && at(s) <= lastEnd)),
    };
};

// Strength now against the start, for the most trained weighted lifts: the
// best estimated 1RM of the first two sessions against the best of the last
// two. Needs at least 3 sessions with the lift.
export const strengthGains = (sessions: Session[], limit = 4) => {
    const count = new Map<string, number>();
    for (const s of sessions) for (const id of new Set(s.sets.filter(x => !x.warmup).map(x => x.exerciseId))) count.set(id, (count.get(id) ?? 0) + 1);
    return [...count]
        .filter(([id, n]) => n >= 3 && (getExercise(id)?.stepKg ?? 0) > 0 && !getExercise(id)?.timed)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => {
            const series = exerciseSeries(sessions, id);
            const best = (pts: { value: number }[]) => Math.max(...pts.map(p => p.value));
            const before = best(series.slice(0, 2));
            const after = best(series.slice(-2));
            return { exerciseId: id, beforeKg: before, nowKg: after, change: before > 0 ? (after - before) / before : 0 };
        })
        .filter(g => g.beforeKg > 0)
        .slice(0, limit);
};
