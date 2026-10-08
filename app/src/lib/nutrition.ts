import type { Goal, Macros, Meal } from '../store/types';

// Daily targets from body weight and goal. Without height, age or activity
// this is a starting point, not a prescription: the user can edit it.
// Protein per kg follows common sports-nutrition ranges (1.6–2.2 g/kg).
const PER_KG: Record<Goal, { kcal: number; protein: number; fat: number }> = {
    musculo: { kcal: 35, protein: 2.0, fat: 0.9 }, // small surplus
    fuerza: { kcal: 33, protein: 1.8, fat: 0.9 },
    salud: { kcal: 30, protein: 1.6, fat: 0.8 },
};

export const autoTargets = (goal: Goal, weightKg: number): Macros => {
    const k = PER_KG[goal];
    const kcal = Math.round((weightKg * k.kcal) / 50) * 50;
    const protein = Math.round(weightKg * k.protein);
    const fat = Math.round(weightKg * k.fat);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal, protein, carbs, fat };
};

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const sumMacros = (items: Macros[]): Macros =>
    items.reduce((t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat }), ZERO);

export const sameDay = (iso: string, day: Date) => new Date(iso).toDateString() === day.toDateString();

export const mealsOn = (meals: Meal[], day: Date) => meals.filter(m => sameDay(m.date, day));

// Energy from macros, for checking what a user typed adds up.
export const kcalFromMacros = (m: Omit<Macros, 'kcal'>) => Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);

// A timestamp on `day` keeping the current time of day, so meals logged for
// another day still sort in the order they were added.
export const onDay = (day: Date, now = new Date()) => {
    const d = new Date(day);
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return d;
};
