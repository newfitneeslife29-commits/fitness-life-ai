import { EXERCISES, getExercise } from '../data/exercises';
import { adaptDays, ALLOWED, avoided, dayKeyOf, getProgram, pickProgram, prescribe, type Program, type ProgramDay } from '../data/programs';
import { l10n } from '../i18n';
import type { Limitation, Plan, Profile, Routine } from '../store/types';
import { uid } from './id';

export type PlanProfile = Pick<Profile, 'goal' | 'level' | 'daysPerWeek' | 'setup'> & Partial<Pick<Profile, 'limitations' | 'programId'>>;

// The program the user picked from the list, or the one that fits them.
export const programFor = (profile: PlanProfile): Program =>
    (profile.programId && getProgram(profile.programId)) || pickProgram(profile);

// Weeks go in a 4-week wave: base, more volume (an extra set on accessories,
// longer holds), more intensity (fewer reps and longer rests on the main
// lifts) and a lighter week to recover. Then it starts again.
export type WeekPhase = 'base' | 'volumen' | 'intensidad' | 'descarga';
const PHASES: WeekPhase[] = ['base', 'volumen', 'intensidad', 'descarga'];
export const weekPhase = (week: number): WeekPhase => PHASES[(Math.max(1, week) - 1) % 4];

type Prescription = ReturnType<typeof prescribe>;
export const waveFor = (p: Prescription, role: 'main' | 'accessory', timed: boolean, week: number, beginner = false): Prescription => {
    switch (weekPhase(week)) {
        case 'volumen':
            if (timed) return { ...p, repMin: p.repMin + 5, repMax: p.repMax + 10 };
            return role === 'accessory' ? { ...p, sets: Math.min(5, p.sets + 1) } : p;
        case 'intensidad':
            // Beginners keep learning the movements at the usual reps.
            if (timed || role !== 'main' || beginner) return p;
            return { ...p, repMin: Math.max(3, p.repMin - 2), repMax: Math.max(Math.max(3, p.repMin - 2) + 2, p.repMax - 2), restSec: p.restSec + 30 };
        case 'descarga':
            return { ...p, sets: Math.max(2, p.sets - 1) };
        default:
            return p;
    }
};

// Accessories change each week (every two weeks for beginners) to another
// exercise for the same muscle that the setup allows and that spares sore
// joints. Main lifts stay, so their weights keep progressing.
const rotateAccessories = (days: ProgramDay[], program: Program, limitations: Limitation[], week: number): ProgramDay[] => {
    const turn = Math.floor((week - 1) / (program.beginner ? 2 : 1));
    if (turn === 0) return days;
    // Big lifts of the program stay main lifts: never an accessory elsewhere.
    const mainLifts = new Set(days.flatMap(d => d.slots.filter(s => s.role === 'main').map(s => s.exerciseId)));
    return days.map(day => {
        const used = new Set(day.slots.map(s => s.exerciseId));
        const slots = day.slots.map(slot => {
            if (slot.role !== 'accessory') return slot;
            const ex = getExercise(slot.exerciseId);
            if (!ex) return slot;
            const options = [ex, ...EXERCISES.filter(e => e.id !== ex.id && e.muscle === ex.muscle && !!e.timed === !!ex.timed
                && ALLOWED[program.setup].includes(e.equipment) && !avoided(e.id, limitations) && !used.has(e.id)
                && !mainLifts.has(e.id) && (e.equipment !== 'barra' || ex.equipment === 'barra')
                // Weighted stays weighted, bodyweight stays bodyweight.
                && (e.stepKg > 0) === (ex.stepKg > 0))];
            const pick = options[turn % options.length];
            if (pick.id === slot.exerciseId) return slot;
            used.add(pick.id);
            return { ...slot, exerciseId: pick.id };
        });
        return { ...day, slots };
    });
};

// Turn a profile into a concrete plan: the program's days become routines with
// sets, reps and rest set by goal, level and the week of the plan, and
// exercises that load a sore joint swapped for safer ones.
export const buildPlan = (profile: PlanProfile, week = 1): { plan: Plan; routines: Routine[] } => {
    const program = programFor(profile);
    const days = rotateAccessories(adaptDays(program, profile.limitations), program, profile.limitations ?? [], week);
    const routines: Routine[] = days.map((day, i) => ({
        id: uid(),
        name: l10n(day.name),
        dayKey: dayKeyOf(program.id, i),
        source: 'plan',
        exercises: day.slots.map(slot => {
            const timed = !!getExercise(slot.exerciseId)?.timed;
            const p = waveFor(prescribe(profile.goal, profile.level, slot.role, timed), slot.role, timed, week, program.beginner);
            return { exerciseId: slot.exerciseId, sets: p.sets, repMin: p.repMin, repMax: p.repMax, restSec: p.restSec };
        }),
    }));
    return {
        routines,
        plan: { programId: program.id, programName: l10n(program.name), routineIds: routines.map(r => r.id), nextIndex: 0, week },
    };
};

// A completed week moves the plan on: next week's routines replace this
// week's (days the user edited by hand stay as they are), and the swaps are
// kept to show them once.
export const advancePlan = (profile: PlanProfile, plan: Plan, routines: Routine[], weekKey: string): { plan: Plan; routines: Routine[] } => {
    const week = (plan.week ?? 1) + 1;
    // Same program as now, even if the profile would pick another one today.
    const next = buildPlan({ ...profile, programId: plan.programId }, week);
    const old = plan.routineIds.map(id => routines.find(r => r.id === id));
    const swaps: { from: string; to: string }[] = [];
    const kept = next.routines.map((r, i) => {
        const before = old[i];
        if (before?.edited) return before;
        before?.exercises.forEach((e, j) => {
            const to = r.exercises[j]?.exerciseId;
            if (to && to !== e.exerciseId) swaps.push({ from: e.exerciseId, to });
        });
        return r;
    });
    const ids = new Set(plan.routineIds);
    return {
        plan: { ...next.plan, routineIds: kept.map(r => r.id), nextIndex: plan.nextIndex % kept.length, advancedFor: weekKey, update: { week, swaps, seen: false } },
        routines: [...routines.filter(r => !ids.has(r.id)), ...kept],
    };
};
