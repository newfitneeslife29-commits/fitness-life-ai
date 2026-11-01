import { l10n, type L10n } from '../i18n';
import type { Routine, RoutineExercise } from '../store/types';

// Away from home or at a hotel: short workouts with no equipment, started
// at any time without touching the plan. Timed holds count seconds.
export interface TravelWorkout {
    id: string;
    name: L10n;
    minutes: number;
    exercises: RoutineExercise[];
}

const ex = (exerciseId: string, repMin: number, repMax: number, restSec = 40, sets = 3): RoutineExercise => ({ exerciseId, sets, repMin, repMax, restSec });

export const TRAVEL_WORKOUTS: TravelWorkout[] = [
    {
        id: 'travel-full',
        name: { es: 'Hotel: cuerpo completo', en: 'Hotel: full body', pt: 'Hotel: corpo inteiro' },
        minutes: 20,
        exercises: [ex('sentadilla-libre', 12, 15), ex('flexiones', 8, 12), ex('zancadas-libres', 10, 12), ex('superman', 20, 30), ex('escaladores', 30, 40), ex('plancha', 30, 45)],
    },
    {
        id: 'travel-legs-core',
        name: { es: 'Hotel: pierna y abdomen', en: 'Hotel: legs and abs', pt: 'Hotel: pernas e abdômen' },
        minutes: 15,
        exercises: [ex('sentadilla-salto', 10, 12, 45), ex('zancadas-libres', 10, 12), ex('puente-gluteo-una-pierna', 10, 12), ex('plancha-lateral', 20, 30, 30), ex('crunch-inverso', 12, 15, 30)],
    },
    {
        id: 'travel-upper',
        name: { es: 'Hotel: pecho, espalda y brazos', en: 'Hotel: chest, back and arms', pt: 'Hotel: peito, costas e braços' },
        minutes: 15,
        exercises: [ex('flexiones', 8, 12, 45), ex('fondos-banco', 8, 12), ex('superman', 20, 30, 30), ex('flexiones-diamante', 6, 10, 45), ex('plancha', 30, 45, 30)],
    },
];

// December challenge (lib/challenges.ts, "advent"): a 10-minute mini workout
// a day, taking turns. Two rounds each, nothing to set up.
export const ADVENT_WORKOUTS: TravelWorkout[] = [
    {
        id: 'advent-legs',
        name: { es: 'Mini entreno: pierna', en: 'Mini workout: legs', pt: 'Mini treino: pernas' },
        minutes: 10,
        exercises: [ex('sentadilla-libre', 15, 20, 30, 2), ex('zancadas-libres', 10, 12, 30, 2), ex('puente-gluteo', 15, 20, 30, 2), ex('sentadilla-salto', 10, 12, 30, 2)],
    },
    {
        id: 'advent-upper',
        name: { es: 'Mini entreno: tren superior', en: 'Mini workout: upper body', pt: 'Mini treino: parte superior' },
        minutes: 10,
        exercises: [ex('flexiones', 8, 12, 30, 2), ex('flexiones-inclinadas', 10, 12, 30, 2), ex('superman', 15, 20, 30, 2), ex('plancha', 30, 40, 30, 2)],
    },
    {
        id: 'advent-core',
        name: { es: 'Mini entreno: abdomen', en: 'Mini workout: abs', pt: 'Mini treino: abdômen' },
        minutes: 10,
        exercises: [ex('crunch', 15, 20, 30, 2), ex('crunch-inverso', 12, 15, 30, 2), ex('plancha-lateral', 20, 30, 20, 2), ex('escaladores', 30, 40, 30, 2)],
    },
    {
        id: 'advent-burn',
        name: { es: 'Mini entreno: quema', en: 'Mini workout: burn', pt: 'Mini treino: queima' },
        minutes: 10,
        exercises: [ex('sentadilla-salto', 12, 15, 30, 2), ex('escaladores', 30, 40, 30, 2), ex('flexiones', 8, 12, 30, 2), ex('zancadas-libres', 10, 12, 30, 2)],
    },
];

// The mini workout for a day of December (1–25).
export const adventWorkout = (dayOfMonth: number) => ADVENT_WORKOUTS[(dayOfMonth - 1) % ADVENT_WORKOUTS.length];

const DAY_KEY = 'travel:';
export const isAdventKey = (dayKey?: string) => !!dayKey?.startsWith(`${DAY_KEY}advent-`);
export const travelName = (dayKey: string): string | null => {
    if (!dayKey.startsWith(DAY_KEY)) return null;
    const w = [...TRAVEL_WORKOUTS, ...ADVENT_WORKOUTS].find(x => x.id === dayKey.slice(DAY_KEY.length));
    return w ? l10n(w.name) : null;
};

// A routine to start, not saved: the session keeps the name in every language.
export const travelRoutine = (w: TravelWorkout): Routine =>
    ({ id: w.id, name: l10n(w.name), dayKey: `${DAY_KEY}${w.id}`, exercises: w.exercises, source: 'custom' });
