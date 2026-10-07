import type { Goal, Level, Setup } from '../store/types';

// A program is a rotation of training days. Each slot is "main" (big compound,
// heavier and lower reps) or "accessory"; sets/reps/rest come from the goal.
export interface ProgramSlot {
    exerciseId: string;
    role: 'main' | 'accessory';
}

export interface ProgramDay {
    name: string;
    slots: ProgramSlot[];
}

export interface Program {
    id: string;
    name: string;
    description: string;
    setup: Setup;
    days: ProgramDay[];
}

const m = (exerciseId: string): ProgramSlot => ({ exerciseId, role: 'main' });
const a = (exerciseId: string): ProgramSlot => ({ exerciseId, role: 'accessory' });

export const PROGRAMS: Program[] = [
    {
        id: 'gym-full-body',
        name: 'Cuerpo completo A/B',
        description: 'Dos sesiones alternas que trabajan todo el cuerpo. Ideal para 2 o 3 días por semana.',
        setup: 'gimnasio',
        days: [
            { name: 'Cuerpo completo A', slots: [m('sentadilla'), m('press-banca'), m('remo-barra'), a('elevaciones-laterales'), a('curl-mancuernas'), a('plancha')] },
            { name: 'Cuerpo completo B', slots: [m('peso-muerto-rumano'), m('press-militar'), m('jalon-pecho'), a('zancadas'), a('extension-triceps-polea'), a('elevacion-gemelos')] },
        ],
    },
    {
        id: 'gym-upper-lower',
        name: 'Torso / Pierna',
        description: 'Cuatro sesiones: dos de torso y dos de pierna, con un día pesado y otro de volumen.',
        setup: 'gimnasio',
        days: [
            { name: 'Torso fuerza', slots: [m('press-banca'), m('remo-barra'), m('press-militar'), a('jalon-pecho'), a('curl-barra'), a('extension-triceps-polea')] },
            { name: 'Pierna fuerza', slots: [m('sentadilla'), m('peso-muerto-rumano'), a('prensa'), a('curl-femoral'), a('elevacion-gemelos'), a('plancha')] },
            { name: 'Torso volumen', slots: [m('press-inclinado-mancuernas'), m('remo-polea'), a('elevaciones-laterales'), a('aperturas-polea'), a('face-pull'), a('curl-martillo')] },
            { name: 'Pierna volumen', slots: [m('hip-thrust'), m('sentadilla-bulgara'), a('extension-cuadriceps'), a('curl-femoral'), a('elevacion-gemelos'), a('rueda-abdominal')] },
        ],
    },
    {
        id: 'gym-ppl',
        name: 'Empuje / Tirón / Pierna',
        description: 'Tres sesiones especializadas que rotan. Para 5 o 6 días por semana.',
        setup: 'gimnasio',
        days: [
            { name: 'Empuje', slots: [m('press-banca'), m('press-militar'), a('press-inclinado-mancuernas'), a('elevaciones-laterales'), a('aperturas-polea'), a('extension-triceps-polea')] },
            { name: 'Tirón', slots: [m('peso-muerto'), m('jalon-pecho'), a('remo-polea'), a('face-pull'), a('curl-barra'), a('curl-martillo')] },
            { name: 'Pierna', slots: [m('sentadilla'), m('peso-muerto-rumano'), a('prensa'), a('curl-femoral'), a('elevacion-gemelos'), a('elevacion-piernas')] },
        ],
    },
    {
        id: 'db-full-body',
        name: 'Mancuernas A/B',
        description: 'Cuerpo completo solo con mancuernas y un banco.',
        setup: 'mancuernas',
        days: [
            { name: 'Mancuernas A', slots: [m('sentadilla-goblet'), m('press-banca-mancuernas'), m('remo-mancuerna'), a('elevaciones-laterales'), a('curl-mancuernas'), a('plancha')] },
            { name: 'Mancuernas B', slots: [m('peso-muerto-rumano-mancuernas'), m('press-hombro-mancuernas'), m('sentadilla-bulgara'), a('remo-mancuerna'), a('extension-triceps-mancuerna'), a('puente-gluteo')] },
        ],
    },
    {
        id: 'db-upper-lower',
        name: 'Mancuernas Torso / Pierna',
        description: 'Cuatro sesiones con mancuernas para entrenar más días.',
        setup: 'mancuernas',
        days: [
            { name: 'Torso A', slots: [m('press-banca-mancuernas'), m('remo-mancuerna'), m('press-hombro-mancuernas'), a('curl-mancuernas'), a('extension-triceps-mancuerna')] },
            { name: 'Pierna A', slots: [m('sentadilla-goblet'), m('peso-muerto-rumano-mancuernas'), a('zancadas'), a('elevacion-gemelos-libre'), a('plancha')] },
            { name: 'Torso B', slots: [m('press-inclinado-mancuernas'), m('remo-mancuerna'), a('elevaciones-laterales'), a('flexiones'), a('curl-martillo')] },
            { name: 'Pierna B', slots: [m('sentadilla-bulgara'), m('puente-gluteo'), a('sentadilla-goblet'), a('elevacion-gemelos-libre'), a('rueda-abdominal')] },
        ],
    },
    {
        id: 'home-bodyweight',
        name: 'En casa sin material',
        description: 'Peso corporal: progresas sumando repeticiones.',
        setup: 'casa',
        days: [
            { name: 'Casa A', slots: [m('sentadilla-libre'), m('flexiones'), m('remo-invertido'), a('zancadas-libres'), a('pike-push-up'), a('plancha')] },
            { name: 'Casa B', slots: [m('zancadas-libres'), m('pike-push-up'), m('remo-invertido'), a('puente-gluteo'), a('fondos-banco'), a('elevacion-gemelos-libre')] },
        ],
    },
];

export const getProgram = (id: string) => PROGRAMS.find(p => p.id === id);

// Which program fits a setup and a number of days per week.
export const pickProgram = (setup: Setup, daysPerWeek: number): Program => {
    if (setup === 'casa') return getProgram('home-bodyweight')!;
    if (setup === 'mancuernas') return getProgram(daysPerWeek >= 4 ? 'db-upper-lower' : 'db-full-body')!;
    if (daysPerWeek >= 5) return getProgram('gym-ppl')!;
    if (daysPerWeek === 4) return getProgram('gym-upper-lower')!;
    return getProgram('gym-full-body')!;
};

interface Prescription { sets: number; repMin: number; repMax: number; restSec: number }

const PRESCRIPTION: Record<Goal, Record<ProgramSlot['role'], Prescription>> = {
    fuerza: {
        main: { sets: 4, repMin: 4, repMax: 6, restSec: 180 },
        accessory: { sets: 3, repMin: 6, repMax: 10, restSec: 90 },
    },
    musculo: {
        main: { sets: 3, repMin: 6, repMax: 10, restSec: 120 },
        accessory: { sets: 3, repMin: 10, repMax: 15, restSec: 75 },
    },
    salud: {
        main: { sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        accessory: { sets: 2, repMin: 12, repMax: 15, restSec: 60 },
    },
};

// Timed holds use seconds instead of reps.
const TIMED: Prescription = { sets: 3, repMin: 20, repMax: 45, restSec: 60 };

export const prescribe = (goal: Goal, level: Level, role: ProgramSlot['role'], timed = false): Prescription => {
    const base = timed ? TIMED : PRESCRIPTION[goal][role];
    // Beginners start with one set less on main lifts; advanced add one.
    const delta = role === 'main' && !timed ? (level === 'principiante' ? -1 : level === 'avanzado' ? 1 : 0) : 0;
    return { ...base, sets: Math.max(2, base.sets + delta) };
};
