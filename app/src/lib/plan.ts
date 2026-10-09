import { getExercise } from '../data/exercises';
import { adaptDays, dayKeyOf, getProgram, pickProgram, prescribe, type Program } from '../data/programs';
import { l10n } from '../i18n';
import type { Plan, Profile, Routine } from '../store/types';
import { uid } from './id';

export type PlanProfile = Pick<Profile, 'goal' | 'level' | 'daysPerWeek' | 'setup'> & Partial<Pick<Profile, 'limitations' | 'programId'>>;

// The program the user picked from the list, or the one that fits them.
export const programFor = (profile: PlanProfile): Program =>
    (profile.programId && getProgram(profile.programId)) || pickProgram(profile);

// Turn a profile into a concrete plan: the program's days become routines with
// sets, reps and rest set by goal and level, and exercises that load a sore
// joint swapped for safer ones.
export const buildPlan = (profile: PlanProfile): { plan: Plan; routines: Routine[] } => {
    const program = programFor(profile);
    const routines: Routine[] = adaptDays(program, profile.limitations).map((day, i) => ({
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
