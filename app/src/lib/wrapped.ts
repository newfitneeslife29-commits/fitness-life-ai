import { getExercise } from '../data/exercises';
import type { Session } from '../store/types';
import { localDay } from './activity';
import { durationMin } from './stats';
import { estimate1RM, volume } from './progression';

// "Gym Wrapped": a month of training in numbers, for the share cards.

// Fun things to compare the weight lifted with (kg), heaviest first.
export const THINGS = [
    { key: 'whale', kg: 150_000, emoji: '🐋' },
    { key: 'bus', kg: 12_000, emoji: '🚌' },
    { key: 'elephant', kg: 6_000, emoji: '🐘' },
    { key: 'rhino', kg: 2_300, emoji: '🦏' },
    { key: 'car', kg: 1_500, emoji: '🚗' },
    { key: 'bear', kg: 400, emoji: '🐻' },
    { key: 'panda', kg: 100, emoji: '🐼' },
    { key: 'dog', kg: 30, emoji: '🐕' },
] as const;
export type Thing = (typeof THINGS)[number]['key'];

// The heaviest thing lifted at least once ("2 elephants"), or null under 30 kg.
export const equivalent = (kg: number): { key: Thing; emoji: string; count: number } | null => {
    const thing = THINGS.find(x => kg >= x.kg);
    return thing ? { key: thing.key, emoji: thing.emoji, count: Math.floor(kg / thing.kg) } : null;
};

export interface MonthRecord {
    exerciseId: string;
    weightKg: number;
    reps: number;
    isNew: boolean; // better than anything before this month
}

export interface MonthWrap {
    year: number;
    month: number;
    sessions: number;
    sets: number;
    reps: number;
    volumeKg: number;
    minutes: number;
    trainedDays: Set<string>;
    records: MonthRecord[];
}

export const monthWrap = (all: Session[], year: number, month: number): MonthWrap => {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    const inMonth = all.filter(s => { const t = Date.parse(s.startedAt); return t >= start && t < end; });
    const before = all.filter(s => Date.parse(s.startedAt) < start);
    const bestBefore = new Map<string, number>();
    for (const s of before) for (const x of s.sets) {
        if (x.warmup || x.reps <= 0) continue;
        bestBefore.set(x.exerciseId, Math.max(bestBefore.get(x.exerciseId) ?? 0, estimate1RM(x.weightKg, x.reps)));
    }
    // Best set of the month per weighted exercise.
    const best = new Map<string, { weightKg: number; reps: number; e1rm: number }>();
    for (const s of inMonth) for (const x of s.sets) {
        if (x.warmup || x.reps <= 0 || x.weightKg <= 0 || getExercise(x.exerciseId)?.timed) continue;
        const e1rm = estimate1RM(x.weightKg, x.reps);
        if (e1rm > (best.get(x.exerciseId)?.e1rm ?? 0)) best.set(x.exerciseId, { weightKg: x.weightKg, reps: x.reps, e1rm });
    }
    const records = [...best].map(([exerciseId, b]) => ({
        exerciseId, weightKg: b.weightKg, reps: b.reps, e1rm: b.e1rm,
        isNew: bestBefore.has(exerciseId) && b.e1rm > bestBefore.get(exerciseId)!,
    }))
        // New records first, then the heaviest lifts.
        .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.e1rm - a.e1rm)
        .slice(0, 5)
        .map(({ e1rm: _e, ...r }) => r);
    return {
        year, month,
        sessions: inMonth.length,
        sets: inMonth.reduce((n, s) => n + s.sets.filter(x => !x.warmup).length, 0),
        reps: inMonth.reduce((n, s) => n + s.sets.filter(x => !x.warmup && !getExercise(x.exerciseId)?.timed).reduce((r, x) => r + x.reps, 0), 0),
        volumeKg: inMonth.reduce((v, s) => v + volume(s.sets), 0),
        minutes: inMonth.reduce((m, s) => m + durationMin(s), 0),
        trainedDays: new Set(inMonth.map(s => localDay(new Date(s.startedAt)))),
        records,
    };
};
