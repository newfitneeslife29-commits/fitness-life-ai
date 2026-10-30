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

const DAY_KEY = 'travel:';
export const travelName = (dayKey: string): string | null => {
    if (!dayKey.startsWith(DAY_KEY)) return null;
    const w = TRAVEL_WORKOUTS.find(x => x.id === dayKey.slice(DAY_KEY.length));
    return w ? l10n(w.name) : null;
};

// A routine to start, not saved: the session keeps the name in every language.
export const travelRoutine = (w: TravelWorkout): Routine =>
    ({ id: w.id, name: l10n(w.name), dayKey: `${DAY_KEY}${w.id}`, exercises: w.exercises, source: 'custom' });
