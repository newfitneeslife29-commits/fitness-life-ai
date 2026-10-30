import { describe, expect, it } from 'vitest';
import { welcomeStatus } from './welcome';

const start = '2026-11-02T10:00:00.000Z';
const session = (startedAt: string) => ({ id: startedAt, startedAt, sets: [] }) as never;

describe('welcome challenge', () => {
    it('counts the steps done in the first week only', () => {
        const now = new Date('2026-11-05T10:00:00.000Z');
        const empty = welcomeStatus({ sessions: [], meals: [], water: {} }, start, now);
        expect(empty.count).toBe(0);
        expect(empty.daysLeft).toBe(4);

        const some = welcomeStatus({
            sessions: [session('2026-11-02T18:00:00.000Z'), session('2026-11-20T18:00:00.000Z')],
            meals: [{ date: '2026-11-03T12:00:00.000Z' } as never],
            water: { '2026-11-04': 250 },
        }, start, now);
        expect(some.done).toEqual({ workout: true, meal: true, water: true, three: false });
        expect(some.count).toBe(3);
    });

    it('ends after 7 days', () => {
        expect(welcomeStatus({ sessions: [], meals: [], water: {} }, start, new Date('2026-11-10T10:00:00.000Z')).daysLeft).toBe(0);
    });
});
