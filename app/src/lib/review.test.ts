import { describe, expect, it } from 'vitest';
import { shouldAskReview } from './review';

const DAY = 24 * 60 * 60 * 1000;

describe('asking for a store rating', () => {
    it('waits for the third workout', () => {
        expect(shouldAskReview(1, null)).toBe(false);
        expect(shouldAskReview(2, null)).toBe(false);
        expect(shouldAskReview(3, null)).toBe(true);
    });

    it('asks again only four months later, three times at most', () => {
        const now = 1_000 * DAY;
        expect(shouldAskReview(20, { at: now - 30 * DAY, count: 1 }, now)).toBe(false);
        expect(shouldAskReview(20, { at: now - 121 * DAY, count: 1 }, now)).toBe(true);
        expect(shouldAskReview(20, { at: now - 400 * DAY, count: 3 }, now)).toBe(false);
    });
});
