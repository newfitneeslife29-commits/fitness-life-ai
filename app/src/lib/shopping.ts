import { FOOD_CATEGORIES, FOODS, type FoodCategory } from '../data/foods';
import { fmtNumber } from './format';

// The shopping list of a meal plan: every food of the week added up ("80 g
// de avena" × 7 → "avena 560 g") and sorted by section of the supermarket.

export interface ShoppingItem {
    key: string; // to group and to remember what's checked
    name: string;
    amount: string; // "560 g", "× 7", or '' when the plan gives no amount
    category: FoodCategory;
}

type Unit = 'g' | 'ml' | 'spoon' | 'tsp' | '';

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Grouping key: no accents, no plural "s", no filler words.
const FILLER = new Set(['de', 'del', 'of', 'do', 'da', 'dos', 'das', 'a', 'la', 'el', 'the', 'o']);
export const itemKey = (name: string) =>
    strip(name).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !FILLER.has(w)).map(w => (w.length > 3 ? w.replace(/s$/, '') : w)).join(' ');

const UNITS: [RegExp, Unit, number][] = [
    [/^(kg)\b/i, 'g', 1000],
    [/^(g|gr|grs|gramos?|grams?|gramas?)\b/i, 'g', 1],
    [/^(l|litros?|liters?|litres?)\b/i, 'ml', 1000],
    [/^(ml)\b/i, 'ml', 1],
    [/^(cdas?|cucharadas?|tbsp|tablespoons?|colher(?:es)? de sopa|c\. de sopa)\b/i, 'spoon', 1],
    [/^(cditas?|cucharaditas?|tsp|teaspoons?|colher(?:es)? de ch[aá])\b/i, 'tsp', 1],
];

// "150 g de pechuga a la plancha" → 150, g, "pechuga a la plancha"
export const parseFood = (text: string): { qty: number | null; unit: Unit; name: string } => {
    let rest = text.trim();
    const num = rest.match(/^(\d+(?:[.,]\d+)?|½|¼)\s*/);
    if (!num) return { qty: null, unit: '', name: rest };
    let qty = num[1] === '½' ? 0.5 : num[1] === '¼' ? 0.25 : Number(num[1].replace(',', '.'));
    rest = rest.slice(num[0].length);
    let unit: Unit = '';
    for (const [re, u, k] of UNITS) {
        const m = rest.match(re);
        if (m) {
            unit = u;
            qty *= k;
            rest = rest.slice(m[0].length).trim();
            break;
        }
    }
    rest = rest.replace(/^(de|of|do|da)\s+/i, '');
    return { qty, unit, name: rest.trim() };
};

// A food line of a meal may list several: "2 huevos, espinacas y 1 tostada".
export const splitFoods = (line: string) =>
    line.split(/,|\s+(?:y|e|and|con|with|com)\s+(?=\d)/i).map(s => s.trim()).filter(Boolean);

// Section of the supermarket: by the food table (first word of each food) and some extra words.
const EXTRA: Partial<Record<FoodCategory, string[]>> = {
    veg: ['espinaca', 'spinach', 'espinafre', 'tomate', 'tomato', 'pimiento', 'pepper', 'pimentao', 'zanahoria', 'carrot', 'cenoura', 'calabacin', 'courgette', 'zucchini', 'abobrinha', 'champinon', 'mushroom', 'cogumelo', 'lechuga', 'lettuce', 'alface', 'ensalada', 'salad', 'salada', 'verdura', 'vegetable', 'legume', 'cebolla', 'onion', 'cebola', 'ajo', 'garlic', 'alho', 'pepino', 'cucumber', 'brocoli', 'broccoli', 'brocolis', 'patata', 'potato', 'batata'],
    fruit: ['fruta', 'fruit', 'fruto', 'berr', 'frutilla', 'fresa', 'strawberr', 'morango', 'kiwi', 'manzana', 'apple', 'maca', 'platano', 'banana', 'naranja', 'orange', 'laranja', 'pera', 'pear', 'uva', 'grape', 'mango', 'pina', 'pineapple', 'abacaxi', 'arandano', 'blueberr', 'mirtilo', 'limon', 'lemon', 'limao'],
    eggsDairy: ['huevo', 'egg', 'ovo', 'leche', 'milk', 'leite', 'yogur', 'yogurt', 'iogurte', 'queso', 'cheese', 'queijo', 'kefir'],
    grains: ['arroz', 'rice', 'avena', 'oat', 'aveia', 'pan', 'bread', 'pao', 'tostada', 'toast', 'torrada', 'pasta', 'macarrao', 'quinoa', 'tortilla', 'wrap', 'cereal'],
    nuts: ['almendra', 'almond', 'amendoa', 'nuez', 'walnut', 'noz', 'cacahuete', 'peanut', 'amendoim', 'semilla', 'seed', 'semente', 'chia'],
    fats: ['aceite', 'oil', 'azeite', 'oleo', 'mantequilla', 'butter', 'manteiga', 'aguacate', 'avocado', 'abacate'],
    meat: ['pollo', 'chicken', 'frango', 'pavo', 'turkey', 'peru', 'ternera', 'beef', 'carne', 'cerdo', 'pork', 'porco', 'pechuga', 'breast', 'peito', 'jamon', 'ham', 'presunto'],
    fish: ['atun', 'tuna', 'atum', 'salmon', 'salmao', 'merluza', 'hake', 'pescado', 'fish', 'peixe', 'gamba', 'shrimp', 'camarao', 'sardina', 'sardine'],
    legumes: ['lenteja', 'lentil', 'lentilha', 'garbanzo', 'chickpea', 'grao', 'frijol', 'bean', 'feijao', 'alubia', 'tofu', 'edamame'],
};
let index: [string, FoodCategory][] | null = null;
const wordIndex = () => {
    if (index) return index;
    const words = new Map<string, FoodCategory>();
    for (const [category, list] of Object.entries(EXTRA) as [FoodCategory, string[]][]) list.forEach(w => words.set(w, category));
    for (const f of FOODS) {
        for (const name of [f.name.es, f.name.en, f.name.pt]) {
            const first = itemKey(name).split(' ')[0];
            if (first.length >= 4 && !words.has(first)) words.set(first, f.category);
        }
    }
    index = [...words.entries()].sort((a, b) => b[0].length - a[0].length);
    return index;
};
// The first word that names a food decides ("avena con leche" is oats).
export const categoryOf = (name: string): FoodCategory => {
    for (const word of itemKey(name).split(' ')) {
        const hit = wordIndex().find(([w]) => word.startsWith(w));
        if (hit) return hit[1];
    }
    return 'other';
};

const fmtAmount = (qty: number | null, unit: Unit, count: number) => {
    if (qty === null) return count > 1 ? `× ${count}` : '';
    const round = (n: number) => fmtNumber(Math.round(n * 10) / 10);
    if (unit === 'g') return qty >= 1000 ? `${round(qty / 1000)} kg` : `${Math.round(qty)} g`;
    if (unit === 'ml') return qty >= 1000 ? `${round(qty / 1000)} L` : `${Math.round(qty)} ml`;
    if (unit === 'spoon') return `${round(qty)} 🥄`;
    if (unit === 'tsp') return `${round(qty)} tsp`;
    return `× ${round(Math.ceil(qty))}`;
};

// `lines`: the foods of every meal of the period; `times`: how often they repeat.
export const shoppingList = (lines: string[], times = 1): { category: FoodCategory; items: ShoppingItem[] }[] => {
    const groups = new Map<string, { name: string; qty: number | null; unit: Unit; count: number }>();
    for (const line of lines) {
        for (const part of splitFoods(line)) {
            const p = parseFood(part);
            if (!p.name) continue;
            const key = `${itemKey(p.name)}|${p.unit}`;
            const g = groups.get(key);
            if (g) {
                g.count += 1;
                if (p.qty !== null) g.qty = (g.qty ?? 0) + p.qty;
            } else groups.set(key, { name: p.name, qty: p.qty, unit: p.unit, count: 1 });
        }
    }
    const items: ShoppingItem[] = [...groups.entries()].map(([key, g]) => ({
        key,
        name: g.name.charAt(0).toUpperCase() + g.name.slice(1),
        amount: fmtAmount(g.qty === null ? null : g.qty * times, g.unit, Math.round(g.count * times)),
        category: categoryOf(g.name),
    }));
    return FOOD_CATEGORIES
        .map(category => ({ category, items: items.filter(i => i.category === category).sort((a, b) => a.name.localeCompare(b.name)) }))
        .filter(s => s.items.length > 0);
};
