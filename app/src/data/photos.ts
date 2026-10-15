import type { CardioKind, MealSlot } from '../store/types';
import type { Cover } from './covers';

// Food photos (public/food, 4:3) for meals and recipes, and outdoor photos
// (public/move, 4:5) for walks, runs and rides; see CREDITS.txt in each
// folder. Picked by a stable hash, so a meal or a day keeps its photo. FOCUS
// keeps the dish or the person in frame (object-position).

const FOOD_FOCUS: Record<string, string> = {
    'desayuno-1': '64% 55%',
    'desayuno-6': '56% 50%',
    'snack-2': '45% 50%',
    'plato-8': '45% 88%',
};

const MOVE_FOCUS: Record<string, string> = {
    'bici-1': '50% 49%',
    'bici-2': '51% 30%',
    'bici-3': '50% 58%',
    'bici-4': '50% 41%',
    'bici-5': '64% 55%',
    'bici-6': '58% 43%',
    'bici-7': '50% 58%',
    'bici-8': '50% 49%',
    'correr-1': '43% 31%',
    'correr-2': '50% 25%',
    'correr-3': '55% 33%',
    'correr-4': '51% 40%',
    'correr-5': '50% 39%',
    'correr-6': '61% 67%',
    'correr-7': '55% 43%',
    'correr-8': '50% 55%',
};

const series = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);
const BREAKFASTS = series('desayuno', 10);
const SNACKS = series('snack', 3);
const DISHES = series('plato', 11);

// Walks and runs share the running photos; the people walking come first for walks.
const MOVE: Record<CardioKind, string[]> = {
    walk: ['correr-8', 'correr-7', 'correr-4', 'correr-5'],
    run: ['correr-4', 'correr-3', 'correr-5', 'correr-2', 'correr-6', 'correr-1'],
    bike: ['bici-4', 'bici-1', 'bici-5', 'bici-6', 'bici-2', 'bici-3', 'bici-7', 'bici-8'],
};

// Wide headers: photos that still read well cut to a short band.
const FOOD_HEROES = ['desayuno-4', 'plato-2', 'snack-1', 'plato-9', 'desayuno-9', 'plato-10'];
const MOVE_HEROES = ['correr-3', 'correr-4', 'correr-5', 'bici-1', 'correr-8', 'bici-5'];

const food = (name: string): Cover => ({ src: `./food/${name}.webp`, position: FOOD_FOCUS[name] ?? '50% 50%' });
const move = (name: string): Cover => ({ src: `./move/${name}.webp`, position: MOVE_FOCUS[name] ?? '50% 40%' });

// FNV-1a: close strings ("Pollo 1", "Pollo 2") still land far apart.
const hashOf = (s: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return h;
};
const pick = (list: string[], seed: string) => list[hashOf(seed) % list.length];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const POOLS: Record<MealSlot, string[][]> = {
    desayuno: [BREAKFASTS],
    'media-manana': [SNACKS, BREAKFASTS],
    merienda: [SNACKS, BREAKFASTS],
    snack: [SNACKS, BREAKFASTS],
    almuerzo: [DISHES],
    cena: [DISHES],
};

// One photo per planned meal of a day (by its slot, name and the day of the
// plan), never the same photo twice in that day.
export const mealPhotos = (meals: { slot: MealSlot; name: string }[], day: number): Cover[] => {
    const used = new Set<string>();
    return meals.map(m => {
        const h = hashOf(`${m.name}|${day}`);
        const order = (POOLS[m.slot] ?? [DISHES]).flatMap(pool => pool.map((_, i) => pool[(h + i) % pool.length]));
        const name = order.find(n => !used.has(n)) ?? order[0];
        used.add(name);
        return food(name);
    });
};

// A recipe's photo, by its name: breakfast words get a breakfast, snack
// words a snack, anything else a dish (es, en, pt).
const BREAKFAST_WORDS = /huevo|\bovos?\b|\beggs?\b|tostad|torrada|toast|avena|aveia|\boats?\b|pancake|panqueque|hotcake|desayuno|breakfast|café da manhã/;
const SNACK_WORDS = /yogur|iogurte|fruta|fruit|batido|smoothie|vitamina|snack|merienda|lanche|açaí|acai/;
export const recipePhoto = (name: string): Cover => {
    const key = name.trim().toLowerCase();
    const pool = BREAKFAST_WORDS.test(key) ? BREAKFASTS : SNACK_WORDS.test(key) ? [...SNACKS, 'desayuno-3', 'desayuno-7'] : DISHES;
    return food(pick(pool, key));
};

// The Nutrition header: a different spread each day.
export const foodHero = (date = new Date()): Cover => food(pick(FOOD_HEROES, dayKey(date)));

// The Movement header and its card on Today (offset so they differ).
export const moveHero = (date = new Date(), offset = 0): Cover =>
    move(MOVE_HEROES[(hashOf(dayKey(date)) + offset) % MOVE_HEROES.length]);

// A walk, run or ride: the first photo of its kind, or one by a seed.
export const kindPhoto = (kind: CardioKind, seed?: string): Cover =>
    move(seed === undefined ? MOVE[kind][0] : pick(MOVE[kind], seed));

// Fixed photos for a few places (the meal plan and walking plan cards).
export const foodPhoto = (name: string): Cover => food(name);
export const movePhoto = (name: string): Cover => move(name);
