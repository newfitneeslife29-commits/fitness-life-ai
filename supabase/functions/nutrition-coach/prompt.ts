export type Lang = 'es' | 'en' | 'pt';
export type Goal = 'musculo' | 'fuerza' | 'grasa' | 'salud';
export type Sex = 'hombre' | 'mujer';
export type Activity = 'sedentario' | 'ligero' | 'moderado' | 'alto';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// What the app sends about the user. All data lives on the phone; nothing
// here is stored on the server.
export interface CoachContext {
  goal: Goal;
  weightKg: number | null;
  targets: Macros | null;
  today: Macros;
  trainedToday: boolean;
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  activity: Activity | null;
  targetWeightKg: number | null;
}

const LANGUAGE: Record<Lang, string> = { es: 'Spanish', en: 'English', pt: 'Brazilian Portuguese' };
const GOAL: Record<Goal, string> = { musculo: 'build muscle', fuerza: 'get stronger', grasa: 'lose fat', salud: 'get fit and healthy' };
const ACTIVITY: Record<Activity, string> = {
  sedentario: 'mostly sitting', ligero: 'lightly active', moderado: 'on their feet a lot', alto: 'physical job or daily sport',
};

export const chatSystem = (lang: Lang) => `You are the nutrition coach inside Fitness Life, a strength-training app. You help people eat in a way that supports their training: protein and calories, meal and snack ideas, what to eat around workouts, hydration, and practical shopping and cooking tips.

Answer in ${LANGUAGE[lang]}. Write for a phone screen: short paragraphs or a few "-" bullet points, with no headings, tables or Markdown emphasis. Most answers fit in under 150 words. When it helps, name concrete foods with rough amounts and their protein or calories.

Use the user's data below when it is relevant, for example to say how much protein is left for today. Their targets are estimates from their body data, activity and goal, not a prescription.

You give general guidance, not medical advice. If someone mentions a medical condition (such as diabetes, kidney disease, pregnancy or an eating disorder), medication, a serious allergy, or wants to eat very little or lose weight very fast, be supportive, keep the advice general and suggest they talk to a doctor or registered dietitian. Only mention well-established supplements (protein powder, creatine, caffeine) and never doses above the label.

If a question has nothing to do with eating, training or healthy habits, say briefly that you can only help with nutrition for their training.`;

const fmt = (m: Macros) => `${m.kcal} kcal, ${m.protein} g protein, ${m.carbs} g carbs, ${m.fat} g fat`;

export const contextNote = (c: CoachContext) => [
  'About this user (from the app):',
  `- Goal: ${GOAL[c.goal]}`,
  ...(c.sex ? [`- Sex: ${c.sex === 'hombre' ? 'male' : 'female'}`] : []),
  ...(c.age ? [`- Age: ${c.age}`] : []),
  ...(c.heightCm ? [`- Height: ${c.heightCm} cm`] : []),
  ...(c.activity ? [`- Daily activity outside training: ${ACTIVITY[c.activity]}`] : []),
  `- Body weight: ${c.weightKg ? `${c.weightKg} kg` : 'not logged'}`,
  ...(c.targetWeightKg ? [`- Target body weight: ${c.targetWeightKg} kg`] : []),
  `- Daily targets: ${c.targets ? fmt(c.targets) : 'not set (no body weight yet)'}`,
  `- Logged today so far: ${fmt(c.today)}`,
  `- Trained today: ${c.trainedToday ? 'yes' : 'no'}`,
].join('\n');

export const estimateSystem = (lang: Lang) => `You estimate the nutrition of meals that people describe in a food-logging app.

Split the description into its foods. When an amount is missing, assume a typical single portion. Estimate the grams, kcal, protein, carbs and fat of each item from standard food composition data, with kcal consistent with the macros.

Write "name" as a short title for the meal (2 to 5 words) and the item names in ${LANGUAGE[lang]}. Write "note" as one short sentence in ${LANGUAGE[lang]} stating the main assumption you made, or an empty string if there was nothing to assume. If the text does not describe food or drink, return no items and say so in the note.`;

// Same output as estimateSystem, from a photo of the plate.
export const photoSystem = (lang: Lang) => `You estimate the nutrition of a meal from a photo in a food-logging app.

Identify each food and drink you can see. Estimate the portion from visual cues (plate and cutlery size, how much space each food takes, thickness), then its grams, kcal, protein, carbs and fat from standard food composition data, with kcal consistent with the macros. Count visible oil, sauces and dressings. If the user adds a note (for example what is inside or how it was cooked), trust it over the photo.

Write "name" as a short title for the meal (2 to 5 words) and the item names in ${LANGUAGE[lang]}. Write "note" as one short sentence in ${LANGUAGE[lang]} stating the main assumption you made about portions or hidden ingredients. If the photo does not show food or drink, return no items and say so in the note.`;

const NUMBER = { type: 'number' } as const;

export const ESTIMATE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, grams: NUMBER, kcal: NUMBER, protein: NUMBER, carbs: NUMBER, fat: NUMBER },
        required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
        additionalProperties: false,
      },
    },
    note: { type: 'string' },
  },
  required: ['name', 'items', 'note'],
  additionalProperties: false,
};

// ---------- Personal trainer ----------

// What the app knows about the user's training. The plan and history are
// summaries the app writes from the user's own data.
export interface TrainerContext {
  goal: Goal;
  level: 'principiante' | 'intermedio' | 'avanzado';
  daysPerWeek: number;
  setup: 'gimnasio' | 'mancuernas' | 'casa';
  limitations: string[];
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  plan: string;
  history: string;
}

const ROUTINE_BUTTON: Record<Lang, string> = { es: 'Crear rutina con IA', en: 'Create routine with AI', pt: 'Criar rotina com IA' };
const LEVEL = { principiante: 'beginner', intermedio: 'intermediate', avanzado: 'advanced' } as const;
const SETUP = { gimnasio: 'a full gym', mancuernas: 'dumbbells and a bench', casa: 'bodyweight only, at home' } as const;

export const trainerSystem = (lang: Lang) => `You are the personal trainer inside Fitness Life, a strength-training app. You coach the user on their training: what to do today, how to perform an exercise, how much weight or how many reps to aim for, how to progress or break a plateau, how to adapt a session to the time, equipment or energy they have, and how to train around minor aches.

Answer in ${LANGUAGE[lang]}. Write for a phone screen: short paragraphs or a few "-" bullet points, with no headings, tables or Markdown emphasis. Most answers fit in under 150 words. Be encouraging and concrete: name exercises, sets, reps, rest and weights when it helps, based on the user's plan and recent workouts below.

The app already gives the user a plan and suggests weights with double progression (add reps up to the top of the range, then add weight). Build on that instead of contradicting it. When the user asks for a full new routine, give it briefly and mention they can tap "${ROUTINE_BUTTON[lang]}" on this screen to save one in the app.

Many users train at home with no equipment: give them the same priority and care as gym users. Make home training effective: progress with more reps, a slower tempo (3 seconds down), pauses, one-leg or one-arm versions and shorter rests, and use circuits when they want to burn fat. Household items (a backpack with books, water bottles, a sturdy chair or step) are optional extras, never required.

You give general fitness guidance, not medical advice. If someone describes sharp or worsening pain, an injury, dizziness, chest pain, pregnancy or a medical condition, tell them to stop the exercise that hurts and see a doctor or physiotherapist, and only suggest gentle alternatives. Never encourage training through pain, extreme dieting or unsafe loads.

If a question has nothing to do with training, exercise, recovery or healthy habits, say briefly that you can only help with their training.`;

export const trainerNote = (c: TrainerContext) => [
  'About this user (from the app):',
  `- Goal: ${GOAL[c.goal]}; level: ${LEVEL[c.level]}; trains ${c.daysPerWeek} days a week with ${SETUP[c.setup]}`,
  ...(c.limitations.length ? [`- Sensitive areas: ${c.limitations.join(', ')}`] : []),
  ...(c.sex ? [`- Sex: ${c.sex === 'hombre' ? 'male' : 'female'}`] : []),
  ...(c.age ? [`- Age: ${c.age}`] : []),
  ...(c.heightCm ? [`- Height: ${c.heightCm} cm`] : []),
  `- Body weight: ${c.weightKg ? `${c.weightKg} kg` : 'not logged'}`,
  ...(c.targetWeightKg ? [`- Target body weight: ${c.targetWeightKg} kg`] : []),
  '',
  'Current plan:',
  c.plan || '(none)',
  '',
  'Recent workouts (newest first):',
  c.history || '(none yet)',
].join('\n');

export const routineSystem = (lang: Lang) => `You design one workout routine for a user of a strength-training app, from their request and their profile below.

Use only exercises from the catalog in the schema (their ids). Pick 4 to 8 exercises that fit the request, the user's equipment and level, and avoid loading their sensitive areas. Order them big compound lifts first, then accessories, then core. For each, give sets (2 to 5), a rep range (repMin and repMax; for timed exercises these are seconds) and rest in seconds (30 to 240). Keep the whole routine within the time the user asks for, if they say one.

When the user trains at home with no equipment (the catalog is then bodyweight only), make the routine just as effective: balance lower and upper body, add core, and add a cardio-style move such as jump squats or mountain climbers when they want to burn fat. Use higher reps (10 to 20) or 30 to 45 second timed work with short rests (30 to 60 seconds), and say in the note how to make it harder (slower tempo, more reps, a backpack for load).

Write "name" as a short routine name (2 to 5 words) and "note" as one or two short sentences in ${LANGUAGE[lang]} explaining the idea of the routine. If the request has nothing to do with training, return no exercises and say so in the note.`;

export const routineSchema = (exerciseIds: string[]) => ({
  type: 'object',
  properties: {
    name: { type: 'string' },
    note: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exerciseId: { type: 'string', enum: exerciseIds },
          sets: { type: 'integer' },
          repMin: { type: 'integer' },
          repMax: { type: 'integer' },
          restSec: { type: 'integer' },
        },
        required: ['exerciseId', 'sets', 'repMin', 'repMax', 'restSec'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'note', 'exercises'],
  additionalProperties: false,
});

// ---------- Meal plan ----------

export const MEAL_SLOTS = ['desayuno', 'media-manana', 'almuerzo', 'merienda', 'cena', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const mealPlanSystem = (lang: Lang, mealsPerDay: number) => `You plan a week of meals for a user of a strength-training app, many of whom are beginners who do not know what to eat. The app shows the plan day by day, in order, and reminds them at the time of each meal.

Plan 7 days (Monday first) with ${mealsPerDay} meals a day, from breakfast to dinner, at realistic times ("HH:MM", 24 h) spread through the day; if the user mentions when they wake up, work or train, fit the times to that. Each day's meals should add up to the user's daily targets below, within about 5%. If there are no targets, estimate them from the profile and goal. Spread protein across the meals.

Use simple, affordable foods that are easy to find and cook where people speak ${LANGUAGE[lang]}, with home-style dishes. Give every food an amount a beginner can follow (grams, cups, units or spoons), for example "2 huevos revueltos" or "80 g de avena". Repeat breakfasts and snacks across days so shopping stays easy, and vary lunches and dinners. Respect what the user asks: foods they avoid, allergies, budget, a vegetarian diet, their schedule.

For each meal give its slot, the time, a short dish name (2 to 5 words), the foods with amounts (1 to 6), and its kcal, protein, carbs and fat, with kcal consistent with the macros.

Write "name" as a short plan name (2 to 5 words), "note" as one or two short sentences with the idea of the plan and a practical tip (for example to cook in batches), and every dish and food in ${LANGUAGE[lang]}. This is general guidance, not medical advice: if the user mentions a medical condition, pregnancy, an eating disorder or a very low calorie goal, keep the plan moderate and say in the note to check it with a doctor or dietitian. If the request has nothing to do with food, return no days and say so in the note.`;

export const MEALPLAN_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    note: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          meals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slot: { type: 'string', enum: [...MEAL_SLOTS] },
                time: { type: 'string' },
                name: { type: 'string' },
                foods: { type: 'array', items: { type: 'string' } },
                kcal: NUMBER, protein: NUMBER, carbs: NUMBER, fat: NUMBER,
              },
              required: ['slot', 'time', 'name', 'foods', 'kcal', 'protein', 'carbs', 'fat'],
              additionalProperties: false,
            },
          },
        },
        required: ['meals'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'note', 'days'],
  additionalProperties: false,
};
