import { useEffect, useMemo } from 'react';
import { toast } from '../components/feedback';
import { t } from '../i18n';
import { activitySummary, localDay } from './activity';
import { scheduleAlert } from './native';
import { currentPause, pausedDays } from './pause';
import { useStore } from '../store/store';

// The streak: days in a row using the app (training counts too). At 8 pm
// on a day the app wasn't opened yet, a reminder not to lose it; each day it
// is opened, the reminder moves to the next day. Milestones get a cheer.

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];
const ALERT_HOUR = 20;

// When to remind: tomorrow at 8 pm, from a 2-day streak on.
export const streakAlertAt = (streak: number, now = new Date()) =>
    streak >= 2 ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, ALERT_HOUR, 0, 0) : null;

export const useStreak = () => {
    const activeDays = useStore(s => s.activeDays);
    const sessions = useStore(s => s.sessions);
    const pause = useStore(s => s.profile?.pause);
    const past = useStore(s => s.profile?.pastPauses);
    const today = localDay(new Date());
    return useMemo(
        () => activitySummary(activeDays ?? [], sessions, new Date(), pausedDays({ pause, pastPauses: past })),
        [activeDays, sessions, pause, past, today],
    );
};

export const useStreakAlerts = () => {
    const { activeStreak } = useStreak();
    // No reminder while resting or injured: the streak waits.
    const on = useStore(s => s.profile !== null && s.profile.streakReminder !== false && !currentPause(s.profile));
    const lang = useStore(s => s.lang);
    const openedToday = useStore(s => s.activeDays?.includes(localDay(new Date())) ?? false);
    useEffect(() => {
        const at = on ? streakAlertAt(activeStreak) : null;
        void scheduleAlert('streak', at && { at, title: t('streak.alertTitle'), body: t('streak.alertBody', { n: activeStreak }) });
    }, [activeStreak, on, lang]);
    // A cheer on the day a milestone is reached.
    useEffect(() => {
        if (!openedToday || !STREAK_MILESTONES.includes(activeStreak)) return;
        const key = 'fitness-life:streak-cheer';
        const mark = `${localDay(new Date())}:${activeStreak}`;
        try {
            if (localStorage.getItem(key) === mark) return;
            localStorage.setItem(key, mark);
        } catch { return; }
        toast(t('streak.milestone', { n: activeStreak }), 4000);
    }, [activeStreak, openedToday]);
};
