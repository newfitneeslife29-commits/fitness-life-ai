import { l10n, type L10n } from '../i18n';
import type { Goal, Level, Setup } from '../store/types';

// A program is a rotation of training days. Each slot is "main" (big compound,
// heavier and lower reps) or "accessory"; sets/reps/rest come from the goal.
export interface ProgramSlot {
    exerciseId: string;
    role: 'main' | 'accessory';
}

export interface ProgramDay {
    name: L10n;
    slots: ProgramSlot[];
}

export interface Program {
    id: string;
    name: L10n;
    description: L10n;
    setup: Setup;
    days: ProgramDay[];
}

const m = (exerciseId: string): ProgramSlot => ({ exerciseId, role: 'main' });
const a = (exerciseId: string): ProgramSlot => ({ exerciseId, role: 'accessory' });

export const PROGRAMS: Program[] = [
    {
        id: 'gym-full-body',
        name: { es: 'Cuerpo completo A/B', en: 'Full body A/B', pt: 'Corpo inteiro A/B' },
        description: { es: 'Dos sesiones alternas que trabajan todo el cuerpo. Ideal para 2 o 3 días por semana.', en: 'Two alternating full-body sessions. Ideal for 2 or 3 days a week.', pt: 'Duas sessões alternadas de corpo inteiro. Ideal para 2 ou 3 dias por semana.' },
        setup: 'gimnasio',
        days: [
            { name: { es: 'Cuerpo completo A', en: 'Full body A', pt: 'Corpo inteiro A' }, slots: [m('sentadilla'), m('press-banca'), m('remo-barra'), a('elevaciones-laterales'), a('curl-mancuernas'), a('plancha')] },
            { name: { es: 'Cuerpo completo B', en: 'Full body B', pt: 'Corpo inteiro B' }, slots: [m('peso-muerto-rumano'), m('press-militar'), m('jalon-pecho'), a('zancadas'), a('extension-triceps-polea'), a('elevacion-gemelos')] },
        ],
    },
    {
        id: 'gym-upper-lower',
        name: { es: 'Torso / Pierna', en: 'Upper / Lower', pt: 'Superior / Inferior' },
        description: { es: 'Cuatro sesiones: dos de torso y dos de pierna, con un día pesado y otro de volumen.', en: 'Four sessions: two upper and two lower, one heavy day and one volume day each.', pt: 'Quatro sessões: duas de superiores e duas de inferiores, um dia pesado e outro de volume.' },
        setup: 'gimnasio',
        days: [
            { name: { es: 'Torso fuerza', en: 'Upper strength', pt: 'Superiores força' }, slots: [m('press-banca'), m('remo-barra'), m('press-militar'), a('jalon-pecho'), a('curl-barra'), a('extension-triceps-polea')] },
            { name: { es: 'Pierna fuerza', en: 'Lower strength', pt: 'Inferiores força' }, slots: [m('sentadilla'), m('peso-muerto-rumano'), a('prensa'), a('curl-femoral'), a('elevacion-gemelos'), a('plancha')] },
            { name: { es: 'Torso volumen', en: 'Upper volume', pt: 'Superiores volume' }, slots: [m('press-inclinado-mancuernas'), m('remo-polea'), a('elevaciones-laterales'), a('aperturas-polea'), a('face-pull'), a('curl-martillo')] },
            { name: { es: 'Pierna volumen', en: 'Lower volume', pt: 'Inferiores volume' }, slots: [m('hip-thrust'), m('sentadilla-dividida'), a('extension-cuadriceps'), a('curl-femoral'), a('elevacion-gemelos'), a('rueda-abdominal')] },
        ],
    },
    {
        id: 'gym-ppl',
        name: { es: 'Empuje / Tirón / Pierna', en: 'Push / Pull / Legs', pt: 'Empurrar / Puxar / Pernas' },
        description: { es: 'Tres sesiones especializadas que rotan. Para 5 o 6 días por semana.', en: 'Three specialised sessions on rotation. For 5 or 6 days a week.', pt: 'Três sessões especializadas em rodízio. Para 5 ou 6 dias por semana.' },
        setup: 'gimnasio',
        days: [
            { name: { es: 'Empuje', en: 'Push', pt: 'Empurrar' }, slots: [m('press-banca'), m('press-militar'), a('press-inclinado-mancuernas'), a('elevaciones-laterales'), a('aperturas-polea'), a('extension-triceps-polea')] },
            { name: { es: 'Tirón', en: 'Pull', pt: 'Puxar' }, slots: [m('peso-muerto'), m('jalon-pecho'), a('remo-polea'), a('face-pull'), a('curl-barra'), a('curl-martillo')] },
            { name: { es: 'Pierna', en: 'Legs', pt: 'Pernas' }, slots: [m('sentadilla'), m('peso-muerto-rumano'), a('prensa'), a('curl-femoral'), a('elevacion-gemelos'), a('elevacion-piernas')] },
        ],
    },
    {
        id: 'db-full-body',
        name: { es: 'Mancuernas A/B', en: 'Dumbbells A/B', pt: 'Halteres A/B' },
        description: { es: 'Cuerpo completo solo con mancuernas y un banco.', en: 'Full body with just dumbbells and a bench.', pt: 'Corpo inteiro só com halteres e um banco.' },
        setup: 'mancuernas',
        days: [
            { name: { es: 'Mancuernas A', en: 'Dumbbells A', pt: 'Halteres A' }, slots: [m('sentadilla-goblet'), m('press-banca-mancuernas'), m('remo-mancuerna'), a('elevaciones-laterales'), a('curl-mancuernas'), a('plancha')] },
            { name: { es: 'Mancuernas B', en: 'Dumbbells B', pt: 'Halteres B' }, slots: [m('peso-muerto-rumano-mancuernas'), m('press-hombro-mancuernas'), m('sentadilla-dividida'), a('remo-mancuerna'), a('extension-triceps-mancuerna'), a('puente-gluteo')] },
        ],
    },
    {
        id: 'db-upper-lower',
        name: { es: 'Mancuernas Torso / Pierna', en: 'Dumbbell Upper / Lower', pt: 'Halteres Superior / Inferior' },
        description: { es: 'Cuatro sesiones con mancuernas para entrenar más días.', en: 'Four dumbbell sessions to train more days.', pt: 'Quatro sessões com halteres para treinar mais dias.' },
        setup: 'mancuernas',
        days: [
            { name: { es: 'Torso A', en: 'Upper A', pt: 'Superiores A' }, slots: [m('press-banca-mancuernas'), m('remo-mancuerna'), m('press-hombro-mancuernas'), a('curl-mancuernas'), a('extension-triceps-mancuerna')] },
            { name: { es: 'Pierna A', en: 'Lower A', pt: 'Inferiores A' }, slots: [m('sentadilla-goblet'), m('peso-muerto-rumano-mancuernas'), a('zancadas'), a('elevacion-gemelos-libre'), a('plancha')] },
            { name: { es: 'Torso B', en: 'Upper B', pt: 'Superiores B' }, slots: [m('press-inclinado-mancuernas'), m('remo-mancuerna'), a('elevaciones-laterales'), a('flexiones'), a('curl-martillo')] },
            { name: { es: 'Pierna B', en: 'Lower B', pt: 'Inferiores B' }, slots: [m('sentadilla-dividida'), m('puente-gluteo'), a('sentadilla-goblet'), a('elevacion-gemelos-libre'), a('rueda-abdominal')] },
        ],
    },
    {
        id: 'home-bodyweight',
        name: { es: 'En casa sin material', en: 'At home, no equipment', pt: 'Em casa sem equipamento' },
        description: { es: 'Peso corporal: progresas sumando repeticiones.', en: 'Bodyweight: you progress by adding reps.', pt: 'Peso corporal: você evolui somando repetições.' },
        setup: 'casa',
        days: [
            { name: { es: 'Casa A', en: 'Home A', pt: 'Casa A' }, slots: [m('sentadilla-libre'), m('flexiones'), m('remo-invertido'), a('zancadas-libres'), a('flexiones-declinadas'), a('plancha')] },
            { name: { es: 'Casa B', en: 'Home B', pt: 'Casa B' }, slots: [m('zancadas-libres'), m('flexiones-declinadas'), m('remo-invertido'), a('puente-gluteo'), a('fondos-banco'), a('elevacion-gemelos-libre')] },
        ],
    },
];

export const getProgram = (id: string) => PROGRAMS.find(p => p.id === id);
export const programName = (p: Program) => l10n(p.name);
export const programDescription = (p: Program) => l10n(p.description);

// Plan routines and sessions keep a `dayKey` ("programId:index") so their
// names follow the app language.
export const dayKeyOf = (programId: string, index: number) => `${programId}:${index}`;
export const dayName = (dayKey: string): string | null => {
    const [programId, index] = dayKey.split(':');
    const day = getProgram(programId)?.days[Number(index)];
    return day ? l10n(day.name) : null;
};

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
