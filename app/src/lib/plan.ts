import { getExercise } from '../data/exercises';
import { pickProgram, prescribe } from '../data/programs';
import type { Plan, Profile, Routine } from '../store/types';
import { uid } from './id';

// Turn a profile into a concrete plan: the program's days become routines with
// sets, reps and rest set by goal and level.
export const buildPlan = (profile: Pick<Profile, 'goal' | 'level' | 'daysPerWeek' | 'setup'>): { plan: Plan; routines: Routine[] } => {
    const program = pickProgram(profile.setup, profile.daysPerWeek);
    const routines: Routine[] = program.days.map(day => ({
        id: uid(),
        name: day.name,
        source: 'plan',
        exercises: day.slots.map(slot => {
            const p = prescribe(profile.goal, profile.level, slot.role, getExercise(slot.exerciseId)?.timed);
            return { exerciseId: slot.exerciseId, sets: p.sets, repMin: p.repMin, repMax: p.repMax, restSec: p.restSec };
        }),
    }));
    return {
        routines,
        plan: { programId: program.id, programName: program.name, routineIds: routines.map(r => r.id), nextIndex: 0 },
    };
};
