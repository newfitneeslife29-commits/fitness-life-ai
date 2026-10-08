import { l10n, type Lang } from '../i18n';
import type { Macros } from '../store/types';

// Food table: typical nutrition values per 100 g (USDA FoodData Central and
// national food tables, rounded). Cooked weight where the food is eaten
// cooked. Values vary with brand and preparation; they are a guide.

export type FoodCategory = 'meat' | 'fish' | 'eggsDairy' | 'legumes' | 'grains' | 'fruit' | 'veg' | 'nuts' | 'fats' | 'other';

export const FOOD_CATEGORIES: FoodCategory[] = ['meat', 'fish', 'eggsDairy', 'legumes', 'grains', 'fruit', 'veg', 'nuts', 'fats', 'other'];

export const FOOD_EMOJI: Record<FoodCategory, string> = {
    meat: '🍗', fish: '🐟', eggsDairy: '🥚', legumes: '🫘', grains: '🍚', fruit: '🍎', veg: '🥦', nuts: '🥜', fats: '🫒', other: '🍯',
};

export interface Food {
    id: string;
    category: FoodCategory;
    name: Record<Lang, string>;
    per100: Macros & { fiber: number };
    portion: { grams: number; label: Record<Lang, string> };
    alcohol?: boolean; // calories also come from alcohol
}

type Row = [id: string, category: FoodCategory, name: [string, string, string], per100: [kcal: number, protein: number, carbs: number, fat: number, fiber: number], grams: number, portion: [string, string, string], alcohol?: boolean];

const ROWS: Row[] = [
    // Meat and poultry
    ['pechuga-pollo', 'meat', ['Pechuga de pollo a la plancha', 'Grilled chicken breast', 'Peito de frango grelhado'], [165, 31, 0, 3.6, 0], 150, ['1 filete', '1 fillet', '1 filé']],
    ['muslo-pollo', 'meat', ['Muslo de pollo sin piel, cocido', 'Skinless chicken thigh, cooked', 'Sobrecoxa de frango sem pele, cozida'], [209, 26, 0, 10.9, 0], 100, ['1 muslo', '1 thigh', '1 sobrecoxa']],
    ['pavo', 'meat', ['Pechuga de pavo asada', 'Roast turkey breast', 'Peito de peru assado'], [147, 30, 0, 2.1, 0], 100, ['1 porción', '1 serving', '1 porção']],
    ['res-molida', 'meat', ['Carne molida de res 90/10, cocida', 'Ground beef 90/10, cooked', 'Carne moída 90/10, cozida'], [217, 26.4, 0, 11.7, 0], 120, ['1 porción', '1 serving', '1 porção']],
    ['bistec', 'meat', ['Bistec de res magro, a la plancha', 'Lean beef steak, grilled', 'Bife magro grelhado'], [180, 29, 0, 7, 0], 150, ['1 bistec', '1 steak', '1 bife']],
    ['lomo-cerdo', 'meat', ['Lomo de cerdo asado', 'Roast pork tenderloin', 'Lombo de porco assado'], [143, 26, 0, 3.5, 0], 120, ['1 porción', '1 serving', '1 porção']],
    ['jamon-pavo', 'meat', ['Jamón de pavo', 'Sliced turkey ham', 'Presunto de peru'], [104, 17, 4.2, 1.7, 0], 30, ['2 rebanadas', '2 slices', '2 fatias']],
    ['tocino', 'meat', ['Tocino frito', 'Fried bacon', 'Bacon frito'], [541, 37, 1.4, 42, 0], 8, ['1 tira', '1 strip', '1 tira']],
    ['chorizo', 'meat', ['Chorizo', 'Chorizo sausage', 'Linguiça tipo chorizo'], [455, 24, 2, 38, 0], 50, ['1 pieza pequeña', '1 small link', '1 gomo pequeno']],

    // Fish and seafood
    ['salmon', 'fish', ['Salmón cocido', 'Salmon, cooked', 'Salmão cozido'], [206, 22, 0, 12, 0], 150, ['1 filete', '1 fillet', '1 filé']],
    ['atun-agua', 'fish', ['Atún en agua (lata)', 'Tuna in water (can)', 'Atum em água (lata)'], [116, 26, 0, 0.8, 0], 120, ['1 lata escurrida', '1 can, drained', '1 lata escorrida']],
    ['atun-aceite', 'fish', ['Atún en aceite (lata)', 'Tuna in oil (can)', 'Atum em óleo (lata)'], [198, 29, 0, 8.2, 0], 120, ['1 lata escurrida', '1 can, drained', '1 lata escorrida']],
    ['tilapia', 'fish', ['Tilapia cocida', 'Tilapia, cooked', 'Tilápia cozida'], [128, 26, 0, 2.7, 0], 150, ['1 filete', '1 fillet', '1 filé']],
    ['bacalao', 'fish', ['Bacalao o merluza cocidos', 'Cod or hake, cooked', 'Bacalhau ou merluza cozidos'], [105, 23, 0, 0.9, 0], 150, ['1 filete', '1 fillet', '1 filé']],
    ['camarones', 'fish', ['Camarones cocidos', 'Shrimp, cooked', 'Camarão cozido'], [99, 24, 0.2, 0.3, 0], 100, ['1 porción', '1 serving', '1 porção']],
    ['sardinas', 'fish', ['Sardinas en aceite (lata)', 'Sardines in oil (can)', 'Sardinha em óleo (lata)'], [208, 25, 0, 11.5, 0], 90, ['1 lata', '1 can', '1 lata']],

    // Eggs and dairy
    ['huevo', 'eggsDairy', ['Huevo entero', 'Whole egg', 'Ovo inteiro'], [143, 12.6, 0.7, 9.5, 0], 50, ['1 huevo grande', '1 large egg', '1 ovo grande']],
    ['clara', 'eggsDairy', ['Clara de huevo', 'Egg white', 'Clara de ovo'], [52, 10.9, 0.7, 0.2, 0], 33, ['1 clara', '1 egg white', '1 clara']],
    ['leche-entera', 'eggsDairy', ['Leche entera', 'Whole milk', 'Leite integral'], [61, 3.2, 4.8, 3.3, 0], 240, ['1 vaso (240 ml)', '1 glass (240 ml)', '1 copo (240 ml)']],
    ['leche-descremada', 'eggsDairy', ['Leche descremada', 'Skim milk', 'Leite desnatado'], [34, 3.4, 5, 0.1, 0], 240, ['1 vaso (240 ml)', '1 glass (240 ml)', '1 copo (240 ml)']],
    ['yogur-griego', 'eggsDairy', ['Yogur griego natural 0 %', 'Plain Greek yogurt, nonfat', 'Iogurte grego natural 0 %'], [59, 10.3, 3.6, 0.4, 0], 170, ['1 envase', '1 cup', '1 pote']],
    ['yogur-natural', 'eggsDairy', ['Yogur natural entero', 'Plain whole-milk yogurt', 'Iogurte natural integral'], [61, 3.5, 4.7, 3.3, 0], 125, ['1 envase', '1 cup', '1 pote']],
    ['cottage', 'eggsDairy', ['Queso cottage', 'Cottage cheese', 'Queijo cottage'], [98, 11, 3.4, 4.3, 0], 100, ['1/2 taza', '1/2 cup', '1/2 xícara']],
    ['queso-fresco', 'eggsDairy', ['Queso fresco', 'Fresh cheese (queso fresco)', 'Queijo fresco'], [299, 18, 3, 24, 0], 30, ['1 rebanada', '1 slice', '1 fatia']],
    ['cheddar', 'eggsDairy', ['Queso cheddar', 'Cheddar cheese', 'Queijo cheddar'], [403, 25, 1.3, 33, 0], 30, ['1 rebanada', '1 slice', '1 fatia']],
    ['mozzarella', 'eggsDairy', ['Queso mozzarella', 'Mozzarella cheese', 'Queijo muçarela'], [280, 28, 3.1, 17, 0], 30, ['1 porción', '1 serving', '1 porção']],
    ['whey', 'eggsDairy', ['Proteína whey en polvo', 'Whey protein powder', 'Whey protein em pó'], [400, 80, 8, 6, 0], 30, ['1 scoop', '1 scoop', '1 scoop']],

    // Legumes
    ['lentejas', 'legumes', ['Lentejas cocidas', 'Lentils, cooked', 'Lentilha cozida'], [116, 9, 20, 0.4, 7.9], 200, ['1 taza', '1 cup', '1 xícara']],
    ['frijoles-negros', 'legumes', ['Frijoles negros cocidos', 'Black beans, cooked', 'Feijão-preto cozido'], [132, 8.9, 23.7, 0.5, 8.7], 170, ['1 taza', '1 cup', '1 xícara']],
    ['garbanzos', 'legumes', ['Garbanzos cocidos', 'Chickpeas, cooked', 'Grão-de-bico cozido'], [164, 8.9, 27.4, 2.6, 7.6], 160, ['1 taza', '1 cup', '1 xícara']],
    ['tofu', 'legumes', ['Tofu firme', 'Firm tofu', 'Tofu firme'], [144, 17.3, 2.8, 8.7, 2.3], 100, ['1 porción', '1 serving', '1 porção']],
    ['edamame', 'legumes', ['Edamame', 'Edamame', 'Edamame'], [121, 11.9, 8.9, 5.2, 5.2], 150, ['1 taza', '1 cup', '1 xícara']],
    ['hummus', 'legumes', ['Hummus', 'Hummus', 'Homus'], [166, 7.9, 14.3, 9.6, 6], 30, ['2 cucharadas', '2 tablespoons', '2 colheres de sopa']],

    // Grains, bread and starchy foods
    ['arroz-blanco', 'grains', ['Arroz blanco cocido', 'White rice, cooked', 'Arroz branco cozido'], [130, 2.7, 28.2, 0.3, 0.4], 160, ['1 taza', '1 cup', '1 xícara']],
    ['arroz-integral', 'grains', ['Arroz integral cocido', 'Brown rice, cooked', 'Arroz integral cozido'], [123, 2.7, 25.6, 1, 1.6], 160, ['1 taza', '1 cup', '1 xícara']],
    ['avena', 'grains', ['Avena en hojuelas', 'Rolled oats', 'Aveia em flocos'], [389, 16.9, 66.3, 6.9, 10.6], 40, ['1/2 taza', '1/2 cup', '1/2 xícara']],
    ['pan-integral', 'grains', ['Pan integral', 'Whole-wheat bread', 'Pão integral'], [247, 13, 41, 3.4, 7], 30, ['1 rebanada', '1 slice', '1 fatia']],
    ['pan-blanco', 'grains', ['Pan blanco', 'White bread', 'Pão branco'], [265, 9, 49, 3.2, 2.7], 30, ['1 rebanada', '1 slice', '1 fatia']],
    ['tortilla-maiz', 'grains', ['Tortilla de maíz', 'Corn tortilla', 'Tortilha de milho'], [218, 5.7, 44.6, 2.9, 6.3], 30, ['1 tortilla', '1 tortilla', '1 tortilha']],
    ['tortilla-harina', 'grains', ['Tortilla de harina', 'Flour tortilla', 'Tortilha de trigo'], [297, 8, 49, 7.5, 3.5], 45, ['1 tortilla', '1 tortilla', '1 tortilha']],
    ['pasta', 'grains', ['Pasta cocida', 'Pasta, cooked', 'Macarrão cozido'], [158, 5.8, 30.9, 0.9, 1.8], 140, ['1 taza', '1 cup', '1 xícara']],
    ['quinoa', 'grains', ['Quinoa cocida', 'Quinoa, cooked', 'Quinoa cozida'], [120, 4.4, 21.3, 1.9, 2.8], 185, ['1 taza', '1 cup', '1 xícara']],
    ['papa', 'grains', ['Papa cocida', 'Boiled potato', 'Batata cozida'], [87, 1.9, 20.1, 0.1, 1.8], 170, ['1 mediana', '1 medium', '1 média']],
    ['camote', 'grains', ['Camote o batata dulce asado', 'Baked sweet potato', 'Batata-doce assada'], [90, 2, 20.7, 0.2, 3.3], 150, ['1 mediano', '1 medium', '1 média']],
    ['platano-macho', 'grains', ['Plátano macho cocido', 'Boiled plantain', 'Banana-da-terra cozida'], [116, 0.8, 31, 0.2, 2.3], 150, ['1 porción', '1 serving', '1 porção']],
    ['yuca', 'grains', ['Yuca cocida', 'Boiled cassava', 'Mandioca cozida'], [112, 1.4, 27, 0.3, 1.8], 150, ['1 porción', '1 serving', '1 porção']],
    ['corn-flakes', 'grains', ['Cereal de hojuelas de maíz', 'Corn flakes', 'Flocos de milho'], [357, 7.5, 84, 0.4, 3.3], 30, ['1 taza', '1 cup', '1 xícara']],
    ['granola', 'grains', ['Granola', 'Granola', 'Granola'], [471, 10, 64, 20, 7], 50, ['1/2 taza', '1/2 cup', '1/2 xícara']],

    // Fruit
    ['platano', 'fruit', ['Plátano (banana)', 'Banana', 'Banana'], [89, 1.1, 22.8, 0.3, 2.6], 120, ['1 mediano', '1 medium', '1 média']],
    ['manzana', 'fruit', ['Manzana', 'Apple', 'Maçã'], [52, 0.3, 13.8, 0.2, 2.4], 180, ['1 mediana', '1 medium', '1 média']],
    ['naranja', 'fruit', ['Naranja', 'Orange', 'Laranja'], [47, 0.9, 11.8, 0.1, 2.4], 130, ['1 mediana', '1 medium', '1 média']],
    ['fresas', 'fruit', ['Fresas', 'Strawberries', 'Morangos'], [32, 0.7, 7.7, 0.3, 2], 150, ['1 taza', '1 cup', '1 xícara']],
    ['arandanos', 'fruit', ['Arándanos', 'Blueberries', 'Mirtilos'], [57, 0.7, 14.5, 0.3, 2.4], 150, ['1 taza', '1 cup', '1 xícara']],
    ['uvas', 'fruit', ['Uvas', 'Grapes', 'Uvas'], [69, 0.7, 18.1, 0.2, 0.9], 150, ['1 taza', '1 cup', '1 xícara']],
    ['mango', 'fruit', ['Mango', 'Mango', 'Manga'], [60, 0.8, 15, 0.4, 1.6], 165, ['1 taza en cubos', '1 cup, diced', '1 xícara em cubos']],
    ['pina', 'fruit', ['Piña', 'Pineapple', 'Abacaxi'], [50, 0.5, 13.1, 0.1, 1.4], 165, ['1 taza en cubos', '1 cup, diced', '1 xícara em cubos']],
    ['sandia', 'fruit', ['Sandía', 'Watermelon', 'Melancia'], [30, 0.6, 7.6, 0.2, 0.4], 280, ['1 rebanada', '1 wedge', '1 fatia']],
    ['papaya', 'fruit', ['Papaya', 'Papaya', 'Mamão'], [43, 0.5, 10.8, 0.3, 1.7], 145, ['1 taza en cubos', '1 cup, diced', '1 xícara em cubos']],
    ['aguacate', 'fruit', ['Aguacate', 'Avocado', 'Abacate'], [160, 2, 8.5, 14.7, 6.7], 70, ['1/2 aguacate', '1/2 avocado', '1/2 abacate']],
    ['kiwi', 'fruit', ['Kiwi', 'Kiwi', 'Kiwi'], [61, 1.1, 14.7, 0.5, 3], 75, ['1 kiwi', '1 kiwi', '1 kiwi']],
    ['pera', 'fruit', ['Pera', 'Pear', 'Pera'], [57, 0.4, 15.2, 0.1, 3.1], 180, ['1 mediana', '1 medium', '1 média']],
    ['datiles', 'fruit', ['Dátiles', 'Dates', 'Tâmaras'], [277, 1.8, 75, 0.2, 6.7], 24, ['1 dátil grande', '1 large date', '1 tâmara grande']],

    // Vegetables
    ['brocoli', 'veg', ['Brócoli cocido', 'Broccoli, cooked', 'Brócolis cozido'], [35, 2.4, 7.2, 0.4, 3.3], 150, ['1 taza', '1 cup', '1 xícara']],
    ['espinaca', 'veg', ['Espinaca cruda', 'Raw spinach', 'Espinafre cru'], [23, 2.9, 3.6, 0.4, 2.2], 30, ['1 taza', '1 cup', '1 xícara']],
    ['lechuga', 'veg', ['Lechuga', 'Lettuce', 'Alface'], [15, 1.4, 2.9, 0.2, 1.3], 50, ['1 taza', '1 cup', '1 xícara']],
    ['tomate', 'veg', ['Tomate', 'Tomato', 'Tomate'], [18, 0.9, 3.9, 0.2, 1.2], 120, ['1 mediano', '1 medium', '1 médio']],
    ['zanahoria', 'veg', ['Zanahoria', 'Carrot', 'Cenoura'], [41, 0.9, 9.6, 0.2, 2.8], 60, ['1 mediana', '1 medium', '1 média']],
    ['pepino', 'veg', ['Pepino', 'Cucumber', 'Pepino'], [15, 0.7, 3.6, 0.1, 0.5], 100, ['1/2 pepino', '1/2 cucumber', '1/2 pepino']],
    ['calabacin', 'veg', ['Calabacín', 'Zucchini', 'Abobrinha'], [17, 1.2, 3.1, 0.3, 1], 120, ['1 taza', '1 cup', '1 xícara']],
    ['champinones', 'veg', ['Champiñones', 'Mushrooms', 'Cogumelos'], [22, 3.1, 3.3, 0.3, 1], 70, ['1 taza', '1 cup', '1 xícara']],
    ['pimiento', 'veg', ['Pimiento rojo', 'Red bell pepper', 'Pimentão vermelho'], [31, 1, 6, 0.3, 2.1], 120, ['1 mediano', '1 medium', '1 médio']],
    ['cebolla', 'veg', ['Cebolla', 'Onion', 'Cebola'], [40, 1.1, 9.3, 0.1, 1.7], 110, ['1 mediana', '1 medium', '1 média']],
    ['elote', 'veg', ['Elote (maíz dulce) cocido', 'Sweet corn, cooked', 'Milho verde cozido'], [96, 3.4, 21, 1.5, 2.4], 150, ['1 mazorca', '1 ear', '1 espiga']],
    ['chicharos', 'veg', ['Chícharos (guisantes) cocidos', 'Green peas, cooked', 'Ervilhas cozidas'], [84, 5.4, 15.6, 0.2, 5.5], 160, ['1 taza', '1 cup', '1 xícara']],
    ['ejotes', 'veg', ['Ejotes (judías verdes) cocidos', 'Green beans, cooked', 'Vagem cozida'], [35, 1.9, 7.9, 0.3, 3.2], 125, ['1 taza', '1 cup', '1 xícara']],
    ['coliflor', 'veg', ['Coliflor cocida', 'Cauliflower, cooked', 'Couve-flor cozida'], [23, 1.8, 4.1, 0.5, 2.3], 125, ['1 taza', '1 cup', '1 xícara']],

    // Nuts and seeds
    ['almendras', 'nuts', ['Almendras', 'Almonds', 'Amêndoas'], [579, 21.2, 21.6, 49.9, 12.5], 28, ['1 puñado (23 piezas)', '1 handful (23 nuts)', '1 punhado (23 unidades)']],
    ['nueces', 'nuts', ['Nueces', 'Walnuts', 'Nozes'], [654, 15.2, 13.7, 65.2, 6.7], 28, ['1 puñado', '1 handful', '1 punhado']],
    ['cacahuates', 'nuts', ['Cacahuates (maní)', 'Peanuts', 'Amendoim'], [567, 25.8, 16.1, 49.2, 8.5], 28, ['1 puñado', '1 handful', '1 punhado']],
    ['crema-cacahuate', 'nuts', ['Crema de cacahuate', 'Peanut butter', 'Pasta de amendoim'], [588, 25, 20, 50, 6], 32, ['2 cucharadas', '2 tablespoons', '2 colheres de sopa']],
    ['chia', 'nuts', ['Semillas de chía', 'Chia seeds', 'Sementes de chia'], [486, 16.5, 42.1, 30.7, 34.4], 15, ['1 cucharada', '1 tablespoon', '1 colher de sopa']],
    ['pistaches', 'nuts', ['Pistaches', 'Pistachios', 'Pistaches'], [560, 20.2, 27.2, 45.3, 10.6], 28, ['1 puñado', '1 handful', '1 punhado']],
    ['girasol', 'nuts', ['Semillas de girasol', 'Sunflower seeds', 'Sementes de girassol'], [584, 20.8, 20, 51.5, 8.6], 28, ['1 puñado', '1 handful', '1 punhado']],

    // Oils and fats
    ['aceite-oliva', 'fats', ['Aceite de oliva', 'Olive oil', 'Azeite de oliva'], [884, 0, 0, 100, 0], 14, ['1 cucharada', '1 tablespoon', '1 colher de sopa']],
    ['mantequilla', 'fats', ['Mantequilla', 'Butter', 'Manteiga'], [717, 0.9, 0.1, 81, 0], 14, ['1 cucharada', '1 tablespoon', '1 colher de sopa']],
    ['mayonesa', 'fats', ['Mayonesa', 'Mayonnaise', 'Maionese'], [680, 1, 0.6, 75, 0], 14, ['1 cucharada', '1 tablespoon', '1 colher de sopa']],

    // Other
    ['miel', 'other', ['Miel', 'Honey', 'Mel'], [304, 0.3, 82.4, 0, 0.2], 21, ['1 cucharada', '1 tablespoon', '1 colher de sopa']],
    ['azucar', 'other', ['Azúcar', 'Sugar', 'Açúcar'], [387, 0, 100, 0, 0], 4, ['1 cucharadita', '1 teaspoon', '1 colher de chá']],
    ['chocolate-negro', 'other', ['Chocolate negro 70-85 %', 'Dark chocolate 70-85%', 'Chocolate amargo 70-85 %'], [598, 7.8, 45.9, 42.6, 10.9], 20, ['2 cuadros', '2 squares', '2 quadradinhos']],
    ['barra-proteina', 'other', ['Barra de proteína (típica)', 'Protein bar (typical)', 'Barra de proteína (típica)'], [350, 33, 38, 10, 10], 60, ['1 barra', '1 bar', '1 barra']],
    ['jugo-naranja', 'other', ['Jugo de naranja', 'Orange juice', 'Suco de laranja'], [45, 0.7, 10.4, 0.2, 0.2], 240, ['1 vaso (240 ml)', '1 glass (240 ml)', '1 copo (240 ml)']],
    ['refresco', 'other', ['Refresco de cola', 'Cola soda', 'Refrigerante de cola'], [42, 0, 10.6, 0, 0], 355, ['1 lata (355 ml)', '1 can (355 ml)', '1 lata (355 ml)']],
    ['cerveza', 'other', ['Cerveza', 'Beer', 'Cerveja'], [43, 0.5, 3.6, 0, 0], 355, ['1 lata (355 ml)', '1 can (355 ml)', '1 lata (355 ml)'], true],
    ['pizza', 'other', ['Pizza de queso', 'Cheese pizza', 'Pizza de queijo'], [266, 11, 33, 10, 2.3], 107, ['1 rebanada', '1 slice', '1 fatia']],
];

export const FOODS: Food[] = ROWS.map(([id, category, [es, en, pt], [kcal, protein, carbs, fat, fiber], grams, [pes, pen, ppt], alcohol]) => ({
    id,
    category,
    name: { es, en, pt },
    per100: { kcal, protein, carbs, fat, fiber },
    portion: { grams, label: { es: pes, en: pen, pt: ppt } },
    ...(alcohol ? { alcohol } : {}),
}));

export const getFood = (id: string) => FOODS.find(f => f.id === id);
export const foodName = (f: Food) => l10n(f.name);
export const portionLabel = (f: Food) => l10n(f.portion.label);

const round1 = (n: number) => Math.round(n * 10) / 10;

// Nutrition for any amount in grams.
export const foodMacros = (f: Food, grams: number): Macros & { fiber: number } => {
    const k = grams / 100;
    return {
        kcal: Math.round(f.per100.kcal * k),
        protein: round1(f.per100.protein * k),
        carbs: round1(f.per100.carbs * k),
        fat: round1(f.per100.fat * k),
        fiber: round1(f.per100.fiber * k),
    };
};

// Highlights for a food, judged per 100 g.
export type FoodTag = 'highProtein' | 'lowCarb' | 'highFiber' | 'highFat' | 'lowKcal';
export const foodTags = (f: Food): FoodTag[] => {
    const { kcal, protein, carbs, fat, fiber } = f.per100;
    const tags: FoodTag[] = [];
    if (protein >= 10 && (protein * 4) / kcal >= 0.25) tags.push('highProtein');
    if (carbs <= 5 && !f.alcohol) tags.push('lowCarb');
    if (fiber >= 6) tags.push('highFiber');
    if (fat >= 20) tags.push('highFat');
    if (kcal <= 50) tags.push('lowKcal');
    return tags;
};

// Accent-insensitive search on the name in every language.
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const searchFoods = (query: string, category: FoodCategory | null = null) => {
    const q = fold(query.trim());
    return FOODS.filter(f => (!category || f.category === category) && (!q || Object.values(f.name).some(n => fold(n).includes(q))));
};
