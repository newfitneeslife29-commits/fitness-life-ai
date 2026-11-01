import type { ActiveExercise, Unit } from '../store/types';
import { uid } from './id';
import { displayToKg, kgToDisplay } from './progression';

// "How do you feel today?" before the first set. The answer reshapes the
// workout from the plan (`base`), so changing it again never stacks:
// - tired: one set less where there are 3 or more, and 10% less weight;
// - strong: one extra set of the first exercise (the main lift);
// - normal: the plan as it is.
export type Feel = 'tired' | 'normal' | 'strong';
export const FEELS: Feel[] = ['tired', 'normal', 'strong'];
export const TIRED_LOAD = 0.9;

// 10% off, down to a real plate jump in the user's unit (2.5 kg / 5 lb).
const lighter = (kg: number, unit: Unit) => {
    if (kg <= 0) return kg;
    const step = unit === 'kg' ? 2.5 : 5;
    const shown = Math.floor((kgToDisplay(kg, unit) * TIRED_LOAD) / step) * step;
    return shown > 0 ? displayToKg(shown, unit) : kg;
};

export const adjustForFeel = (base: ActiveExercise[], feel: Feel, unit: Unit): ActiveExercise[] => {
    if (feel === 'tired') {
        return base.map(e => ({
            ...e,
            sets: (e.sets.length >= 3 ? e.sets.slice(0, -1) : e.sets).map(s => ({ ...s, weightKg: lighter(s.weightKg, unit) })),
        }));
    }
    if (feel === 'strong') {
        return base.map((e, i) => {
            const last = e.sets[e.sets.length - 1];
            return i === 0 && last ? { ...e, sets: [...e.sets, { ...last, id: uid(), done: false, completedAt: undefined }] } : e;
        });
    }
    return base;
};
