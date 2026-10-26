import { describe, expect, it } from 'vitest';
import { activitySummary } from './activity';
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

describe('streak protector', () => {
    // Thursday 22 October 2026; the week started on Monday the 19th.
    const now = new Date(2026, 9, 22, 18, 0);
    it('one missed day a week keeps the streak', () => {
        const s = activitySummary(['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-21', '2026-10-22'], [], now);
        expect(s.activeStreak).toBe(5);
        expect(s.streakSaved).toEqual(['2026-10-20']);
        expect(s.protectorLeft).toBe(false);
    });
    it('two missed days in a row, or two in a week, break it', () => {
        expect(activitySummary(['2026-10-18', '2026-10-21', '2026-10-22'], [], now).activeStreak).toBe(2);
        // 20 and 22 are in the same week: only the later one is covered.
        expect(activitySummary(['2026-10-19', '2026-10-21', '2026-10-23'], [], new Date(2026, 9, 23, 18)).activeStreak).toBe(2);
    });
    it('last week\'s missed day leaves this week\'s protector free', () => {
        const s = activitySummary(['2026-10-16', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'], [], now);
        expect(s.activeStreak).toBe(6);
        expect(s.streakSaved).toEqual(['2026-10-17']);
        expect(s.protectorLeft).toBe(true);
    });
});
