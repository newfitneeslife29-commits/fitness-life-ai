import type { Unit } from '../store/types';
import { displayToKg, kgToDisplay } from './progression';

// Plate maths for barbell lifts, done in the user's unit so the answer
// matches the plates in their gym.

export const BAR = { kg: 20, lbs: 45 } as const;
export const PLATES = {
    kg: [25, 20, 15, 10, 5, 2.5, 1.25],
    lbs: [45, 35, 25, 10, 5, 2.5],
} as const;

export interface PlateLoad {
    perSide: number[];      // plates on each side, heaviest first (display unit)
    loaded: number;         // total weight the plates + bar actually make
    exact: boolean;         // false when the target cannot be made exactly
}

export const platesFor = (total: number, unit: Unit): PlateLoad => {
    const bar = BAR[unit];
    if (total <= bar) return { perSide: [], loaded: bar, exact: total === bar };
    let side = (total - bar) / 2;
    const perSide: number[] = [];
    for (const plate of PLATES[unit]) {
        while (side >= plate - 1e-9) {
            perSide.push(plate);
            side = Math.round((side - plate) * 1000) / 1000;
        }
    }
    const loaded = bar + 2 * perSide.reduce((a, b) => a + b, 0);
    return { perSide, loaded, exact: Math.abs(loaded - total) < 1e-6 };
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

// Ramp-up sets before the first working set: empty bar, then ~50/70/85%.
// Weights are in kg; rounding happens in the user's unit.
export const warmupSets = (workKg: number, unit: Unit): { weightKg: number; reps: number }[] => {
    const work = kgToDisplay(workKg, unit);
    const bar = BAR[unit];
    if (work < bar * 1.5) return [];
    const step = unit === 'kg' ? 2.5 : 5;
    const ramp: [number, number][] = [[0.5, 5], [0.7, 3], [0.85, 1]];
    const sets: { weight: number; reps: number }[] = [{ weight: bar, reps: 10 }];
    for (const [pct, reps] of ramp) {
        const w = roundTo(work * pct, step);
        if (w > sets[sets.length - 1].weight && w < work) sets.push({ weight: w, reps });
    }
    return sets.map(s => ({ weightKg: displayToKg(s.weight, unit), reps: s.reps }));
};

// Training weights from a one-rep max (in the user's unit), each with the
// reps it usually allows. Rounded down to a real plate jump.
export const PERCENT_REPS: [number, string][] = [
    [100, '1'], [95, '2'], [90, '3–4'], [85, '5–6'], [80, '7–8'], [75, '9–10'], [70, '11–12'], [65, '13–15'],
];

export const percentTable = (max: number, unit: Unit) => {
    const step = unit === 'kg' ? 2.5 : 5;
    return PERCENT_REPS.map(([pct, reps]) => ({
        pct, reps,
        weight: pct === 100 ? Math.round(max * 10) / 10 : Math.floor((max * pct) / 100 / step) * step,
    }));
};
