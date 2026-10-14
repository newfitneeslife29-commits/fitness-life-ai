import { describe, expect, it } from 'vitest';
import { cleanMealPlan, timeOf } from '../../../supabase/functions/nutrition-coach/mealplan';

describe('meal plan from the AI (server)', () => {
    it('keeps known slots, orders meals by time and fixes bad times', () => {
        const plan = cleanMealPlan({
            name: 'Plan para ganar músculo', note: 'Cocina el arroz para tres días.',
            days: [{
                meals: [
                    { slot: 'cena', time: '20:30', name: 'Pollo con arroz', foods: ['150 g de pollo', '1 taza de arroz'], kcal: 650.4, protein: 48, carbs: 70, fat: 14 },
                    { slot: 'desayuno', time: '7:00', name: 'Avena con huevos', foods: ['60 g de avena', '2 huevos'], kcal: 450, protein: 25, carbs: 50, fat: 15 },
                    { slot: 'brunch', time: 'mediodía', name: 'Batido', foods: [], kcal: 200, protein: 25, carbs: 10, fat: 3 },
                ],
            }],
        });
        expect(plan.days).toHaveLength(7); // one day repeated over the week
        const meals = plan.days[0].meals;
        expect(meals.map(m => [m.slot, m.time])).toEqual([['desayuno', '07:00'], ['snack', '16:00'], ['cena', '20:30']]);
        expect(meals[2]).toMatchObject({ name: 'Pollo con arroz', kcal: 650, foods: ['150 g de pollo', '1 taza de arroz'] });
    });

    it('drops empty meals and days, and returns no days when nothing is left', () => {
        expect(cleanMealPlan({ name: 'x', note: 'No es sobre comida.', days: [{ meals: [{ slot: 'cena', name: '', foods: [] }] }] }).days).toEqual([]);
        expect(cleanMealPlan({}).days).toEqual([]);
    });

    it('accepts only real clock times', () => {
        expect(timeOf('25:00', 'almuerzo')).toBe('13:30');
        expect(timeOf('9:05', 'desayuno')).toBe('09:05');
    });
});
