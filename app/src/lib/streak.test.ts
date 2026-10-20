import { describe, expect, it } from 'vitest';
import { streakAlertAt } from './streak';

describe('streak reminder', () => {
    it('reminds tomorrow at 8 pm from a 2-day streak on', () => {
        const now = new Date(2026, 9, 20, 9, 30);
        expect(streakAlertAt(0, now)).toBeNull();
        expect(streakAlertAt(1, now)).toBeNull();
        expect(streakAlertAt(2, now)).toEqual(new Date(2026, 9, 21, 20, 0, 0));
    });

    it('crosses months', () => {
        expect(streakAlertAt(5, new Date(2026, 9, 31, 23, 0))).toEqual(new Date(2026, 10, 1, 20, 0, 0));
    });
});
