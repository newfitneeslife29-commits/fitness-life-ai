import { l10n, type L10n } from '../i18n';
import type { Session } from '../store/types';
import { newRecords, volume } from './progression';
import { streakWeeks, weekStart } from './stats';

export interface Achievement {
    id: string;
    title: L10n;
    description: L10n;
    icon: 'dumbbell' | 'flame' | 'trophy' | 'weight' | 'sunrise' | 'moon' | 'target' | 'star';
}

const a = (id: string, icon: Achievement['icon'], title: [string, string, string], description: [string, string, string]): Achievement => ({
    id, icon,
    title: { es: title[0], en: title[1], pt: title[2] },
    description: { es: description[0], en: description[1], pt: description[2] },
});

export const ACHIEVEMENTS: Achievement[] = [
    a('primer-entreno', 'dumbbell', ['Primer paso', 'First step', 'Primeiro passo'], ['Termina tu primer entreno', 'Finish your first workout', 'Termine seu primeiro treino']),
    a('entrenos-10', 'dumbbell', ['Constante', 'Consistent', 'Constante'], ['10 entrenos completados', '10 workouts completed', '10 treinos concluídos']),
    a('entrenos-25', 'star', ['Hábito', 'Habit', 'Hábito'], ['25 entrenos completados', '25 workouts completed', '25 treinos concluídos']),
    a('entrenos-50', 'star', ['Imparable', 'Unstoppable', 'Imparável'], ['50 entrenos completados', '50 workouts completed', '50 treinos concluídos']),
    a('entrenos-100', 'star', ['Centurión', 'Centurion', 'Centurião'], ['100 entrenos completados', '100 workouts completed', '100 treinos concluídos']),
    a('semana-completa', 'target', ['Semana redonda', 'Perfect week', 'Semana perfeita'], ['Cumple tu objetivo de días en una semana', 'Hit your weekly training target', 'Cumpra sua meta de dias numa semana']),
    a('racha-4', 'flame', ['Un mes seguido', 'A month straight', 'Um mês seguido'], ['4 semanas seguidas entrenando', '4 weeks in a row training', '4 semanas seguidas treinando']),
    a('racha-12', 'flame', ['Tres meses sin fallar', 'Three months strong', 'Três meses sem falhar'], ['12 semanas seguidas entrenando', '12 weeks in a row training', '12 semanas seguidas treinando']),
    a('primer-record', 'trophy', ['Más fuerte que ayer', 'Stronger than yesterday', 'Mais forte que ontem'], ['Bate tu primer récord', 'Set your first record', 'Bata seu primeiro recorde']),
    a('records-10', 'trophy', ['Coleccionista', 'Collector', 'Colecionador'], ['Bate 10 récords', 'Set 10 records', 'Bata 10 recordes']),
    a('sesion-5t', 'weight', ['Cinco toneladas', 'Five tonnes', 'Cinco toneladas'], ['Mueve 5.000 kg en una sesión', 'Move 5,000 kg in one session', 'Mova 5.000 kg numa sessão']),
    a('total-100t', 'weight', ['Cien toneladas', 'A hundred tonnes', 'Cem toneladas'], ['Mueve 100.000 kg en total', 'Move 100,000 kg in total', 'Mova 100.000 kg no total']),
    a('madrugador', 'sunrise', ['Madrugador', 'Early bird', 'Madrugador'], ['Empieza un entreno antes de las 8:00', 'Start a workout before 8:00', 'Comece um treino antes das 8:00']),
    a('nocturno', 'moon', ['Turno de noche', 'Night shift', 'Turno da noite'], ['Empieza un entreno después de las 21:00', 'Start a workout after 21:00', 'Comece um treino depois das 21:00']),
];

export const achievementTitle = (x: Achievement) => l10n(x.title);
export const achievementDescription = (x: Achievement) => l10n(x.description);

export interface Unlocked {
    id: string;
    sessionId: string;
    date: string;
}

// Replays the history oldest-first and records the session at which each
// achievement was first earned. Derived, so it never drifts from the data.
export const unlockedAchievements = (sessions: Session[], daysPerWeek: number): Map<string, Unlocked> => {
    const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const unlocked = new Map<string, Unlocked>();
    let total = 0;
    let records = 0;
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

        if (count >= 1) unlock('primer-entreno');
        if (count >= 10) unlock('entrenos-10');
        if (count >= 25) unlock('entrenos-25');
        if (count >= 50) unlock('entrenos-50');
        if (count >= 100) unlock('entrenos-100');
        if (records >= 1) unlock('primer-record');
        if (records >= 10) unlock('records-10');
        if (vol >= 5000) unlock('sesion-5t');
        if (total >= 100_000) unlock('total-100t');
        if (when.getHours() < 8) unlock('madrugador');
        if (when.getHours() >= 21) unlock('nocturno');

        const start = weekStart(when).getTime();
        const inWeek = seen.filter(x => weekStart(new Date(x.startedAt)).getTime() === start).length;
        if (inWeek >= daysPerWeek) unlock('semana-completa');
        const streak = streakWeeks(seen, when);
        if (streak >= 4) unlock('racha-4');
        if (streak >= 12) unlock('racha-12');
    }
    return unlocked;
};
