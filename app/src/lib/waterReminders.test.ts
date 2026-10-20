import { describe, expect, it } from 'vitest';
import { waterAlerts } from './waterReminders';

describe('water reminders', () => {
    it('every 2 hours for the rest of today, and tomorrow morning', () => {
        const alerts = waterAlerts(1000, 3000, new Date(2026, 9, 20, 13, 30));
        expect(alerts.map(a => a.at.getHours())).toEqual([14, 16, 18, 20, 10]);
        expect(alerts[0].body).toBe("You've had 1 of 3 L today.");
        expect(alerts.at(-1)!.at.getDate()).toBe(21);
        expect(alerts.at(-1)!.body).toBe("Today's goal: 3 L. Start with a glass!");
    });

    it('none today once the goal is reached', () => {
        expect(waterAlerts(3000, 3000, new Date(2026, 9, 20, 9)).map(a => a.at.getDate())).toEqual([21]);
    });
});
