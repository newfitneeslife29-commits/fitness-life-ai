// Training math shared by the workout player and the progress screen.
// Pure functions only, so they can be unit tested (lib/progression.test.ts).

export interface LoggedSet {
    weight_kg: number;
    reps: number;
    is_warmup?: boolean;
}

export interface RepRange {
    min: number;
    max: number;
}

export interface Suggestion {
    weight_kg: number;
    reps: number;
    // True when the suggestion raises the load compared with last time.
    increased: boolean;
}

const KG_PER_LB = 0.45359237;

export const kgToDisplay = (kg: number, unit: 'kg' | 'lbs') =>
    unit === 'lbs' ? Math.round((kg / KG_PER_LB) * 2) / 2 : kg;

export const displayToKg = (value: number, unit: 'kg' | 'lbs') =>
    unit === 'lbs' ? Math.round(value * KG_PER_LB * 100) / 100 : value;

// Estimated one-rep max (Epley). A single rep is its own max.
export const estimate1RM = (weightKg: number, reps: number) => {
    if (weightKg <= 0 || reps <= 0) return 0;
    if (reps === 1) return weightKg;
    return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
};

// Volume = sum of weight x reps over working (non warm-up) sets.
export const sessionVolume = (sets: LoggedSet[]) =>
    sets.filter(s => !s.is_warmup).reduce((total, s) => total + s.weight_kg * s.reps, 0);

// "8-12" -> {8, 12}; "10" -> {10, 10}; "30s" / "AMRAP" -> null (no rep target).
export const parseRepRange = (reps: string | number): RepRange | null => {
    const text = String(reps).trim().toLowerCase();
    if (/\d\s*(s|sec|seg|min)\b/.test(text)) return null;
    const range = text.match(/^(\d+)\s*[-–]\s*(\d+)/);
    if (range) {
        const min = Number(range[1]);
        const max = Number(range[2]);
        return min <= max ? { min, max } : { min: max, max: min };
    }
    const single = text.match(/^(\d+)/);
    if (single) {
        const n = Number(single[1]);
        return { min: n, max: n };
    }
    return null;
};

const LOWER_BODY = [
    'squat', 'sentadilla', 'deadlift', 'peso muerto', 'leg', 'pierna', 'lunge', 'zancada',
    'hip thrust', 'glute', 'calf', 'gemelo', 'prensa', 'step up', 'rdl', 'hamstring',
];

export const isLowerBody = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    return LOWER_BODY.some(k => name.includes(k));
};

// Double progression: if every working set last time reached the top of the
// rep range, add load (+2.5 kg upper body, +5 kg lower body) and go back to
// the bottom of the range. Otherwise keep the load and aim for one more rep.
export const suggestNext = (
    exerciseName: string,
    repsTarget: string | number,
    lastSets: LoggedSet[],
): Suggestion | null => {
    const working = lastSets.filter(s => !s.is_warmup && s.reps > 0);
    if (working.length === 0) return null;

    const topWeight = Math.max(...working.map(s => s.weight_kg));
    const atTop = working.filter(s => s.weight_kg === topWeight);
    const range = parseRepRange(repsTarget);
    const minReps = Math.min(...atTop.map(s => s.reps));

    if (!range) {
        return { weight_kg: topWeight, reps: minReps, increased: false };
    }

    const hitTop = atTop.every(s => s.reps >= range.max);
    if (hitTop && topWeight > 0) {
        const step = isLowerBody(exerciseName) ? 5 : 2.5;
        return { weight_kg: topWeight + step, reps: range.min, increased: true };
    }
    return {
        weight_kg: topWeight,
        reps: Math.min(Math.max(minReps + 1, range.min), range.max),
        increased: false,
    };
};

export interface PersonalRecord {
    exercise_name: string;
    best_e1rm: number;
    best_weight_kg: number;
    best_reps_at_weight: number;
}

// Best estimated 1RM per exercise (and the heaviest set) from a list of sets.
export const personalRecords = (
    sets: (LoggedSet & { exercise_name: string })[],
): PersonalRecord[] => {
    const byExercise = new Map<string, PersonalRecord>();
    for (const s of sets) {
        if (s.is_warmup || s.reps <= 0) continue;
        const e1rm = estimate1RM(s.weight_kg, s.reps);
        const current = byExercise.get(s.exercise_name);
        if (!current) {
            byExercise.set(s.exercise_name, {
                exercise_name: s.exercise_name,
                best_e1rm: e1rm,
                best_weight_kg: s.weight_kg,
                best_reps_at_weight: s.reps,
            });
            continue;
        }
        current.best_e1rm = Math.max(current.best_e1rm, e1rm);
        if (s.weight_kg > current.best_weight_kg
            || (s.weight_kg === current.best_weight_kg && s.reps > current.best_reps_at_weight)) {
            current.best_weight_kg = s.weight_kg;
            current.best_reps_at_weight = s.reps;
        }
    }
    return [...byExercise.values()].sort((a, b) => b.best_e1rm - a.best_e1rm);
};
