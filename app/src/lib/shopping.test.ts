import { describe, expect, it } from 'vitest';
import { categoryOf, parseFood, shoppingList, splitFoods } from './shopping';

describe('shopping list', () => {
    it('reads amounts and units', () => {
        expect(parseFood('150 g de pechuga a la plancha')).toEqual({ qty: 150, unit: 'g', name: 'pechuga a la plancha' });
        expect(parseFood('1,5 kg de patatas')).toEqual({ qty: 1500, unit: 'g', name: 'patatas' });
        expect(parseFood('200 ml de leche desnatada')).toEqual({ qty: 200, unit: 'ml', name: 'leche desnatada' });
        expect(parseFood('1 cda de aceite')).toEqual({ qty: 1, unit: 'spoon', name: 'aceite' });
        expect(parseFood('2 eggs')).toEqual({ qty: 2, unit: '', name: 'eggs' });
        expect(parseFood('espinacas')).toEqual({ qty: null, unit: '', name: 'espinacas' });
    });

    it('splits the foods of a meal', () => {
        expect(splitFoods('2 huevos, espinacas, 1 tostada integral y 1 kiwi')).toEqual(['2 huevos', 'espinacas', '1 tostada integral', '1 kiwi']);
        expect(splitFoods('Pan con tomate')).toEqual(['Pan con tomate']);
    });

    it('adds up the week and sorts by section', () => {
        const list = shoppingList(['80 g de avena, 1 plátano', '2 huevos, 1 plátano', '40 g de avena', '1 huevo, espinacas', 'espinacas'], 2);
        const flat = Object.fromEntries(list.flatMap(s => s.items.map(i => [i.name, [s.category, i.amount]])));
        expect(flat).toMatchObject({
            Avena: ['grains', '240 g'],
            'Plátano': ['fruit', '× 4'],
            Huevos: ['eggsDairy', '× 6'],
            Espinacas: ['veg', '× 4'],
        });
    });

    it('knows the sections in other languages', () => {
        expect(categoryOf('grilled chicken breast')).toBe('meat');
        expect(categoryOf('iogurte grego natural')).toBe('eggsDairy');
        expect(categoryOf('salmón')).toBe('fish');
        expect(categoryOf('something unknown')).toBe('other');
        expect(categoryOf('avena con leche')).toBe('grains');
        expect(categoryOf('frutos rojos')).toBe('fruit');
    });
});
