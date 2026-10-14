import type { L10n } from '../i18n';

// Walking plans for people who just want to walk: a few weeks that build up
// walks per week, minutes per walk and the daily step goal.

export interface WalkWeek {
    walks: number; // walks this week
    minutes: number; // per walk
    steps: number; // daily step goal
    intervals?: boolean; // alternate 3 min brisk / 2 min easy
}

export interface WalkPlan {
    id: string;
    name: L10n;
    description: L10n;
    weeks: WalkWeek[];
}

export const WALK_PLANS: WalkPlan[] = [
    {
        id: 'empezar',
        name: { es: 'Empieza a caminar', en: 'Start walking', pt: 'Comece a caminhar' },
        description: {
            es: '4 semanas para crear el hábito: 3 caminatas a la semana, de 15 a 30 minutos.',
            en: '4 weeks to build the habit: 3 walks a week, from 15 to 30 minutes.',
            pt: '4 semanas para criar o hábito: 3 caminhadas por semana, de 15 a 30 minutos.',
        },
        weeks: [
            { walks: 3, minutes: 15, steps: 5000 },
            { walks: 3, minutes: 20, steps: 6000 },
            { walks: 3, minutes: 25, steps: 6500 },
            { walks: 3, minutes: 30, steps: 7000 },
        ],
    },
    {
        id: 'diez-mil',
        name: { es: 'Hacia los 10.000 pasos', en: 'Up to 10,000 steps', pt: 'Rumo aos 10.000 passos' },
        description: {
            es: '6 semanas subiendo tus pasos diarios hasta 10.000, con 4 caminatas a la semana.',
            en: '6 weeks raising your daily steps to 10,000, with 4 walks a week.',
            pt: '6 semanas aumentando seus passos diários até 10.000, com 4 caminhadas por semana.',
        },
        weeks: [
            { walks: 4, minutes: 25, steps: 6000 },
            { walks: 4, minutes: 30, steps: 7000 },
            { walks: 4, minutes: 35, steps: 8000 },
            { walks: 4, minutes: 40, steps: 8500 },
            { walks: 4, minutes: 40, steps: 9000 },
            { walks: 4, minutes: 45, steps: 10000 },
        ],
    },
    {
        id: 'quemar',
        name: { es: 'Caminar para quemar grasa', en: 'Walk to burn fat', pt: 'Caminhar para queimar gordura' },
        description: {
            es: '6 semanas de caminatas con intervalos: 3 minutos a paso rápido y 2 suaves, 5 veces por semana.',
            en: '6 weeks of interval walks: 3 minutes brisk and 2 easy, 5 times a week.',
            pt: '6 semanas de caminhadas com intervalos: 3 minutos em ritmo rápido e 2 leves, 5 vezes por semana.',
        },
        weeks: [
            { walks: 5, minutes: 30, steps: 7000, intervals: true },
            { walks: 5, minutes: 35, steps: 8000, intervals: true },
            { walks: 5, minutes: 40, steps: 8500, intervals: true },
            { walks: 5, minutes: 40, steps: 9000, intervals: true },
            { walks: 5, minutes: 45, steps: 10000, intervals: true },
            { walks: 5, minutes: 50, steps: 10000, intervals: true },
        ],
    },
];

export const getWalkPlan = (id: string) => WALK_PLANS.find(p => p.id === id);
