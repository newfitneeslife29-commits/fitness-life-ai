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

// Quick workouts by muscle group: one session, started in one tap without
// touching the plan. Gym ones use common equipment; home ones only need a
// pair of dumbbells or nothing. `cover` is a photo in public/covers.
export interface QuickWorkout extends TravelWorkout { place: 'gym' | 'home'; cover: string }

export const QUICK_WORKOUTS: QuickWorkout[] = [
    {
        id: 'quick-chest-triceps', place: 'gym', cover: 'hombros-1', minutes: 45,
        name: { es: 'Pecho y tríceps', en: 'Chest and triceps', pt: 'Peito e tríceps' },
        exercises: [ex('press-banca', 6, 10, 120, 4), ex('press-inclinado-mancuernas', 8, 12, 90), ex('aperturas-polea', 12, 15, 60), ex('fondos', 8, 12, 90), ex('extension-triceps-polea', 10, 15, 60), ex('press-frances', 10, 12, 60)],
    },
    {
        id: 'quick-back-biceps', place: 'gym', cover: 'espalda-2', minutes: 45,
        name: { es: 'Espalda y bíceps', en: 'Back and biceps', pt: 'Costas e bíceps' },
        exercises: [ex('jalon-pecho', 8, 12, 90, 4), ex('remo-barra', 6, 10, 120), ex('remo-polea', 10, 12, 90), ex('face-pull', 12, 15, 60), ex('curl-barra', 8, 12, 60), ex('curl-martillo', 10, 12, 60)],
    },
    {
        id: 'quick-legs', place: 'gym', cover: 'piernas-1', minutes: 50,
        name: { es: 'Pierna completa', en: 'Full legs', pt: 'Pernas completas' },
        exercises: [ex('sentadilla', 6, 10, 150, 4), ex('peso-muerto-rumano', 8, 10, 120), ex('prensa', 10, 12, 90), ex('curl-femoral', 10, 12, 60), ex('extension-cuadriceps', 12, 15, 60), ex('elevacion-gemelos', 12, 15, 45)],
    },
    {
        id: 'quick-glutes', place: 'gym', cover: 'gluteos-1', minutes: 40,
        name: { es: 'Glúteos', en: 'Glutes', pt: 'Glúteos' },
        exercises: [ex('hip-thrust', 8, 12, 120, 4), ex('peso-muerto-rumano-mancuernas', 10, 12, 90), ex('sentadilla-dividida', 8, 10, 90), ex('abductores-maquina', 12, 20, 60), ex('patada-gluteo', 12, 15, 45)],
    },
    {
        id: 'quick-shoulders-arms', place: 'gym', cover: 'biceps-1', minutes: 40,
        name: { es: 'Hombros y brazos', en: 'Shoulders and arms', pt: 'Ombros e braços' },
        exercises: [ex('press-militar', 6, 10, 120), ex('elevaciones-laterales', 12, 15, 60, 4), ex('face-pull', 12, 15, 60), ex('curl-mancuernas', 10, 12, 60), ex('extension-triceps-mancuerna', 10, 12, 60), ex('curl-martillo', 10, 12, 60)],
    },
    {
        id: 'quick-machines', place: 'gym', cover: 'pecho-2', minutes: 35,
        name: { es: 'Principiante: solo máquinas', en: 'Beginner: machines only', pt: 'Iniciante: só máquinas' },
        exercises: [ex('prensa', 10, 12, 90), ex('press-pecho-maquina', 10, 12, 90), ex('remo-maquina', 10, 12, 90), ex('press-hombro-maquina', 10, 12, 90), ex('curl-femoral', 10, 12, 60), ex('plancha', 20, 40, 45)],
    },
    {
        id: 'quick-home-dumbbells', place: 'home', cover: 'espalda-4', minutes: 35,
        name: { es: 'En casa: cuerpo completo con mancuernas', en: 'Home: full body with dumbbells', pt: 'Em casa: corpo inteiro com halteres' },
        exercises: [ex('sentadilla-goblet', 10, 12, 75), ex('press-banca-mancuernas', 8, 12, 75), ex('remo-mancuerna', 10, 12, 60), ex('peso-muerto-rumano-mancuernas', 10, 12, 75), ex('press-hombro-mancuernas', 8, 12, 60), ex('plancha', 30, 45, 45)],
    },
    {
        id: 'quick-home-glutes', place: 'home', cover: 'mujer-disco', minutes: 25,
        name: { es: 'En casa: glúteos sin material', en: 'Home: glutes, no equipment', pt: 'Em casa: glúteos sem equipamento' },
        exercises: [ex('puente-gluteo', 15, 20, 45), ex('puente-gluteo-una-pierna', 10, 12, 45), ex('zancadas-libres', 10, 12, 45), ex('patada-gluteo', 15, 20, 40), ex('sentadilla-libre', 15, 20, 45)],
    },
    {
        id: 'quick-core', place: 'home', cover: 'core-1', minutes: 15,
        name: { es: 'Abdomen en 15 minutos', en: 'Abs in 15 minutes', pt: 'Abdômen em 15 minutos' },
        exercises: [ex('dead-bug', 10, 12, 30), ex('crunch-inverso', 12, 15, 30), ex('bicicleta-abdominal', 20, 30, 30), ex('plancha-lateral', 20, 30, 30), ex('plancha', 30, 45, 30)],
    },
    {
        id: 'quick-hiit', place: 'home', cover: 'triceps-1', minutes: 20,
        name: { es: 'Circuito para quemar (HIIT)', en: 'Fat-burning circuit (HIIT)', pt: 'Circuito para queimar (HIIT)' },
        exercises: [ex('sentadilla-salto', 12, 15, 30, 4), ex('escaladores', 30, 40, 30, 4), ex('flexiones', 8, 12, 30, 4), ex('zancada-salto', 10, 12, 30, 4), ex('subida-rodilla', 20, 30, 30, 4)],
    },
    {
        id: 'quick-mobility', place: 'home', cover: 'mujer-barra', minutes: 12,
        name: { es: 'Movilidad y espalda sana', en: 'Mobility and a healthy back', pt: 'Mobilidade e costas saudáveis' },
        exercises: [ex('gato-camello', 30, 45, 15, 2), ex('bird-dog', 10, 12, 20, 2), ex('circulos-cadera', 30, 40, 15, 2), ex('estiramiento-psoas', 30, 45, 15, 2), ex('postura-nino', 30, 45, 15, 2)],
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
    const w = [...TRAVEL_WORKOUTS, ...ADVENT_WORKOUTS, ...QUICK_WORKOUTS].find(x => x.id === dayKey.slice(DAY_KEY.length));
    return w ? l10n(w.name) : null;
};

// A routine to start, not saved: the session keeps the name in every language.
export const travelRoutine = (w: TravelWorkout): Routine =>
    ({ id: w.id, name: l10n(w.name), dayKey: `${DAY_KEY}${w.id}`, exercises: w.exercises, source: 'custom' });
