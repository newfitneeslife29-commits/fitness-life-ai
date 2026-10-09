import { l10n, type L10n } from '../i18n';
import { getExercise } from '../data/exercises';
import type { BodyWeight, Session, WeightGoal } from '../store/types';
import { goalProgress } from './nutrition';
import { newRecords, volume } from './progression';
import { streakWeeks, weekStart } from './stats';

export interface Achievement {
    id: string;
    title: L10n;
    description: L10n;
    icon: 'dumbbell' | 'flame' | 'trophy' | 'weight' | 'sunrise' | 'moon' | 'target' | 'star' | 'timer' | 'layers' | 'scale';
    // Count-based medals show how close you are.
    goal?: { stat: keyof ProgressStats; target: number };
}

export interface ProgressStats {
    workouts: number;
    records: number;
    streak: number;
    totalKg: number;
    exercises: number;
    perfectWeeks: number;
}

const a = (id: string, icon: Achievement['icon'], title: [string, string, string], description: [string, string, string], goal?: Achievement['goal']): Achievement => ({
    id, icon, goal,
    title: { es: title[0], en: title[1], pt: title[2] },
    description: { es: description[0], en: description[1], pt: description[2] },
});

export const ACHIEVEMENTS: Achievement[] = [
    // Workouts
    a('primer-entreno', 'dumbbell', ['Primer paso', 'First step', 'Primeiro passo'], ['Termina tu primer entreno', 'Finish your first workout', 'Termine seu primeiro treino']),
    a('entrenos-5', 'dumbbell', ['Calentando motores', 'Warming up', 'Esquentando os motores'], ['5 entrenos completados', '5 workouts completed', '5 treinos concluídos'], { stat: 'workouts', target: 5 }),
    a('entrenos-10', 'dumbbell', ['Constante', 'Consistent', 'Constante'], ['10 entrenos completados', '10 workouts completed', '10 treinos concluídos'], { stat: 'workouts', target: 10 }),
    a('entrenos-25', 'star', ['Hábito', 'Habit', 'Hábito'], ['25 entrenos completados', '25 workouts completed', '25 treinos concluídos'], { stat: 'workouts', target: 25 }),
    a('entrenos-50', 'star', ['Imparable', 'Unstoppable', 'Imparável'], ['50 entrenos completados', '50 workouts completed', '50 treinos concluídos'], { stat: 'workouts', target: 50 }),
    a('entrenos-100', 'star', ['Centurión', 'Centurion', 'Centurião'], ['100 entrenos completados', '100 workouts completed', '100 treinos concluídos'], { stat: 'workouts', target: 100 }),
    a('entrenos-200', 'star', ['Leyenda', 'Legend', 'Lenda'], ['200 entrenos completados', '200 workouts completed', '200 treinos concluídos'], { stat: 'workouts', target: 200 }),
    a('entrenos-365', 'star', ['Un año de hierro', 'A year of iron', 'Um ano de ferro'], ['365 entrenos completados', '365 workouts completed', '365 treinos concluídos'], { stat: 'workouts', target: 365 }),
    // Weeks
    a('semana-completa', 'target', ['Semana redonda', 'Perfect week', 'Semana perfeita'], ['Cumple tu objetivo de días en una semana', 'Hit your weekly training target', 'Cumpra sua meta de dias numa semana']),
    a('semanas-completas-4', 'target', ['Cuatro de cuatro', 'Four for four', 'Quatro de quatro'], ['Cumple tu objetivo semanal 4 veces', 'Hit your weekly target 4 times', 'Cumpra sua meta semanal 4 vezes'], { stat: 'perfectWeeks', target: 4 }),
    a('semanas-completas-12', 'target', ['Disciplina', 'Discipline', 'Disciplina'], ['Cumple tu objetivo semanal 12 veces', 'Hit your weekly target 12 times', 'Cumpra sua meta semanal 12 vezes'], { stat: 'perfectWeeks', target: 12 }),
    a('racha-4', 'flame', ['Un mes seguido', 'A month straight', 'Um mês seguido'], ['4 semanas seguidas entrenando', '4 weeks in a row training', '4 semanas seguidas treinando'], { stat: 'streak', target: 4 }),
    a('racha-8', 'flame', ['Dos meses en racha', 'Two-month streak', 'Dois meses seguidos'], ['8 semanas seguidas entrenando', '8 weeks in a row training', '8 semanas seguidas treinando'], { stat: 'streak', target: 8 }),
    a('racha-12', 'flame', ['Tres meses sin fallar', 'Three months strong', 'Três meses sem falhar'], ['12 semanas seguidas entrenando', '12 weeks in a row training', '12 semanas seguidas treinando'], { stat: 'streak', target: 12 }),
    a('racha-26', 'flame', ['Medio año de fuego', 'Half a year on fire', 'Meio ano pegando fogo'], ['26 semanas seguidas entrenando', '26 weeks in a row training', '26 semanas seguidas treinando'], { stat: 'streak', target: 26 }),
    a('racha-52', 'flame', ['Un año sin parar', 'A whole year', 'Um ano sem parar'], ['52 semanas seguidas entrenando', '52 weeks in a row training', '52 semanas seguidas treinando'], { stat: 'streak', target: 52 }),
    // Records
    a('primer-record', 'trophy', ['Más fuerte que ayer', 'Stronger than yesterday', 'Mais forte que ontem'], ['Bate tu primer récord', 'Set your first record', 'Bata seu primeiro recorde']),
    a('records-10', 'trophy', ['Coleccionista', 'Collector', 'Colecionador'], ['Bate 10 récords', 'Set 10 records', 'Bata 10 recordes'], { stat: 'records', target: 10 }),
    a('records-25', 'trophy', ['Rompe límites', 'Limit breaker', 'Quebra limites'], ['Bate 25 récords', 'Set 25 records', 'Bata 25 recordes'], { stat: 'records', target: 25 }),
    a('records-50', 'trophy', ['Máquina de récords', 'Record machine', 'Máquina de recordes'], ['Bate 50 récords', 'Set 50 records', 'Bata 50 recordes'], { stat: 'records', target: 50 }),
    // Load moved
    a('sesion-5t', 'weight', ['Cinco toneladas', 'Five tonnes', 'Cinco toneladas'], ['Mueve 5.000 kg en una sesión', 'Move 5,000 kg in one session', 'Mova 5.000 kg numa sessão']),
    a('sesion-10t', 'weight', ['Diez toneladas', 'Ten tonnes', 'Dez toneladas'], ['Mueve 10.000 kg en una sesión', 'Move 10,000 kg in one session', 'Mova 10.000 kg numa sessão']),
    a('total-100t', 'weight', ['Cien toneladas', 'A hundred tonnes', 'Cem toneladas'], ['Mueve 100.000 kg en total', 'Move 100,000 kg in total', 'Mova 100.000 kg no total'], { stat: 'totalKg', target: 100_000 }),
    a('total-500t', 'weight', ['Quinientas toneladas', 'Five hundred tonnes', 'Quinhentas toneladas'], ['Mueve 500.000 kg en total', 'Move 500,000 kg in total', 'Mova 500.000 kg no total'], { stat: 'totalKg', target: 500_000 }),
    a('total-1000t', 'weight', ['Mil toneladas', 'A thousand tonnes', 'Mil toneladas'], ['Mueve 1.000.000 kg en total', 'Move 1,000,000 kg in total', 'Mova 1.000.000 kg no total'], { stat: 'totalKg', target: 1_000_000 }),
    // Timed holds
    a('aguante-60', 'timer', ['Un minuto de acero', 'One minute of steel', 'Um minuto de aço'], ['Aguanta 60 segundos en un ejercicio por tiempo', 'Hold 60 seconds in a timed exercise', 'Aguente 60 segundos num exercício por tempo']),
    a('aguante-120', 'timer', ['Dos minutos de acero', 'Two minutes of steel', 'Dois minutos de aço'], ['Aguanta 2 minutos en un ejercicio por tiempo', 'Hold 2 minutes in a timed exercise', 'Aguente 2 minutos num exercício por tempo']),
    // Variety
    a('variedad-10', 'layers', ['Explorador', 'Explorer', 'Explorador'], ['Prueba 10 ejercicios distintos', 'Try 10 different exercises', 'Experimente 10 exercícios diferentes'], { stat: 'exercises', target: 10 }),
    a('variedad-25', 'layers', ['Todoterreno', 'All-rounder', 'Versátil'], ['Prueba 25 ejercicios distintos', 'Try 25 different exercises', 'Experimente 25 exercícios diferentes'], { stat: 'exercises', target: 25 }),
    // Time of day
    a('madrugador', 'sunrise', ['Madrugador', 'Early bird', 'Madrugador'], ['Empieza un entreno antes de las 8:00', 'Start a workout before 8:00', 'Comece um treino antes das 8:00']),
    a('nocturno', 'moon', ['Turno de noche', 'Night shift', 'Turno da noite'], ['Empieza un entreno después de las 21:00', 'Start a workout after 21:00', 'Comece um treino depois das 21:00']),
    a('finde', 'sunrise', ['Sin excusas', 'No excuses', 'Sem desculpas'], ['Entrena un sábado o un domingo', 'Train on a Saturday or Sunday', 'Treine num sábado ou domingo']),
    // Body weight
    a('primer-pesaje', 'scale', ['Punto de partida', 'Starting point', 'Ponto de partida'], ['Registra tu peso por primera vez', 'Log your weight for the first time', 'Registre seu peso pela primeira vez']),
    a('meta-mitad', 'scale', ['A mitad de camino', 'Halfway there', 'Metade do caminho'], ['Llega a la mitad de tu objetivo de peso', 'Reach halfway to your weight goal', 'Chegue à metade do seu objetivo de peso']),
    a('meta-peso', 'scale', ['Objetivo cumplido', 'Goal reached', 'Objetivo alcançado'], ['Alcanza tu objetivo de peso', 'Reach your weight goal', 'Alcance seu objetivo de peso']),
];

export const achievementTitle = (x: Achievement) => l10n(x.title);
export const achievementDescription = (x: Achievement) => l10n(x.description);

export interface Unlocked {
    id: string;
    sessionId: string;
    date: string;
}

export interface BodyData {
    weights: BodyWeight[];
    goal?: WeightGoal | null;
}

// Replays the history oldest-first and records the session at which each
// achievement was first earned. Derived, so it never drifts from the data.
// Body-weight medals point at the weigh-in instead (no session).
export const unlockedAchievements = (sessions: Session[], daysPerWeek: number, body?: BodyData): Map<string, Unlocked> =>
    replay(sessions, daysPerWeek, body).unlocked;

// Where each count-based medal stands right now.
export const progressStats = (sessions: Session[], daysPerWeek: number): ProgressStats =>
    replay(sessions, daysPerWeek).stats;

const replay = (sessions: Session[], daysPerWeek: number, body?: BodyData) => {
    const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const unlocked = new Map<string, Unlocked>();
    let total = 0;
    let records = 0;
    const perfectWeeks = new Set<number>();
    const exercises = new Set<string>();
    const seen: Session[] = [];

    for (const s of ordered) {
        const unlock = (id: string) => {
            if (!unlocked.has(id)) unlocked.set(id, { id, sessionId: s.id, date: s.startedAt });
        };
        const before = seen.flatMap(x => x.sets);
        records += newRecords(before, s.sets).length;
        seen.push(s);
        const vol = volume(s.sets);
        total += vol;
        const count = seen.length;
        const when = new Date(s.startedAt);
        for (const set of s.sets) exercises.add(set.exerciseId);
        const longestHold = Math.max(0, ...s.sets.filter(x => getExercise(x.exerciseId)?.timed).map(x => x.reps));

        for (const [n, id] of [[1, 'primer-entreno'], [5, 'entrenos-5'], [10, 'entrenos-10'], [25, 'entrenos-25'], [50, 'entrenos-50'], [100, 'entrenos-100'], [200, 'entrenos-200'], [365, 'entrenos-365']] as const) {
            if (count >= n) unlock(id);
        }
        for (const [n, id] of [[1, 'primer-record'], [10, 'records-10'], [25, 'records-25'], [50, 'records-50']] as const) {
            if (records >= n) unlock(id);
        }
        if (vol >= 5000) unlock('sesion-5t');
        if (vol >= 10_000) unlock('sesion-10t');
        for (const [n, id] of [[100_000, 'total-100t'], [500_000, 'total-500t'], [1_000_000, 'total-1000t']] as const) {
            if (total >= n) unlock(id);
        }
        if (longestHold >= 60) unlock('aguante-60');
        if (longestHold >= 120) unlock('aguante-120');
        if (exercises.size >= 10) unlock('variedad-10');
        if (exercises.size >= 25) unlock('variedad-25');
        if (when.getHours() < 8) unlock('madrugador');
        if (when.getHours() >= 21) unlock('nocturno');
        if (when.getDay() === 0 || when.getDay() === 6) unlock('finde');

        const start = weekStart(when).getTime();
        const inWeek = seen.filter(x => weekStart(new Date(x.startedAt)).getTime() === start).length;
        if (inWeek >= daysPerWeek) perfectWeeks.add(start);
        if (perfectWeeks.size >= 1) unlock('semana-completa');
        if (perfectWeeks.size >= 4) unlock('semanas-completas-4');
        if (perfectWeeks.size >= 12) unlock('semanas-completas-12');
        const streak = streakWeeks(seen, when);
        for (const [n, id] of [[4, 'racha-4'], [8, 'racha-8'], [12, 'racha-12'], [26, 'racha-26'], [52, 'racha-52']] as const) {
            if (streak >= n) unlock(id);
        }
    }

    if (body) {
        const weighIns = [...body.weights].sort((a, b) => a.date.localeCompare(b.date));
        const mark = (id: string, date: string) => {
            if (!unlocked.has(id)) unlocked.set(id, { id, sessionId: '', date });
        };
        if (weighIns[0]) mark('primer-pesaje', weighIns[0].date);
        const goal = body.goal;
        if (goal && Math.abs(goal.targetKg - goal.startKg) >= 0.5) {
            for (const w of weighIns.filter(x => x.date >= goal.startedAt)) {
                const p = goalProgress(goal, w.weightKg);
                if (p >= 0.5) mark('meta-mitad', w.date);
                if (p >= 1) mark('meta-peso', w.date);
            }
        }
    }

    // The current streak, not the best, so the bar can fall back to zero.
    const stats: ProgressStats = {
        workouts: ordered.length, records, streak: streakWeeks(ordered), totalKg: total, exercises: exercises.size, perfectWeeks: perfectWeeks.size,
    };
    return { unlocked, stats };
};
