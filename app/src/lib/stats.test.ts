import { describe, expect, it } from 'vitest';
import type { Session } from '../store/types';
import { monthCompare, strengthGains } from './stats';

describe('month comparison and strength gains', () => {
    const mk = (id: string, iso: string, kg: number, minutes = 50): Session => ({
        id, routineId: null, routineName: 'x', startedAt: iso, endedAt: new Date(Date.parse(iso) + minutes * 60_000).toISOString(), activeSec: 0, restSec: 0,
        sets: [{ id: id + 's', exerciseId: 'press-banca', setIndex: 0, weightKg: kg, reps: 5, completedAt: iso }],
    } as Session);
    it('compares this month with the same days of last month', () => {
        const now = new Date(2026, 10, 10, 12);
        const list = [mk('a', new Date(2026, 10, 3).toISOString(), 60), mk('b', new Date(2026, 9, 5).toISOString(), 50), mk('c', new Date(2026, 9, 20).toISOString(), 50)];
        const r = monthCompare(list, now);
        expect(r.current.workouts).toBe(1);
        expect(r.previous.workouts).toBe(1); // Oct 20 is after Oct 10
        expect(r.current.minutes).toBe(50);
    });
    it('finds how much stronger the most trained lifts got', () => {
        const list = [mk('d', '2026-11-05T10:00:00Z', 70), mk('c', '2026-10-25T10:00:00Z', 65), mk('b', '2026-10-15T10:00:00Z', 60), mk('a', '2026-10-05T10:00:00Z', 55)];
        const [g] = strengthGains(list);
        expect(g.exerciseId).toBe('press-banca');
        expect(g.nowKg).toBeGreaterThan(g.beforeKg);
        expect(g.change).toBeCloseTo((70 - 60) / 60, 2);
    });
});
