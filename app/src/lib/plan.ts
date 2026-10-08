import { getExercise } from '../data/exercises';
import { dayKeyOf, pickProgram, prescribe } from '../data/programs';
import { l10n } from '../i18n';
import type { Plan, Profile, Routine } from '../store/types';
import { uid } from './id';

// Turn a profile into a concrete plan: the program's days become routines with
// sets, reps and rest set by goal and level.
export const buildPlan = (profile: Pick<Profile, 'goal' | 'level' | 'daysPerWeek' | 'setup'>): { plan: Plan; routines: Routine[] } => {
    const program = pickProgram(profile.setup, profile.daysPerWeek);
    const routines: Routine[] = program.days.map((day, i) => ({
        id: uid(),
        name: l10n(day.name),
        dayKey: dayKeyOf(program.id, i),
        source: 'plan',
        exercises: day.slots.map(slot => {
            const p = prescribe(profile.goal, profile.level, slot.role, getExercise(slot.exerciseId)?.timed);
            return { exerciseId: slot.exerciseId, sets: p.sets, repMin: p.repMin, repMax: p.repMax, restSec: p.restSec };
        }),
    }));
    return {
        routines,
        plan: { programId: program.id, programName: l10n(program.name), routineIds: routines.map(r => r.id), nextIndex: 0 },
    };
};
