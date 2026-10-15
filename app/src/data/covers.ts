import type { Routine } from '../store/types';
import { getExercise, type Muscle } from './exercises';

// Cover photos for the workout cards (public/covers, see CREDITS.txt there):
// one look for the whole app, dark and moody, chosen by the muscle the
// routine works most. Each one keeps the person in frame (object-position).

const FOCUS: Record<string, string> = {
    'biceps-1': '53% 39%',
    'biceps-2': '48% 42%',
    'biceps-3': '47% 35%',
    'core-1': '50% 43%',
    'espalda-1': '50% 35%',
    'espalda-2': '50% 31%',
    'espalda-3': '50% 32%',
    'gluteos-1': '50% 36%',
    'hombros-1': '44% 38%',
    'hombros-2': '47% 33%',
    'hombros-3': '42% 38%',
    'pecho-1': '39% 46%',
    'pecho-2': '50% 42%',
    'piernas-1': '61% 35%',
    'piernas-2': '50% 33%',
    'triceps-1': '67% 36%',
    'triceps-2': '66% 37%',
};

const BY_MUSCLE: Record<Muscle, string[]> = {
    pecho: ['pecho-1', 'pecho-2'],
    espalda: ['espalda-1', 'espalda-2', 'espalda-3'],
    hombros: ['hombros-1', 'hombros-2', 'hombros-3'],
    biceps: ['biceps-1', 'biceps-2', 'biceps-3'],
    triceps: ['triceps-1', 'triceps-2'],
    cuadriceps: ['piernas-1', 'piernas-2'],
    isquios: ['piernas-2', 'piernas-1'],
    gluteos: ['gluteos-1', 'piernas-2'],
    gemelos: ['piernas-1'],
    core: ['core-1', 'gluteos-1'],
};

export interface Cover { src: string; position: string }

const cover = (name: string): Cover => ({ src: `./covers/${name}.webp`, position: FOCUS[name] ?? '50% 35%' });

// The muscle with the most exercises (the first one breaks ties); routines on
// the same muscle get different photos by their id.
export const routineCover = (routine: Pick<Routine, 'id' | 'exercises'>): Cover => {
    const count = new Map<Muscle, number>();
    for (const e of routine.exercises) {
        const m = getExercise(e.exerciseId)?.muscle;
        if (m) count.set(m, (count.get(m) ?? 0) + 1);
    }
    let best: Muscle = 'pecho';
    let most = 0;
    for (const [m, n] of count) if (n > most) { best = m; most = n; }
    const list = BY_MUSCLE[best];
    let hash = 0;
    for (const ch of routine.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return cover(list[hash % list.length]);
};

// The first photo of a muscle group (the muscle cards in Ejercicios).
export const muscleCover = (m: Muscle): Cover => cover(BY_MUSCLE[m][0]);
