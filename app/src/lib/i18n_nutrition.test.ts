import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseName, exercisePhotos } from '../data/exercises';
import { setLang, t, tp } from '../i18n';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { pt } from '../i18n/pt';
import { autoTargets, bmr, goalProgress, kcalFromMacros, mealsOn, onDay, sumMacros, weeksToGoal } from './nutrition';
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
        expect(t('nav.today')).toBe('Home');
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
        const m = autoTargets({ goal: 'musculo' }, 80);
        expect(m.protein).toBe(160);
        expect(m.kcal).toBe(2800);
        expect(m.fat).toBe(72);
        // Carbs fill the remaining energy.
        expect(Math.abs(kcalFromMacros(m) - m.kcal)).toBeLessThan(5);
        expect(autoTargets({ goal: 'salud' }, 80).kcal).toBeLessThan(m.kcal);
        expect(autoTargets({ goal: 'grasa' }, 80).kcal).toBeLessThan(autoTargets({ goal: 'salud' }, 80).kcal);
    });

    it('uses sex, age, height and activity when it has them', () => {
        const now = new Date(2026, 9, 9);
        // Mifflin-St Jeor: 10·80 + 6.25·180 − 5·30 + 5 = 1780 kcal at rest.
        expect(bmr('hombre', 80, 180, 30)).toBe(1780);
        const man = { goal: 'musculo' as const, sex: 'hombre' as const, birthYear: 1996, heightCm: 180, activity: 'ligero' as const };
        // 1780 × 1.5 + 250 surplus = 2920 → 2900.
        expect(autoTargets(man, 80, now).kcal).toBe(2900);
        // Wanting to reach 75 kg: a 450 kcal deficit and more protein.
        const losing = autoTargets({ ...man, weightGoal: { startKg: 80, targetKg: 75, startedAt: now.toISOString() } }, 80, now);
        expect(losing.kcal).toBe(2200);
        expect(losing.protein).toBe(160);
        // Never below a safe floor.
        const small = autoTargets({ goal: 'grasa', sex: 'mujer', birthYear: 1950, heightCm: 150, activity: 'sedentario' }, 45, now);
        expect(small.kcal).toBe(1200);
    });

    it('estimates time and progress towards a weight goal', () => {
        expect(weeksToGoal(80, 75)).toBe(10); // 0.5 kg a week down
        expect(weeksToGoal(60, 62)).toBe(8); // 0.25 kg a week up
        expect(weeksToGoal(70, 70.2)).toBe(0);
        expect(goalProgress({ startKg: 80, targetKg: 70 }, 75)).toBe(0.5);
        expect(goalProgress({ startKg: 80, targetKg: 70 }, 82)).toBe(0);
        expect(goalProgress({ startKg: 60, targetKg: 64 }, 65)).toBe(1);
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
