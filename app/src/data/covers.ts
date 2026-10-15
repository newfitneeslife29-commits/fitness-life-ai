import type { Routine } from '../store/types';
import { getExercise, type Muscle } from './exercises';
import type { Program } from './programs';

// Cover photos for the workout cards (public/covers, see CREDITS.txt there),
// chosen by the muscle the routine works most. Each one keeps the person in
// frame (object-position).

const FOCUS: Record<string, string> = {
    'biceps-1': '50% 42%',
    'core-1': '52% 38%',
    'espalda-1': '49% 39%',
    'espalda-2': '51% 32%',
    'espalda-3': '50% 33%',
    'espalda-4': '51% 44%',
    'espalda-5': '49% 49%',
    'gemelos-1': '52% 36%',
    'gluteos-1': '50% 53%',
    'hombros-1': '46% 31%',
    'isquios-1': '50% 44%',
    'mujer-barra': '59% 41%',
    'mujer-disco': '52% 32%',
    'pecho-1': '50% 24%',
    'pecho-2': '56% 43%',
    'piernas-1': '61% 33%',
    'piernas-2': '50% 38%',
    'triceps-1': '66% 36%',
};

const BY_MUSCLE: Record<Muscle, string[]> = {
    pecho: ['pecho-1', 'pecho-2'],
    espalda: ['espalda-1', 'espalda-2', 'espalda-3', 'espalda-4', 'espalda-5'],
    hombros: ['hombros-1', 'mujer-disco'],
    biceps: ['biceps-1', 'mujer-barra'],
    triceps: ['triceps-1'],
    cuadriceps: ['piernas-1', 'piernas-2'],
    isquios: ['isquios-1', 'piernas-1'],
    gluteos: ['gluteos-1', 'piernas-2'],
    gemelos: ['piernas-2', 'gemelos-1'],
    core: ['core-1', 'mujer-disco'],
};

// The women's programs (the section's own header shows mujer-disco).
const WOMEN = ['gluteos-1', 'isquios-1', 'piernas-2', 'mujer-barra'];

export interface Cover { src: string; position: string }

const cover = (name: string): Cover => ({ src: `./covers/${name}.webp`, position: FOCUS[name] ?? '50% 35%' });

const hashOf = (s: string) => {
    let hash = 0;
    for (const ch of s) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return hash;
};

// The muscle with the most exercises (the first one breaks ties); cards on
// the same muscle get different photos by their id. A photo already used by
// a card above is skipped: the next muscles' photos, then any, come instead.
const coverName = (id: string, exerciseIds: string[], used: ReadonlySet<string> = new Set()): string => {
    const count = new Map<Muscle, number>();
    for (const e of exerciseIds) {
        const m = getExercise(e)?.muscle;
        if (m) count.set(m, (count.get(m) ?? 0) + 1);
    }
    const ranked = [...count].sort((x, y) => y[1] - x[1]).map(([m]) => m);
    if (!ranked.length) ranked.push('pecho');
    const start = hashOf(id);
    const order = [...ranked.map(m => BY_MUSCLE[m]), Object.keys(FOCUS)]
        .flatMap(list => list.map((_, i) => list[(start + i) % list.length]));
    return order.find(n => !used.has(n)) ?? order[0];
};
const coverFor = (id: string, exerciseIds: string[]): Cover => cover(coverName(id, exerciseIds));

type RoutineLike = Pick<Routine, 'id' | 'exercises'>;

// The covers of a list of routines (a plan), in order, each one different
// while there are photos left.
export const routineCovers = (routines: RoutineLike[]): Cover[] => {
    const used = new Set<string>();
    return routines.map(r => {
        const name = coverName(r.id, r.exercises.map(e => e.exerciseId), used);
        used.add(name);
        return cover(name);
    });
};

// One routine; inside its plan it gets the same photo as in the plan's list.
export const routineCover = (routine: RoutineLike, plan: RoutineLike[] = []): Cover => {
    const i = plan.findIndex(r => r.id === routine.id);
    return i >= 0 ? routineCovers(plan)[i] : coverFor(routine.id, routine.exercises.map(e => e.exerciseId));
};

const womenName = (seed: string, used: ReadonlySet<string> = new Set()) => {
    const start = hashOf(seed) % WOMEN.length;
    const order = WOMEN.map((_, i) => WOMEN[(start + i) % WOMEN.length]);
    return order.find(n => !used.has(n)) ?? order[0];
};

// A list of programs, in order, without repeating a photo while there are
// others; women's programs always show a woman training.
export const programCovers = (programs: Pick<Program, 'id' | 'days' | 'women'>[]): Cover[] => {
    const used = new Set<string>();
    return programs.map(p => {
        const name = p.women ? womenName(p.id, used) : coverName(p.id, p.days.flatMap(d => d.slots.map(s => s.exerciseId)), used);
        used.add(name);
        return cover(name);
    });
};

export const womenCover = (seed: string): Cover => cover(womenName(seed));

// A named photo, for the few fixed places (the explore tiles).
export const namedCover = (name: string): Cover => cover(name);

// The first photo of a muscle group (the muscle cards in Ejercicios).
export const muscleCover = (m: Muscle): Cover => cover(BY_MUSCLE[m][0]);
