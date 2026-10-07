// Training math: pure functions, unit tested in progression.test.ts.

export interface SetLike {
    weightKg: number;
    reps: number;
    warmup?: boolean;
}

export interface Suggestion {
    weightKg: number;
    reps: number;
    // True when the suggestion raises the load or the reps target.
    increased: boolean;
}

const KG_PER_LB = 0.45359237;

export const kgToDisplay = (kg: number, unit: 'kg' | 'lbs') =>
    unit === 'lbs' ? Math.round((kg / KG_PER_LB) * 2) / 2 : Math.round(kg * 100) / 100;

export const displayToKg = (value: number, unit: 'kg' | 'lbs') =>
    unit === 'lbs' ? Math.round(value * KG_PER_LB * 100) / 100 : value;

// Estimated one-rep max (Epley). A single rep is its own max.
export const estimate1RM = (weightKg: number, reps: number) => {
    if (weightKg <= 0 || reps <= 0) return 0;
    if (reps === 1) return weightKg;
    return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
};

// Volume = sum of weight x reps over working (non warm-up) sets.
export const volume = (sets: SetLike[]) =>
    sets.filter(s => !s.warmup).reduce((total, s) => total + s.weightKg * s.reps, 0);

// Double progression. If every working set at the top weight reached the top
// of the rep range: add `stepKg` and go back to the bottom of the range.
// Otherwise keep the weight and aim for one more rep. Bodyweight exercises
// (stepKg 0 or no load) progress by reps only, up to repMax + 5.
export const suggestNext = (
    range: { repMin: number; repMax: number },
    lastSets: SetLike[],
    stepKg: number,
): Suggestion | null => {
    const working = lastSets.filter(s => !s.warmup && s.reps > 0);
    if (working.length === 0) return null;

    const topWeight = Math.max(...working.map(s => s.weightKg));
    const atTop = working.filter(s => s.weightKg === topWeight);
    const minReps = Math.min(...atTop.map(s => s.reps));
    const hitTop = atTop.every(s => s.reps >= range.repMax);

    if (stepKg > 0 && topWeight > 0) {
        if (hitTop) return { weightKg: topWeight + stepKg, reps: range.repMin, increased: true };
        const reps = Math.min(Math.max(minReps + 1, range.repMin), range.repMax);
        return { weightKg: topWeight, reps, increased: reps > minReps };
    }

    // Bodyweight or unloaded: add a rep (or a few seconds) each time.
    const cap = range.repMax + 5;
    const reps = Math.min(Math.max(minReps + 1, range.repMin), cap);
    return { weightKg: topWeight, reps, increased: reps > minReps };
};

export interface PersonalRecord {
    exerciseId: string;
    bestE1rm: number;
    bestWeightKg: number;
    repsAtBestWeight: number;
    bestReps: number;
}

// Best estimated 1RM, heaviest set and most reps per exercise.
export const personalRecords = (sets: (SetLike & { exerciseId: string })[]): Map<string, PersonalRecord> => {
    const records = new Map<string, PersonalRecord>();
    for (const s of sets) {
        if (s.warmup || s.reps <= 0) continue;
        const e1rm = estimate1RM(s.weightKg, s.reps);
        const r = records.get(s.exerciseId);
        if (!r) {
            records.set(s.exerciseId, {
                exerciseId: s.exerciseId,
                bestE1rm: e1rm,
                bestWeightKg: s.weightKg,
                repsAtBestWeight: s.reps,
                bestReps: s.reps,
            });
            continue;
        }
        r.bestE1rm = Math.max(r.bestE1rm, e1rm);
        r.bestReps = Math.max(r.bestReps, s.reps);
        if (s.weightKg > r.bestWeightKg || (s.weightKg === r.bestWeightKg && s.reps > r.repsAtBestWeight)) {
            r.bestWeightKg = s.weightKg;
            r.repsAtBestWeight = s.reps;
        }
    }
    return records;
};

export type RecordKind = 'e1rm' | 'peso' | 'reps';

// Records a new batch of sets beats, compared with everything before it.
export const newRecords = (
    before: (SetLike & { exerciseId: string })[],
    session: (SetLike & { exerciseId: string })[],
): { exerciseId: string; kind: RecordKind }[] => {
    const prev = personalRecords(before);
    const now = personalRecords(session);
    const result: { exerciseId: string; kind: RecordKind }[] = [];
    for (const [id, r] of now) {
        const p = prev.get(id);
        if (!p) continue; // the first time is not a record
        if (r.bestWeightKg > 0 && r.bestE1rm > p.bestE1rm) result.push({ exerciseId: id, kind: 'e1rm' });
        else if (r.bestWeightKg > p.bestWeightKg) result.push({ exerciseId: id, kind: 'peso' });
        else if (r.bestWeightKg === 0 && p.bestWeightKg === 0 && r.bestReps > p.bestReps) result.push({ exerciseId: id, kind: 'reps' });
    }
    return result;
};
