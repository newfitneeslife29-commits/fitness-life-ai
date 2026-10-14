import { MEAL_SLOTS, type MealSlot } from './prompt.ts';

// Turns the model's meal plan into one the app can trust: known meal slots,
// "HH:MM" times in order, short texts, whole-number macros and 7 days.

// When the model gives no usable time, a usual one for the meal.
const SLOT_TIME: Record<MealSlot, string> = {
  desayuno: '08:00', 'media-manana': '10:30', almuerzo: '13:30', merienda: '17:00', cena: '20:30', snack: '16:00',
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max).trim() : '');
const amount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), 10_000) : 0;
};

export const timeOf = (v: unknown, slot: MealSlot) => {
  const m = typeof v === 'string' ? /^(\d{1,2}):(\d{2})$/.exec(v.trim()) : null;
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return SLOT_TIME[slot];
  return `${m[1].padStart(2, '0')}:${m[2]}`;
};

export const cleanMealPlan = (raw: { name?: unknown; note?: unknown; days?: unknown }) => {
  const days = (Array.isArray(raw.days) ? raw.days : []).slice(0, 7).map(d => {
    const list = (d as { meals?: unknown })?.meals;
    const meals = (Array.isArray(list) ? list : []).slice(0, 6).flatMap(m => {
      const x = (m ?? {}) as Record<string, unknown>;
      const slot = MEAL_SLOTS.find(s => s === x.slot) ?? 'snack';
      const foods = (Array.isArray(x.foods) ? x.foods : []).slice(0, 8).map(f => text(f, 80)).filter(Boolean);
      const name = text(x.name, 60) || foods[0];
      if (!name) return [];
      return [{ slot, time: timeOf(x.time, slot), name, foods, kcal: amount(x.kcal), protein: amount(x.protein), carbs: amount(x.carbs), fat: amount(x.fat) }];
    }).sort((a, b) => a.time.localeCompare(b.time));
    return { meals };
  });
  // Empty or missing days take another day's menu; the others keep their weekday.
  const full = days.filter(d => d.meals.length);
  return {
    name: text(raw.name, 60),
    note: text(raw.note, 400),
    days: full.length ? Array.from({ length: 7 }, (_, i) => (days[i]?.meals.length ? days[i] : full[i % full.length])) : [],
  };
};
