import { describe, expect, it } from 'vitest';
import { challengeAvailable, challengeDef, challengeStatus } from './challenges';
import type { Session } from '../store/types';

const session = (day: number, exerciseId = 'press-banca'): Session => {
    const at = new Date(2026, 9, day, 18).toISOString();
    return { id: `s${day}${exerciseId}`, routineId: null, routineName: 'X', startedAt: at, endedAt: at, sets: [{ id: 'a', exerciseId, setIndex: 0, weightKg: 0, reps: 10, completedAt: at }] };
};
const empty = { sessions: [] as Session[], cardio: [], steps: {}, activeDays: [] as string[] };

describe('30-day challenges', () => {
    const joined = { id: 'workouts12', joinedAt: new Date(2026, 9, 1, 9).toISOString() };

    it('counts only what happens after joining, for 30 days', () => {
        const data = { ...empty, sessions: [session(1), session(2), session(5)] };
        const before = { ...data, sessions: [...data.sessions, { ...session(1), id: 'old', startedAt: new Date(2026, 8, 28).toISOString() }] };
        expect(challengeStatus(joined, before, new Date(2026, 9, 10))).toEqual({ progress: 3, target: 12, daysLeft: 22, state: 'running' });
    });

    it('is done at the goal, and over after 30 days', () => {
        const twelve = { ...empty, sessions: Array.from({ length: 12 }, (_, i) => session(i + 1)) };
        expect(challengeStatus(joined, twelve, new Date(2026, 9, 15)).state).toBe('done');
        expect(challengeStatus(joined, { ...empty, sessions: [session(3)] }, new Date(2026, 10, 2)).state).toBe('ended');
    });

    it('core days, steps days and active days', () => {
        const core = { id: 'core', joinedAt: joined.joinedAt };
        expect(challengeStatus(core, { ...empty, sessions: [session(2, 'plancha'), session(2, 'crunch'), session(3, 'press-banca')] }, new Date(2026, 9, 5)).progress).toBe(1);
        const steps = { id: 'steps10k', joinedAt: joined.joinedAt };
        expect(challengeStatus(steps, { ...empty, steps: { '2026-10-02': 12000, '2026-10-03': 9000, '2026-10-04': 10000 } }, new Date(2026, 9, 5)).progress).toBe(2);
        const active = { id: 'consistency', joinedAt: joined.joinedAt };
        expect(challengeStatus(active, { ...empty, activeDays: ['2026-10-01', '2026-10-02'], sessions: [session(2), session(4)] }, new Date(2026, 9, 5)).progress).toBe(3);
    });
});

describe('25 days to Christmas (calendar challenge)', () => {
    const advent = challengeDef('advent')!;
    const joined = { id: 'advent', joinedAt: new Date(2026, 10, 27, 9).toISOString() };
    const active = (days: number[]) => ({ ...empty, activeDays: days.map(d => `2026-12-${String(d).padStart(2, '0')}`) });

    it('can be joined from Nov 25 to Dec 25 only', () => {
        expect(challengeAvailable(advent, new Date(2026, 10, 24, 12))).toBe(false);
        expect(challengeAvailable(advent, new Date(2026, 10, 25, 0, 1))).toBe(true);
        expect(challengeAvailable(advent, new Date(2026, 11, 25, 23))).toBe(true);
        expect(challengeAvailable(advent, new Date(2026, 11, 26, 0, 1))).toBe(false);
        expect(challengeAvailable(challengeDef('core')!, new Date(2026, 5, 1))).toBe(true);
    });

    it('counts active days from Dec 1, not from joining', () => {
        const data = { ...active([1, 2, 3]), activeDays: ['2026-11-28', '2026-12-01', '2026-12-02', '2026-12-03'] };
        expect(challengeStatus(joined, data, new Date(2026, 10, 29)).progress).toBe(0);
        expect(challengeStatus(joined, data, new Date(2026, 11, 3, 20))).toEqual({ progress: 3, target: 20, daysLeft: 23, state: 'running' });
    });

    it('is done at 20 days and over after Christmas', () => {
        expect(challengeStatus(joined, active(Array.from({ length: 20 }, (_, i) => i + 1)), new Date(2026, 11, 20, 20)).state).toBe('done');
        const late = challengeStatus(joined, active([1, 2]), new Date(2026, 11, 26, 9));
        expect(late.state).toBe('ended');
        expect(late.progress).toBe(2);
    });

    it('joining late still counts the days already active in December', () => {
        const lateJoin = { id: 'advent', joinedAt: new Date(2026, 11, 10).toISOString() };
        expect(challengeStatus(lateJoin, active([2, 5, 9, 10]), new Date(2026, 11, 10, 20)).progress).toBe(4);
    });
});
