import { dayName, getProgram, programName } from '../data/programs';
import { t } from '../i18n';
import type { Plan, Routine, Session } from '../store/types';

// Display names that follow the app language for anything the app named
// itself (plan days, free workouts); user-given names are shown as typed.

const fromDayKey = (dayKey: string | undefined, fallback: string) => {
    if (dayKey === 'free') return t('workout.free');
    return (dayKey && dayName(dayKey)) || fallback;
};

export const routineName = (r: Pick<Routine, 'name' | 'dayKey'>) => fromDayKey(r.dayKey, r.name);
export const sessionName = (s: Pick<Session, 'routineName' | 'dayKey'>) => fromDayKey(s.dayKey, s.routineName);
export const planName = (p: Plan) => {
    const program = getProgram(p.programId);
    return program ? programName(program) : p.programName;
};
