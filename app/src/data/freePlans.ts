import type { L10n } from '../i18n';
import type { MealSlot } from '../store/types';

// Free nutrition plans: two sample days each, simple foods found anywhere.
// Macros per meal; the page scales portions to the user's calories.

export interface FreeMeal {
    slot: MealSlot;
    name: L10n;
    foods: L10n;
    protein: number;
    carbs: number;
    fat: number;
}

export interface FreePlan {
    id: 'grasa' | 'musculo' | 'equilibrado' | 'vegetariano';
    name: L10n;
    summary: L10n;
    photo: string; // public/food
    days: FreeMeal[][];
}

const meal = (slot: MealSlot, name: [string, string, string], foods: [string, string, string], protein: number, carbs: number, fat: number): FreeMeal => ({
    slot, name: { es: name[0], en: name[1], pt: name[2] }, foods: { es: foods[0], en: foods[1], pt: foods[2] }, protein, carbs, fat,
});

export const kcalOf = (m: { protein: number; carbs: number; fat: number }) => Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);

export const FREE_PLANS: FreePlan[] = [
    {
        id: 'grasa',
        name: { es: 'Perder grasa', en: 'Lose fat', pt: 'Perder gordura' },
        summary: { es: 'Mucha proteína y verdura para llegar saciado con menos calorías.', en: 'Plenty of protein and vegetables to stay full on fewer calories.', pt: 'Muita proteína e verdura para ficar saciado com menos calorias.' },
        photo: 'plato-2',
        days: [
            [
                meal('desayuno', ['Tortilla de espinacas', 'Spinach omelette', 'Omelete de espinafre'], ['2 huevos, espinacas, 1 tostada integral, 1 kiwi', '2 eggs, spinach, 1 slice wholegrain toast, 1 kiwi', '2 ovos, espinafre, 1 torrada integral, 1 kiwi'], 20, 30, 13),
                meal('almuerzo', ['Pollo con arroz y ensalada', 'Chicken, rice and salad', 'Frango com arroz e salada'], ['150 g de pechuga a la plancha, 120 g de arroz cocido, ensalada con 1 cda de aceite', '150 g grilled chicken breast, 120 g cooked rice, salad with 1 tbsp oil', '150 g de peito de frango grelhado, 120 g de arroz cozido, salada com 1 colher de azeite'], 50, 38, 14),
                meal('merienda', ['Yogur griego con manzana', 'Greek yogurt and apple', 'Iogurte grego com maçã'], ['170 g de yogur griego natural, 1 manzana, 15 g de almendras', '170 g plain Greek yogurt, 1 apple, 15 g almonds', '170 g de iogurte grego natural, 1 maçã, 15 g de amêndoas'], 20, 28, 12),
                meal('cena', ['Merluza al horno con verduras', 'Baked hake with vegetables', 'Merluza assada com legumes'], ['150 g de merluza, verduras asadas, 150 g de patata', '150 g hake, roasted vegetables, 150 g potato', '150 g de merluza, legumes assados, 150 g de batata'], 33, 32, 10),
            ],
            [
                meal('desayuno', ['Avena con fresas', 'Oats with strawberries', 'Aveia com morangos'], ['40 g de avena, 200 ml de leche desnatada, fresas, 1 cda de semillas', '40 g oats, 200 ml skimmed milk, strawberries, 1 tbsp seeds', '40 g de aveia, 200 ml de leite desnatado, morangos, 1 colher de sementes'], 16, 40, 8),
                meal('almuerzo', ['Lentejas con verduras', 'Lentil and vegetable stew', 'Lentilha com legumes'], ['200 g de lentejas cocidas, zanahoria, pimiento, 1 huevo duro', '200 g cooked lentils, carrot, pepper, 1 boiled egg', '200 g de lentilha cozida, cenoura, pimentão, 1 ovo cozido'], 25, 45, 9),
                meal('merienda', ['Queso fresco con tomate', 'Cottage cheese and tomato', 'Queijo fresco com tomate'], ['100 g de queso fresco batido, tomate, 1 tostada de centeno', '100 g cottage cheese, tomato, 1 rye cracker', '100 g de queijo cottage, tomate, 1 torrada de centeio'], 14, 15, 4),
                meal('cena', ['Pavo con calabacín', 'Turkey with courgette', 'Peru com abobrinha'], ['150 g de pavo a la plancha, calabacín y champiñones salteados, 1 fruta', '150 g grilled turkey, sautéed courgette and mushrooms, 1 piece of fruit', '150 g de peru grelhado, abobrinha e cogumelos salteados, 1 fruta'], 35, 22, 8),
            ],
        ],
    },
    {
        id: 'musculo',
        name: { es: 'Ganar músculo', en: 'Build muscle', pt: 'Ganhar músculo' },
        summary: { es: 'Más calorías y proteína repartida en el día para crecer con tus entrenos.', en: 'More calories and protein through the day to grow with your training.', pt: 'Mais calorias e proteína ao longo do dia para crescer com seus treinos.' },
        photo: 'plato-5',
        days: [
            [
                meal('desayuno', ['Huevos revueltos y avena', 'Scrambled eggs and oats', 'Ovos mexidos e aveia'], ['3 huevos, 60 g de avena con leche, 1 plátano', '3 eggs, 60 g oats with milk, 1 banana', '3 ovos, 60 g de aveia com leite, 1 banana'], 35, 75, 22),
                meal('almuerzo', ['Ternera con pasta', 'Beef with pasta', 'Carne com macarrão'], ['150 g de ternera magra, 100 g de pasta (en seco), tomate y 1 cda de aceite', '150 g lean beef, 100 g pasta (dry weight), tomato and 1 tbsp oil', '150 g de carne magra, 100 g de macarrão (cru), tomate e 1 colher de azeite'], 48, 80, 20),
                meal('merienda', ['Batido casero', 'Homemade shake', 'Vitamina caseira'], ['300 ml de leche, 1 plátano, 2 cdas de crema de cacahuete, 30 g de avena', '300 ml milk, 1 banana, 2 tbsp peanut butter, 30 g oats', '300 ml de leite, 1 banana, 2 colheres de pasta de amendoim, 30 g de aveia'], 25, 65, 20),
                meal('cena', ['Salmón con arroz', 'Salmon with rice', 'Salmão com arroz'], ['150 g de salmón, 200 g de arroz cocido, brócoli', '150 g salmon, 200 g cooked rice, broccoli', '150 g de salmão, 200 g de arroz cozido, brócolis'], 38, 62, 20),
            ],
            [
                meal('desayuno', ['Tostadas con pavo y queso', 'Toast with turkey and cheese', 'Torradas com peru e queijo'], ['3 tostadas integrales, 80 g de pavo, queso fresco, 1 vaso de zumo', '3 slices wholegrain toast, 80 g turkey, fresh cheese, 1 glass of juice', '3 torradas integrais, 80 g de peito de peru, queijo fresco, 1 copo de suco'], 32, 70, 12),
                meal('almuerzo', ['Pollo al curry con arroz', 'Chicken curry with rice', 'Frango ao curry com arroz'], ['180 g de pollo, 220 g de arroz cocido, leche de coco ligera, verduras', '180 g chicken, 220 g cooked rice, light coconut milk, vegetables', '180 g de frango, 220 g de arroz cozido, leite de coco light, legumes'], 50, 75, 18),
                meal('merienda', ['Yogur con granola', 'Yogurt with granola', 'Iogurte com granola'], ['250 g de yogur griego, 50 g de granola, frutos rojos', '250 g Greek yogurt, 50 g granola, berries', '250 g de iogurte grego, 50 g de granola, frutas vermelhas'], 25, 45, 15),
                meal('cena', ['Tortilla de patata y ensalada', 'Potato omelette and salad', 'Tortilha de batata e salada'], ['3 huevos, 200 g de patata, ensalada con atún', '3 eggs, 200 g potato, salad with tuna', '3 ovos, 200 g de batata, salada com atum'], 38, 45, 22),
            ],
        ],
    },
    {
        id: 'equilibrado',
        name: { es: 'Comer sano', en: 'Eat healthy', pt: 'Comer saudável' },
        summary: { es: 'Equilibrado para mantener tu peso con energía, al estilo mediterráneo.', en: 'Balanced, Mediterranean-style, to keep your weight with plenty of energy.', pt: 'Equilibrado, ao estilo mediterrâneo, para manter o peso com energia.' },
        photo: 'plato-7',
        days: [
            [
                meal('desayuno', ['Tostada con aguacate y huevo', 'Avocado and egg toast', 'Torrada com abacate e ovo'], ['2 tostadas integrales, ½ aguacate, 1 huevo, 1 naranja', '2 slices wholegrain toast, ½ avocado, 1 egg, 1 orange', '2 torradas integrais, ½ abacate, 1 ovo, 1 laranja'], 16, 45, 18),
                meal('almuerzo', ['Garbanzos con espinacas', 'Chickpeas with spinach', 'Grão-de-bico com espinafre'], ['200 g de garbanzos, espinacas, 1 huevo, pan integral', '200 g chickpeas, spinach, 1 egg, wholegrain bread', '200 g de grão-de-bico, espinafre, 1 ovo, pão integral'], 25, 65, 14),
                meal('merienda', ['Fruta y frutos secos', 'Fruit and nuts', 'Fruta e castanhas'], ['1 pera, 25 g de nueces, 1 yogur natural', '1 pear, 25 g walnuts, 1 plain yogurt', '1 pera, 25 g de nozes, 1 iogurte natural'], 9, 32, 19),
                meal('cena', ['Pescado con quinoa', 'Fish with quinoa', 'Peixe com quinoa'], ['150 g de pescado blanco, 150 g de quinoa cocida, verduras', '150 g white fish, 150 g cooked quinoa, vegetables', '150 g de peixe branco, 150 g de quinoa cozida, legumes'], 35, 40, 12),
            ],
            [
                meal('desayuno', ['Yogur con avena y fruta', 'Yogurt with oats and fruit', 'Iogurte com aveia e fruta'], ['200 g de yogur, 40 g de avena, 1 plátano, canela', '200 g yogurt, 40 g oats, 1 banana, cinnamon', '200 g de iogurte, 40 g de aveia, 1 banana, canela'], 15, 60, 8),
                meal('almuerzo', ['Arroz con pollo y verduras', 'Chicken and vegetable rice', 'Arroz com frango e legumes'], ['150 g de pollo, 150 g de arroz cocido, pimiento, judías verdes', '150 g chicken, 150 g cooked rice, pepper, green beans', '150 g de frango, 150 g de arroz cozido, pimentão, vagem'], 42, 50, 12),
                meal('merienda', ['Hummus con verduras', 'Hummus with vegetables', 'Homus com legumes'], ['60 g de hummus, zanahoria y pepino, 1 tostada', '60 g hummus, carrot and cucumber, 1 cracker', '60 g de homus, cenoura e pepino, 1 torrada'], 7, 25, 10),
                meal('cena', ['Crema de calabaza y tortilla', 'Pumpkin soup and omelette', 'Creme de abóbora e omelete'], ['crema de calabaza, tortilla de 2 huevos, pan integral', 'pumpkin soup, 2-egg omelette, wholegrain bread', 'creme de abóbora, omelete de 2 ovos, pão integral'], 20, 35, 14),
            ],
        ],
    },
    {
        id: 'vegetariano',
        name: { es: 'Vegetariano', en: 'Vegetarian', pt: 'Vegetariano' },
        summary: { es: 'Sin carne ni pescado y con proteína completa de huevos, lácteos, legumbres y tofu.', en: 'No meat or fish, with complete protein from eggs, dairy, legumes and tofu.', pt: 'Sem carne nem peixe, com proteína completa de ovos, laticínios, leguminosas e tofu.' },
        photo: 'plato-9',
        days: [
            [
                meal('desayuno', ['Tostadas con requesón', 'Toast with ricotta', 'Torradas com ricota'], ['2 tostadas integrales, 100 g de requesón, miel, 1 fruta', '2 slices wholegrain toast, 100 g ricotta, honey, 1 piece of fruit', '2 torradas integrais, 100 g de ricota, mel, 1 fruta'], 18, 55, 10),
                meal('almuerzo', ['Tofu salteado con arroz', 'Tofu stir-fry with rice', 'Tofu salteado com arroz'], ['150 g de tofu firme, 150 g de arroz cocido, brócoli y soja', '150 g firm tofu, 150 g cooked rice, broccoli and soy sauce', '150 g de tofu firme, 150 g de arroz cozido, brócolis e shoyu'], 26, 55, 14),
                meal('merienda', ['Batido de yogur y fruta', 'Yogurt and fruit smoothie', 'Vitamina de iogurte e fruta'], ['200 g de yogur griego, frutos rojos, 15 g de semillas', '200 g Greek yogurt, berries, 15 g seeds', '200 g de iogurte grego, frutas vermelhas, 15 g de sementes'], 20, 22, 10),
                meal('cena', ['Tortilla de verduras y alubias', 'Vegetable omelette and beans', 'Omelete de legumes e feijão'], ['2 huevos, verduras, 150 g de alubias, ensalada', '2 eggs, vegetables, 150 g beans, salad', '2 ovos, legumes, 150 g de feijão, salada'], 24, 35, 13),
            ],
            [
                meal('desayuno', ['Porridge con cacahuete', 'Peanut porridge', 'Mingau com amendoim'], ['50 g de avena con leche, 1 cda de crema de cacahuete, 1 plátano', '50 g oats with milk, 1 tbsp peanut butter, 1 banana', '50 g de aveia com leite, 1 colher de pasta de amendoim, 1 banana'], 17, 65, 14),
                meal('almuerzo', ['Ensalada de lentejas y queso', 'Lentil and feta salad', 'Salada de lentilha e queijo'], ['200 g de lentejas, 50 g de queso feta, tomate, pepino, aceite', '200 g lentils, 50 g feta, tomato, cucumber, olive oil', '200 g de lentilha, 50 g de queijo feta, tomate, pepino, azeite'], 26, 42, 16),
                meal('merienda', ['Queso y fruta', 'Cheese and fruit', 'Queijo e fruta'], ['40 g de queso, 1 manzana, 10 almendras', '40 g cheese, 1 apple, 10 almonds', '40 g de queijo, 1 maçã, 10 amêndoas'], 12, 22, 16),
                meal('cena', ['Pasta con garbanzos', 'Pasta with chickpeas', 'Macarrão com grão-de-bico'], ['80 g de pasta integral, 120 g de garbanzos, tomate y espinacas', '80 g wholewheat pasta, 120 g chickpeas, tomato and spinach', '80 g de macarrão integral, 120 g de grão-de-bico, tomate e espinafre'], 24, 75, 9),
            ],
        ],
    },
];

export const dayKcal = (day: FreeMeal[]) => day.reduce((s, m) => s + kcalOf(m), 0);
export const planKcal = (p: FreePlan) => Math.round(p.days.reduce((s, d) => s + dayKcal(d), 0) / p.days.length);

// How much to eat compared to the plan, in quarter steps (×0.75 to ×1.5).
export const portionFactor = (planKcal: number, targetKcal: number) =>
    Math.min(1.5, Math.max(0.75, Math.round((targetKcal / planKcal) * 4) / 4));
