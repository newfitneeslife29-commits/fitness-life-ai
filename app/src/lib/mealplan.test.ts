import { describe, expect, it } from 'vitest';
import { setLang } from '../i18n';
import { loggedKeys, mealDate, mealReminders, planDayOf, planKey } from './mealplan';
import type { Meal, MealPlan } from '../store/types';

const meal = (slot: 'desayuno' | 'cena', time: string, name: string) =>
    ({ slot, time, name, foods: ['2 huevos', '1 arepa'], kcal: 500, protein: 30, carbs: 50, fat: 15 });

const plan: MealPlan = {
    id: 'p1', name: 'Plan', note: '', request: '', createdAt: '2026-10-14T10:00:00.000Z',
    days: Array.from({ length: 7 }, (_, d) => ({ meals: [meal('desayuno', '07:30', `Desayuno ${d}`), meal('cena', '20:00', `Cena ${d}`)] })),
};

describe('meal plan', () => {
    it('counts the week from Monday', () => {
        expect(planDayOf(new Date(2026, 9, 12))).toBe(0); // Monday 12 Oct 2026
        expect(planDayOf(new Date(2026, 9, 18))).toBe(6); // Sunday
    });

    it('reminds each meal once a week at its time, on the right weekday', () => {
        setLang('es');
        const list = mealReminders(plan);
        expect(list).toHaveLength(14);
        expect(new Set(list.map(r => r.id)).size).toBe(14);
        // Monday (plan day 0) is weekday 2 for the notification calendar; Sunday is 1.
        expect(list[0]).toMatchObject({ weekday: 2, hour: 7, minute: 30, title: 'Desayuno · 07:30', body: 'Desayuno 0: 2 huevos, 1 arepa' });
        expect(list[13]).toMatchObject({ weekday: 1, hour: 20, minute: 0, title: 'Cena · 20:00' });
    });

    it('knows which plan meals were logged on a day', () => {
        const day = new Date(2026, 9, 14);
        const logged: Meal = { id: 'm', name: 'Cena 2', source: 'ai', kcal: 500, protein: 30, carbs: 50, fat: 15, planKey: planKey(plan, 2, 1), date: mealDate(day, '20:00').toISOString() };
        expect([...loggedKeys([logged], day)]).toEqual(['p1:2:1']);
        expect(loggedKeys([logged], new Date(2026, 9, 15)).size).toBe(0);
    });
});

