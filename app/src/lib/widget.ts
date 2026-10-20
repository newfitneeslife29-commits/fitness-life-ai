import { registerPlugin } from '@capacitor/core';
import { useEffect, useMemo } from 'react';
import { t } from '../i18n';
import { useStore } from '../store/store';
import { localDay } from './activity';
import { useStreak } from './streak';
import { fmtNumber } from './format';
import { stepsOn } from './movement';
import { routineName } from './names';
import { isNative } from './native';

// The home screen widget (Android TodayWidget, iOS FitnessWidget): the app
// hands it the streak, today's steps and today's workout, with the texts in
// the person's language, whenever they change.

interface WidgetBridge { update(options: { data: string }): Promise<void> }
const Bridge = registerPlugin<WidgetBridge>('WidgetBridge');

export interface WidgetData { streak: string; streakLabel: string; steps: string; stepsLabel: string; next: string; nextLabel: string }

let last = '';

export const useHomeWidget = () => {
    const sessions = useStore(s => s.sessions);
    const steps = useStore(s => s.steps);
    const cardio = useStore(s => s.cardio);
    const plan = useStore(s => s.plan);
    const routines = useStore(s => s.routines);
    const lang = useStore(s => s.lang);
    const today = localDay(new Date());
    const { activeStreak } = useStreak();
    const data = useMemo<WidgetData>(() => {
        const next = plan ? routines.find(r => r.id === plan.routineIds[plan.nextIndex]) : undefined;
        const trainedToday = sessions.some(s => localDay(new Date(s.startedAt)) === today);
        return {
            streak: String(activeStreak),
            streakLabel: t('widget.streak'),
            steps: fmtNumber(stepsOn({ steps, cardio }, today)),
            stepsLabel: t('widget.steps'),
            next: trainedToday ? t('widget.done') : next ? routineName(next) : '',
            nextLabel: t('widget.next'),
        };
    }, [activeStreak, sessions, steps, cardio, plan, routines, lang, today]);
    useEffect(() => {
        if (!isNative()) return;
        const json = JSON.stringify(data);
        if (json === last) return;
        last = json;
        void Bridge.update({ data: json }).catch(() => { last = ''; });
    }, [data]);
};
