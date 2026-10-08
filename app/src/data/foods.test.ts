import { describe, expect, it } from 'vitest';
import { setLang } from '../i18n';
import { FOOD_CATEGORIES, FOODS, foodMacros, foodTags, getFood, searchFoods } from './foods';

describe('food table', () => {
    it('has unique ids, names in every language and sensible portions', () => {
        expect(new Set(FOODS.map(f => f.id)).size).toBe(FOODS.length);
        expect(FOODS.length).toBeGreaterThanOrEqual(90);
        for (const f of FOODS) {
            expect(FOOD_CATEGORIES).toContain(f.category);
            for (const lang of ['es', 'en', 'pt'] as const) {
                expect(f.name[lang].length).toBeGreaterThan(1);
                expect(f.portion.label[lang].length).toBeGreaterThan(1);
            }
            expect(f.portion.grams).toBeGreaterThan(0);
        }
    });

    // Calories must match the macros (4/4/9 kcal per gram, fiber about 2), so a typo shows up.
    it('calories agree with protein, carbs and fat', () => {
        for (const f of FOODS.filter(f => !f.alcohol)) {
            const { kcal, protein, carbs, fat, fiber } = f.per100;
            const fromMacros = protein * 4 + (carbs - fiber) * 4 + fiber * 2 + fat * 9;
            expect(Math.abs(fromMacros - kcal), f.id).toBeLessThanOrEqual(Math.max(15, kcal * 0.15));
            expect(protein + carbs + fat, f.id).toBeLessThanOrEqual(100.5);
            expect(fiber, f.id).toBeLessThanOrEqual(carbs);
        }
    });

    it('scales to a portion', () => {
        const egg = getFood('huevo')!;
        expect(foodMacros(egg, egg.portion.grams)).toEqual({ kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 });
        expect(foodMacros(getFood('pechuga-pollo')!, 100).protein).toBe(31);
    });

    it('tags foods sensibly', () => {
        expect(foodTags(getFood('pechuga-pollo')!)).toContain('highProtein');
        expect(foodTags(getFood('espinaca')!)).not.toContain('highProtein');
        expect(foodTags(getFood('almendras')!)).toContain('highFat');
        expect(foodTags(getFood('lentejas')!)).toContain('highFiber');
        expect(foodTags(getFood('huevo')!)).toContain('lowCarb');
    });

    it('searches any language, ignoring accents and case', () => {
        setLang('es');
        expect(searchFoods('salmon').map(f => f.id)).toContain('salmon');
        expect(searchFoods('CHICKEN').map(f => f.id)).toContain('pechuga-pollo');
        expect(searchFoods('', 'fish').every(f => f.category === 'fish')).toBe(true);
    });
});
