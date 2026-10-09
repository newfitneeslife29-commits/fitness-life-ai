import { l10n, type L10n } from '../i18n';
import type { Goal, Level, Limitation, Setup } from '../store/types';
import { getExercise, type Equipment } from './exercises';

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
    // Made for people starting out: few, simple exercises, machines first.
    beginner?: boolean;
    // Part of Fitness Life Premium.
    premium?: boolean;
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
    // Starting out: few exercises, guided machines and simple movements.
    {
        id: 'gym-start',
        name: { es: 'Primeros pasos en el gimnasio', en: 'First steps at the gym', pt: 'Primeiros passos na academia' },
        description: { es: 'Para quien nunca ha entrenado: máquinas guiadas y movimientos sencillos para aprender la técnica sin miedo.', en: 'For people who have never trained: guided machines and simple moves to learn technique with confidence.', pt: 'Para quem nunca treinou: máquinas guiadas e movimentos simples para aprender a técnica sem medo.' },
        setup: 'gimnasio',
        beginner: true,
        days: [
            { name: { es: 'Inicio A', en: 'Start A', pt: 'Início A' }, slots: [m('prensa'), m('press-pecho-maquina'), m('remo-maquina'), a('curl-femoral'), a('press-hombro-maquina'), a('plancha')] },
            { name: { es: 'Inicio B', en: 'Start B', pt: 'Início B' }, slots: [m('sentadilla-goblet'), m('jalon-pecho'), m('press-pecho-maquina'), a('abductores-maquina'), a('elevacion-gemelos'), a('dead-bug')] },
        ],
    },
    {
        id: 'db-start',
        name: { es: 'Primeros pasos con mancuernas', en: 'First steps with dumbbells', pt: 'Primeiros passos com halteres' },
        description: { es: 'Rutina sencilla de cuerpo completo para aprender los movimientos básicos con poco peso.', en: 'A simple full-body routine to learn the basic movements with light weights.', pt: 'Rotina simples de corpo inteiro para aprender os movimentos básicos com pouco peso.' },
        setup: 'mancuernas',
        beginner: true,
        days: [
            { name: { es: 'Inicio A', en: 'Start A', pt: 'Início A' }, slots: [m('sentadilla-goblet'), m('press-banca-mancuernas'), m('remo-mancuerna'), a('puente-gluteo'), a('plancha')] },
            { name: { es: 'Inicio B', en: 'Start B', pt: 'Início B' }, slots: [m('peso-muerto-rumano-mancuernas'), m('press-hombro-mancuernas'), m('subida-banco'), a('curl-mancuernas'), a('dead-bug')] },
        ],
    },
    {
        id: 'home-start',
        name: { es: 'Primeros pasos en casa', en: 'First steps at home', pt: 'Primeiros passos em casa' },
        description: { es: 'Sin material y con versiones fáciles de cada ejercicio. Con cronómetro por voz en los ejercicios de tiempo.', en: 'No equipment and easy versions of every exercise. Timed exercises come with a voice timer.', pt: 'Sem equipamento e com versões fáceis de cada exercício. Cronômetro por voz nos exercícios de tempo.' },
        setup: 'casa',
        beginner: true,
        days: [
            { name: { es: 'Casa inicio A', en: 'Home start A', pt: 'Casa início A' }, slots: [m('sentadilla-libre'), m('flexiones-inclinadas'), m('puente-gluteo'), a('superman'), a('plancha')] },
            { name: { es: 'Casa inicio B', en: 'Home start B', pt: 'Casa início B' }, slots: [m('zancadas-libres'), m('flexiones-inclinadas'), m('patada-gluteo'), a('dead-bug'), a('plancha-lateral'), a('elevacion-gemelos-libre')] },
        ],
    },

    // Fitness Life Premium.
    {
        id: 'premium-glutes',
        name: { es: 'Glúteos y piernas', en: 'Glutes and legs', pt: 'Glúteos e pernas' },
        description: { es: 'Tres sesiones centradas en glúteos y piernas, con un día de torso para mantener el equilibrio.', en: 'Three sessions focused on glutes and legs, plus an upper-body day for balance.', pt: 'Três sessões focadas em glúteos e pernas, com um dia de superiores para equilibrar.' },
        setup: 'gimnasio',
        premium: true,
        days: [
            { name: { es: 'Glúteo fuerza', en: 'Glute strength', pt: 'Glúteo força' }, slots: [m('hip-thrust'), m('peso-muerto-rumano'), a('sentadilla-dividida'), a('abductores-maquina'), a('patada-gluteo')] },
            { name: { es: 'Torso', en: 'Upper body', pt: 'Superiores' }, slots: [m('press-inclinado-mancuernas'), m('jalon-pecho'), a('remo-polea'), a('elevaciones-laterales'), a('plancha')] },
            { name: { es: 'Pierna completa', en: 'Full legs', pt: 'Pernas completas' }, slots: [m('sentadilla'), m('puente-gluteo-una-pierna'), a('prensa'), a('curl-femoral'), a('abductores-maquina'), a('elevacion-gemelos')] },
        ],
    },
    {
        id: 'premium-strength',
        name: { es: 'Fuerza básica 4 días', en: 'Basic strength, 4 days', pt: 'Força básica 4 dias' },
        description: { es: 'Un día para cada gran básico (sentadilla, banca, peso muerto y press militar) con sus accesorios.', en: 'One day for each big lift (squat, bench, deadlift and overhead press) with its accessories.', pt: 'Um dia para cada grande básico (agachamento, supino, levantamento terra e desenvolvimento) com acessórios.' },
        setup: 'gimnasio',
        premium: true,
        days: [
            { name: { es: 'Sentadilla', en: 'Squat', pt: 'Agachamento' }, slots: [m('sentadilla'), a('prensa'), a('curl-femoral'), a('rueda-abdominal')] },
            { name: { es: 'Press de banca', en: 'Bench press', pt: 'Supino' }, slots: [m('press-banca'), a('remo-barra'), a('fondos'), a('face-pull')] },
            { name: { es: 'Peso muerto', en: 'Deadlift', pt: 'Levantamento terra' }, slots: [m('peso-muerto'), a('hip-thrust'), a('dominadas'), a('elevacion-piernas')] },
            { name: { es: 'Press militar', en: 'Overhead press', pt: 'Desenvolvimento' }, slots: [m('press-militar'), a('press-inclinado-mancuernas'), a('remo-polea'), a('curl-barra'), a('press-frances')] },
        ],
    },
    {
        id: 'premium-arms',
        name: { es: 'Torso y brazos', en: 'Upper body and arms', pt: 'Superiores e braços' },
        description: { es: 'Cinco días con más volumen para pecho, espalda, hombros y brazos, sin olvidar la pierna.', en: 'Five days with extra volume for chest, back, shoulders and arms, legs included.', pt: 'Cinco dias com mais volume para peito, costas, ombros e braços, sem esquecer as pernas.' },
        setup: 'gimnasio',
        premium: true,
        days: [
            { name: { es: 'Pecho y tríceps', en: 'Chest and triceps', pt: 'Peito e tríceps' }, slots: [m('press-banca'), m('press-inclinado-mancuernas'), a('aperturas-polea'), a('fondos'), a('extension-triceps-polea')] },
            { name: { es: 'Espalda y bíceps', en: 'Back and biceps', pt: 'Costas e bíceps' }, slots: [m('dominadas'), m('remo-barra'), a('remo-polea'), a('curl-barra'), a('curl-martillo')] },
            { name: { es: 'Pierna', en: 'Legs', pt: 'Pernas' }, slots: [m('sentadilla'), m('peso-muerto-rumano'), a('prensa'), a('curl-femoral'), a('elevacion-gemelos')] },
            { name: { es: 'Hombros', en: 'Shoulders', pt: 'Ombros' }, slots: [m('press-militar'), a('elevaciones-laterales'), a('face-pull'), a('press-hombro-maquina'), a('plancha-lateral')] },
            { name: { es: 'Brazos', en: 'Arms', pt: 'Braços' }, slots: [m('curl-barra'), m('press-frances'), a('curl-mancuernas'), a('extension-triceps-mancuerna'), a('curl-martillo'), a('extension-triceps-polea')] },
        ],
    },
    {
        id: 'premium-db-ppl',
        name: { es: 'Mancuernas Empuje / Tirón / Pierna', en: 'Dumbbell Push / Pull / Legs', pt: 'Halteres Empurrar / Puxar / Pernas' },
        description: { es: 'Tres sesiones especializadas solo con mancuernas y un banco.', en: 'Three specialised sessions with just dumbbells and a bench.', pt: 'Três sessões especializadas só com halteres e um banco.' },
        setup: 'mancuernas',
        premium: true,
        days: [
            { name: { es: 'Empuje', en: 'Push', pt: 'Empurrar' }, slots: [m('press-banca-mancuernas'), m('press-hombro-mancuernas'), a('press-inclinado-mancuernas'), a('elevaciones-laterales'), a('extension-triceps-mancuerna')] },
            { name: { es: 'Tirón', en: 'Pull', pt: 'Puxar' }, slots: [m('remo-mancuerna'), m('peso-muerto-rumano-mancuernas'), a('superman'), a('curl-mancuernas'), a('curl-martillo')] },
            { name: { es: 'Pierna', en: 'Legs', pt: 'Pernas' }, slots: [m('sentadilla-goblet'), m('sentadilla-dividida'), a('subida-banco'), a('puente-gluteo-una-pierna'), a('elevacion-gemelos-libre'), a('giro-ruso')] },
        ],
    },
    {
        id: 'premium-home-burn',
        name: { es: 'Quema grasa en casa', en: 'Fat burn at home', pt: 'Queima gordura em casa' },
        description: { es: 'Circuitos sin material con mucho trabajo por tiempo. El cronómetro te va cantando los segundos.', en: 'No-equipment circuits with lots of timed work. The timer calls out the seconds.', pt: 'Circuitos sem equipamento com muito trabalho por tempo. O cronômetro vai dizendo os segundos.' },
        setup: 'casa',
        premium: true,
        days: [
            { name: { es: 'Circuito A', en: 'Circuit A', pt: 'Circuito A' }, slots: [m('sentadilla-libre'), m('flexiones'), a('escaladores'), a('zancadas-libres'), a('plancha'), a('giro-ruso')] },
            { name: { es: 'Circuito B', en: 'Circuit B', pt: 'Circuito B' }, slots: [m('gusano'), m('puente-gluteo-una-pierna'), a('escaladores'), a('flexiones-inclinadas'), a('plancha-lateral'), a('superman')] },
            { name: { es: 'Circuito C', en: 'Circuit C', pt: 'Circuito C' }, slots: [m('zancadas-libres'), m('remo-invertido'), a('escaladores'), a('fondos-banco'), a('crunch'), a('plancha')] },
        ],
    },
    {
        id: 'premium-core',
        name: { es: 'Abdomen y core', en: 'Abs and core', pt: 'Abdômen e core' },
        description: { es: 'Cuerpo completo en casa con doble dosis de abdomen y zona media.', en: 'Full body at home with a double dose of abs and core.', pt: 'Corpo inteiro em casa com dose dupla de abdômen e core.' },
        setup: 'casa',
        premium: true,
        days: [
            { name: { es: 'Core A', en: 'Core A', pt: 'Core A' }, slots: [m('sentadilla-libre'), m('flexiones'), a('crunch'), a('dead-bug'), a('plancha'), a('giro-ruso')] },
            { name: { es: 'Core B', en: 'Core B', pt: 'Core B' }, slots: [m('puente-gluteo'), m('remo-invertido'), a('elevacion-piernas'), a('plancha-lateral'), a('escaladores'), a('superman')] },
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

// Free programs fit a setup and a number of days per week; beginners start
// with the "first steps" programs.
export interface PickInput {
    setup: Setup;
    daysPerWeek: number;
    level?: Level;
}

export const pickProgram = ({ setup, daysPerWeek, level }: PickInput): Program => {
    if (level === 'principiante' && daysPerWeek <= 4) {
        return getProgram(setup === 'casa' ? 'home-start' : setup === 'mancuernas' ? 'db-start' : 'gym-start')!;
    }
    if (setup === 'casa') return getProgram('home-bodyweight')!;
    if (setup === 'mancuernas') return getProgram(daysPerWeek >= 4 ? 'db-upper-lower' : 'db-full-body')!;
    if (daysPerWeek >= 5) return getProgram('gym-ppl')!;
    if (daysPerWeek === 4) return getProgram('gym-upper-lower')!;
    return getProgram('gym-full-body')!;
};

// Swaps for exercises that load a sore joint, best first. The first one the
// setup allows and that isn't already in the day wins.
const AVOID: Record<Limitation, Record<string, string[]>> = {
    rodillas: {
        'sentadilla': ['hip-thrust', 'puente-gluteo'],
        'sentadilla-goblet': ['peso-muerto-rumano-mancuernas', 'puente-gluteo'],
        'sentadilla-libre': ['puente-gluteo', 'puente-gluteo-una-pierna'],
        'sentadilla-dividida': ['puente-gluteo-una-pierna', 'curl-femoral', 'puente-gluteo'],
        'zancadas': ['puente-gluteo-una-pierna', 'puente-gluteo'],
        'zancadas-libres': ['puente-gluteo-una-pierna', 'patada-gluteo'],
        'subida-banco': ['puente-gluteo-una-pierna', 'patada-gluteo'],
        'extension-cuadriceps': ['abductores-maquina', 'curl-femoral'],
        'prensa': ['hip-thrust', 'abductores-maquina'],
        'escaladores': ['dead-bug', 'plancha'],
    },
    espalda: {
        'peso-muerto': ['hip-thrust', 'puente-gluteo'],
        'peso-muerto-rumano': ['curl-femoral', 'hip-thrust', 'puente-gluteo-una-pierna'],
        'peso-muerto-rumano-mancuernas': ['puente-gluteo-una-pierna', 'puente-gluteo'],
        'sentadilla': ['prensa', 'sentadilla-goblet'],
        'remo-barra': ['remo-maquina', 'remo-polea', 'remo-mancuerna'],
        'press-militar': ['press-hombro-maquina', 'press-hombro-mancuernas'],
        'rueda-abdominal': ['dead-bug', 'plancha-lateral'],
        'elevacion-piernas': ['dead-bug', 'plancha-lateral'],
        'giro-ruso': ['pallof', 'dead-bug', 'plancha-lateral'],
        'crunch': ['dead-bug', 'plancha'],
        'superman': ['plancha-lateral', 'dead-bug'],
        'swing-kettlebell': ['puente-gluteo'],
        'gusano': ['dead-bug', 'puente-gluteo'],
    },
    hombros: {
        'press-militar': ['press-pecho-maquina', 'face-pull', 'elevaciones-laterales'],
        'press-hombro-mancuernas': ['elevaciones-laterales', 'remo-mancuerna'],
        'press-hombro-maquina': ['elevaciones-laterales', 'face-pull'],
        'fondos': ['press-pecho-maquina', 'extension-triceps-polea'],
        'fondos-banco': ['extension-triceps-mancuerna', 'flexiones-inclinadas'],
        'flexiones-declinadas': ['flexiones-inclinadas'],
        'dominadas': ['jalon-pecho', 'remo-maquina'],
        'press-banca': ['press-pecho-maquina', 'press-banca-mancuernas'],
        'aperturas-polea': ['press-pecho-maquina'],
    },
    munecas: {
        'flexiones': ['flexiones-inclinadas', 'press-banca-mancuernas'],
        'flexiones-declinadas': ['flexiones-inclinadas'],
        'press-banca': ['press-pecho-maquina', 'press-banca-mancuernas'],
        'curl-barra': ['curl-martillo'],
        'press-frances': ['extension-triceps-polea', 'extension-triceps-mancuerna'],
        'fondos-banco': ['extension-triceps-mancuerna', 'superman'],
        'rueda-abdominal': ['dead-bug'],
        'gusano': ['dead-bug'],
        'escaladores': ['dead-bug'],
    },
};

const ALLOWED: Record<Setup, Equipment[]> = {
    gimnasio: ['barra', 'mancuernas', 'maquina', 'polea', 'peso corporal', 'kettlebell'],
    mancuernas: ['mancuernas', 'peso corporal'],
    casa: ['peso corporal'],
};

const avoided = (exerciseId: string, limitations: Limitation[]) => limitations.some(l => exerciseId in AVOID[l]);

// The program's days with exercises swapped around the user's limitations.
// An exercise with no safe swap stays: the coach note tells them to go light.
export const adaptDays = (program: Program, limitations: Limitation[] = []): ProgramDay[] => {
    if (!limitations.length) return program.days;
    return program.days.map(day => {
        const ids = day.slots.map(s => s.exerciseId);
        const slots = day.slots.map((slot, i) => {
            if (!avoided(slot.exerciseId, limitations)) return slot;
            const options = limitations.flatMap(l => AVOID[l][slot.exerciseId] ?? []);
            const swap = options.find(id => {
                const e = getExercise(id);
                return e && ALLOWED[program.setup].includes(e.equipment) && !ids.includes(id) && !avoided(id, limitations);
            });
            if (!swap) return slot;
            ids[i] = swap;
            return { ...slot, exerciseId: swap };
        });
        return { ...day, slots };
    });
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
    // Losing fat: more reps and shorter rests keep the heart rate up.
    grasa: {
        main: { sets: 3, repMin: 10, repMax: 15, restSec: 75 },
        accessory: { sets: 3, repMin: 12, repMax: 20, restSec: 45 },
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
