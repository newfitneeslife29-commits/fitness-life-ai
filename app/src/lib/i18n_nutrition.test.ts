import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseName, exercisePhotos } from '../data/exercises';
import { setLang, t, tp } from '../i18n';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { pt } from '../i18n/pt';
import { autoTargets, kcalFromMacros, mealsOn, onDay, sumMacros } from './nutrition';
import { existsSync } from 'node:fs';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('translations', () => {
    for (const [name, dict] of [['en', en], ['pt', pt]] as const) {
        it(`${name} has every key with the same placeholders`, () => {
            for (const key of Object.keys(es) as (keyof typeof es)[]) {
                expect(dict[key], key).toBeTruthy();
                expect(placeholders(dict[key]), key).toEqual(placeholders(es[key]));
            }
        });
    }

    it('switches language and picks plural forms', () => {
        setLang('en');
        expect(t('nav.today')).toBe('Today');
        expect(tp('common.sets', 1)).toBe('1 set');
        expect(tp('common.sets', 3)).toBe('3 sets');
        expect(exerciseName('sentadilla')).toBe('Barbell squat');
        setLang('pt');
        expect(t('today.title', { done: 1, target: 3 })).toBe('1 de 3 treinos nesta semana');
        setLang('es');
        expect(tp('progress.count', 1)).toBe('1 entreno registrado');
    });

    it('names every exercise in every language', () => {
        for (const ex of EXERCISES) {
            expect(ex.name.en && ex.name.pt && ex.name.es, ex.id).toBeTruthy();
            expect(ex.tip.en && ex.tip.pt && ex.tip.es, ex.id).toBeTruthy();
        }
    });

    it('has two photos for every exercise', () => {
        for (const ex of EXERCISES) {
            const photos = exercisePhotos(ex.id);
            expect(photos, ex.id).not.toBeNull();
            for (const src of photos ?? []) expect(existsSync(`public/${src.replace('./', '')}`), src).toBe(true);
        }
    });
});

describe('nutrition', () => {
    it('calculates targets that add up', () => {
        const m = autoTargets('musculo', 80);
        expect(m.protein).toBe(160);
        expect(m.kcal).toBe(2800);
        expect(m.fat).toBe(72);
        // Carbs fill the remaining energy.
        expect(Math.abs(kcalFromMacros(m) - m.kcal)).toBeLessThan(5);
        expect(autoTargets('salud', 80).kcal).toBeLessThan(m.kcal);
    });

    it('sums meals of one day', () => {
        const day = new Date(2026, 9, 8);
        const meals = [
            { id: 'a', name: 'A', source: 'manual' as const, date: onDay(day).toISOString(), kcal: 500, protein: 30, carbs: 50, fat: 10 },
            { id: 'b', name: 'B', source: 'ai' as const, date: onDay(day).toISOString(), kcal: 300, protein: 20, carbs: 20, fat: 15 },
            { id: 'c', name: 'C', source: 'manual' as const, date: onDay(new Date(2026, 9, 7)).toISOString(), kcal: 900, protein: 1, carbs: 1, fat: 1 },
        ];
        const today = mealsOn(meals, day);
        expect(today.map(m => m.id)).toEqual(['a', 'b']);
        expect(sumMacros(today)).toEqual({ kcal: 800, protein: 50, carbs: 70, fat: 25 });
    });
});
