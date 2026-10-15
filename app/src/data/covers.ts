import type { Routine } from '../store/types';
import { getExercise, type Muscle } from './exercises';

// Cover photos for the workout cards (public/covers, see CREDITS.txt there),
// chosen by the muscle the routine works most. Each one keeps the person in
// frame (object-position).

const FOCUS: Record<string, string> = {
    'biceps-1': '50% 42%',
    'core-1': '52% 38%',
    'espalda-1': '49% 39%',
    'espalda-2': '51% 32%',
    'pecho-1': '50% 24%',
    'piernas-1': '61% 33%',
    'triceps-1': '66% 36%',
};

const BY_MUSCLE: Record<Muscle, string[]> = {
    pecho: ['pecho-1', 'biceps-1'],
    espalda: ['espalda-1', 'espalda-2'],
    hombros: ['espalda-2', 'biceps-1'],
    biceps: ['biceps-1'],
    triceps: ['triceps-1'],
    cuadriceps: ['piernas-1'],
    isquios: ['piernas-1'],
    gluteos: ['core-1', 'piernas-1'],
    gemelos: ['piernas-1'],
    core: ['core-1'],
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
