import type { Session } from '../store/types';
import { newRecords, volume } from './progression';
import { streakWeeks, weekStart } from './stats';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: 'dumbbell' | 'flame' | 'trophy' | 'weight' | 'sunrise' | 'moon' | 'target' | 'star';
}

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'primer-entreno', title: 'Primer paso', description: 'Termina tu primer entreno', icon: 'dumbbell' },
    { id: 'entrenos-10', title: 'Constante', description: '10 entrenos completados', icon: 'dumbbell' },
    { id: 'entrenos-25', title: 'Hábito', description: '25 entrenos completados', icon: 'star' },
    { id: 'entrenos-50', title: 'Imparable', description: '50 entrenos completados', icon: 'star' },
    { id: 'entrenos-100', title: 'Centurión', description: '100 entrenos completados', icon: 'star' },
    { id: 'semana-completa', title: 'Semana redonda', description: 'Cumple tu objetivo de días en una semana', icon: 'target' },
    { id: 'racha-4', title: 'Un mes seguido', description: '4 semanas seguidas entrenando', icon: 'flame' },
    { id: 'racha-12', title: 'Tres meses sin fallar', description: '12 semanas seguidas entrenando', icon: 'flame' },
    { id: 'primer-record', title: 'Más fuerte que ayer', description: 'Bate tu primer récord', icon: 'trophy' },
    { id: 'records-10', title: 'Coleccionista', description: 'Bate 10 récords', icon: 'trophy' },
    { id: 'sesion-5t', title: 'Cinco toneladas', description: 'Mueve 5.000 kg en una sesión', icon: 'weight' },
    { id: 'total-100t', title: 'Cien toneladas', description: 'Mueve 100.000 kg en total', icon: 'weight' },
    { id: 'madrugador', title: 'Madrugador', description: 'Empieza un entreno antes de las 8:00', icon: 'sunrise' },
    { id: 'nocturno', title: 'Turno de noche', description: 'Empieza un entreno después de las 21:00', icon: 'moon' },
];

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
