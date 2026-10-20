import { describe, expect, it } from 'vitest';
import { productToFood, validBarcode } from './barcode';

describe('foods by barcode (Open Food Facts)', () => {
    it('accepts EAN-8, UPC and EAN-13 numbers only', () => {
        expect(validBarcode('12345678')).toBe(true);
        expect(validBarcode('7501055300075')).toBe(true);
        expect(validBarcode('1234567')).toBe(false);
        expect(validBarcode('75010553abc')).toBe(false);
    });

    it('turns a product into a food with its serving', () => {
        const r = productToFood('7501055300075', {
            product_name: 'Greek yogurt', product_name_es: 'Yogur griego', brands: 'Lala, Otro', serving_quantity: '150', serving_quantity_unit: 'g',
            nutriments: { 'energy-kcal_100g': 97, proteins_100g: 9.04, carbohydrates_100g: 3.98, fat_100g: 5, fiber_100g: 0 },
        }, 'es');
        expect(r).toMatchObject({
            brand: 'Lala',
            food: { id: 'barcode:7501055300075', name: { es: 'Yogur griego' }, per100: { kcal: 97, protein: 9, carbs: 4, fat: 5 }, portion: { grams: 150 } },
        });
    });

    it('uses kJ when there are no kcal, and 100 g without a serving', () => {
        const r = productToFood('12345678', { product_name: 'Oats', nutriments: { energy_100g: 1569, proteins_100g: 13 } }, 'en');
        expect(r).toMatchObject({ food: { per100: { kcal: 375, protein: 13, carbs: 0 }, portion: { grams: 100, label: { en: '100 g' } } } });
    });

    it('says when there is nothing to log', () => {
        expect(productToFood('12345678', { product_name: '' })).toBe('notFound');
        expect(productToFood('12345678', { product_name: 'Water', nutriments: {} })).toBe('noNutrition');
    });
});
