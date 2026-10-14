import { useEffect } from 'react';
import { t } from '../i18n';
import { notificationWeekday } from './mealplan';
import { routineName } from './names';
import { reminderId, scheduleWeeklyReminders, type WeeklyReminder } from './native';
import { useStore } from '../store/store';
import type { AppState } from '../store/types';

// "Time to train": a notification at the time the user picked, on their
// training days, with the routine that is next in the plan.

export const DEFAULT_TRAINING_TIME = '18:00';

// Days spread through the week for how often the user trains (0 = Monday).
export const defaultTrainingDays = (daysPerWeek: number): number[] =>
    ({ 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] } as Record<number, number[]>)[daysPerWeek]
    ?? [0, 2, 4];

export const trainingReminders = (state: Pick<AppState, 'profile' | 'plan' | 'routines'>): WeeklyReminder[] => {
    const reminder = state.profile?.trainingReminder;
    if (!reminder) return [];
    const [hour, minute] = reminder.time.split(':').map(Number);
    const next = state.plan ? state.routines.find(r => r.id === state.plan!.routineIds[state.plan!.nextIndex]) : undefined;
    const body = next ? t('reminder.trainBody', { name: routineName(next) }) : t('reminder.trainBodyFree');
    return [...new Set(reminder.days)].sort().map(day => ({
        id: reminderId('training', day), weekday: notificationWeekday(day), hour, minute, title: t('reminder.trainTitle'), body,
    }));
};

// Keeps the phone's training reminders in line with the setting and the plan.
export const useTrainingReminders = () => {
    const profile = useStore(s => s.profile);
    const plan = useStore(s => s.plan);
    const routines = useStore(s => s.routines);
    const lang = useStore(s => s.lang);
    const reminder = profile?.trainingReminder ?? null;
    const next = plan?.routineIds[plan.nextIndex];
    useEffect(() => {
        void scheduleWeeklyReminders('training', trainingReminders({ profile, plan, routines }));
        // The routine name only matters when the next day changes.
    }, [JSON.stringify(reminder), next, lang]);
};
