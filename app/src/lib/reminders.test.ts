import { describe, expect, it } from 'vitest';
import { setLang } from '../i18n';
import { defaultTrainingDays, trainingReminders } from './reminders';
import type { AppState, Profile } from '../store/types';

const profile = { name: 'Ana', goal: 'musculo', level: 'principiante', daysPerWeek: 3, setup: 'casa', unit: 'kg', createdAt: '' } as Profile;

describe('training reminder', () => {
    it('spreads the default days through the week', () => {
        expect(defaultTrainingDays(3)).toEqual([0, 2, 4]);
        expect(defaultTrainingDays(5)).toEqual([0, 1, 2, 3, 4]);
    });

    it('reminds on the chosen days at the chosen time, with the next routine', () => {
        setLang('es');
        const state = {
            profile: { ...profile, trainingReminder: { time: '18:45', days: [6, 0, 2] } },
            plan: { programId: 'p', programName: 'P', routineIds: ['a', 'b'], nextIndex: 1 },
            routines: [{ id: 'a', name: 'Pierna', exercises: [], source: 'plan' }, { id: 'b', name: 'Torso', exercises: [], source: 'plan' }],
        } as Pick<AppState, 'profile' | 'plan' | 'routines'>;
        const list = trainingReminders(state);
        // Monday → 2, Wednesday → 4, Sunday → 1 on the notification calendar.
        expect(list.map(r => [r.weekday, r.hour, r.minute])).toEqual([[2, 18, 45], [4, 18, 45], [1, 18, 45]]);
        expect(list[0].body).toBe('Hoy toca: Torso. ¡Vamos!');
        expect(new Set(list.map(r => r.id)).size).toBe(3);
    });

    it('is off without a reminder', () => {
        expect(trainingReminders({ profile, plan: null, routines: [] })).toEqual([]);
    });
});
