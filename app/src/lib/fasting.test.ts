import { describe, expect, it } from 'vitest';
import { fastProgress, fmtHoursMin } from './fasting';

describe('intermittent fasting', () => {
    const start = '2026-10-20T20:00:00Z';
    it('counts toward the goal', () => {
        const p = fastProgress(start, 16, Date.parse('2026-10-21T04:00:00Z'));
        expect(p).toMatchObject({ elapsedMs: 8 * 3_600_000, leftMs: 8 * 3_600_000, reached: false, pct: 50 });
        expect(p.goalAt).toBe(Date.parse('2026-10-21T12:00:00Z'));
    });

    it('reaches it and stays full', () => {
        expect(fastProgress(start, 16, Date.parse('2026-10-21T13:00:00Z'))).toMatchObject({ reached: true, pct: 100, leftMs: 0 });
    });

    it('formats hours and minutes', () => {
        expect(fmtHoursMin(16 * 3_600_000 + 5 * 60_000 + 59_000)).toBe('16 h 05 min');
        expect(fmtHoursMin(0)).toBe('0 h 00 min');
        expect(fmtHoursMin(16 * 3_600_000 - 1000, true)).toBe('16 h 00 min');
    });
});
