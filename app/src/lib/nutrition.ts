import type { Activity, Goal, Macros, Meal, Profile, Sex } from '../store/types';

// Daily targets. With sex, age and height the energy need comes from the
// Mifflin-St Jeor equation times the activity level; otherwise it falls back
// to calories per kg of body weight. Either way it is a starting point the
// user can edit, not a prescription.
// Protein per kg follows common sports-nutrition ranges (1.6–2.2 g/kg).
const PER_KG: Record<Goal, { kcal: number; protein: number; fat: number }> = {
    musculo: { kcal: 35, protein: 2.0, fat: 0.9 }, // small surplus
    fuerza: { kcal: 33, protein: 1.8, fat: 0.9 },
    grasa: { kcal: 27, protein: 2.0, fat: 0.8 }, // deficit, high protein to keep muscle
    salud: { kcal: 30, protein: 1.6, fat: 0.8 },
};

// Activity outside training, plus the training itself (3–4 sessions a week).
const ACTIVITY_FACTOR: Record<Activity, number> = { sedentario: 1.35, ligero: 1.5, moderado: 1.65, alto: 1.8 };

// Daily surplus or deficit when there is no weight goal.
const GOAL_ADJUST: Record<Goal, number> = { musculo: 250, fuerza: 150, grasa: -450, salud: 0 };

// Never suggest eating less than this.
const MIN_KCAL: Record<Sex, number> = { hombre: 1500, mujer: 1200 };

export const ageOf = (birthYear: number, now = new Date()) => now.getFullYear() - birthYear;

export const bmr = (sex: Sex, weightKg: number, heightCm: number, age: number) =>
    10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'hombre' ? 5 : -161);

export type TargetsProfile = Pick<Profile, 'goal'> & Partial<Pick<Profile, 'sex' | 'birthYear' | 'heightCm' | 'activity' | 'weightGoal'>>;

// Lose, keep or gain, from the weight goal (or the training goal without one).
export const direction = (p: TargetsProfile, weightKg: number): 'bajar' | 'mantener' | 'subir' => {
    if (p.weightGoal) {
        const diff = p.weightGoal.targetKg - weightKg;
        return Math.abs(diff) < 0.5 ? 'mantener' : diff < 0 ? 'bajar' : 'subir';
    }
    return p.goal === 'grasa' ? 'bajar' : p.goal === 'salud' ? 'mantener' : 'subir';
};

const ADJUST = { bajar: -450, mantener: 0, subir: 250 };

const roundKcal = (kcal: number) => Math.round(kcal / 50) * 50;

export const autoTargets = (profile: TargetsProfile, weightKg: number, now = new Date()): Macros => {
    const per = PER_KG[profile.goal];
    let kcal: number;
    if (profile.sex && profile.birthYear && profile.heightCm) {
        const tdee = bmr(profile.sex, weightKg, profile.heightCm, ageOf(profile.birthYear, now)) * ACTIVITY_FACTOR[profile.activity ?? 'ligero'];
        const adjust = profile.weightGoal ? ADJUST[direction(profile, weightKg)] : GOAL_ADJUST[profile.goal];
        kcal = Math.max(MIN_KCAL[profile.sex], roundKcal(tdee + adjust));
    } else {
        kcal = roundKcal(weightKg * per.kcal);
    }
    // Losing weight: keep protein high to hold on to muscle.
    const proteinPerKg = profile.weightGoal && direction(profile, weightKg) === 'bajar' ? Math.max(per.protein, 2.0) : per.protein;
    const protein = Math.round(weightKg * proteinPerKg);
    const fat = Math.round(weightKg * per.fat);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal, protein, carbs, fat };
};

// Healthy pace: about 0.5 kg a week down, 0.25 kg a week up.
export const weeksToGoal = (fromKg: number, toKg: number) => {
    const diff = toKg - fromKg;
    if (Math.abs(diff) < 0.5) return 0;
    return Math.ceil(Math.abs(diff) / (diff < 0 ? 0.5 : 0.25));
};

// How far along the weight goal is, 0..1 (moving the wrong way counts as 0).
export const goalProgress = (goal: { startKg: number; targetKg: number }, currentKg: number) => {
    const total = goal.targetKg - goal.startKg;
    if (Math.abs(total) < 0.1) return 1;
    return Math.min(1, Math.max(0, (currentKg - goal.startKg) / total));
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
