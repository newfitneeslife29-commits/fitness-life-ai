import { useMemo } from 'react';
import { useStore } from '../store/store';
import { progressStats, unlockedAchievements } from './achievements';

// Medals earned so far, from workouts and weigh-ins.
export const useUnlocked = () => {
    const sessions = useStore(s => s.sessions);
    const days = useStore(s => s.profile?.daysPerWeek ?? 3);
    const weights = useStore(s => s.bodyWeights);
    const goal = useStore(s => s.profile?.weightGoal);
    return useMemo(() => unlockedAchievements(sessions, days, { weights, goal }), [sessions, days, weights, goal]);
};

export const useProgressStats = () => {
    const sessions = useStore(s => s.sessions);
    const days = useStore(s => s.profile?.daysPerWeek ?? 3);
    return useMemo(() => progressStats(sessions, days), [sessions, days]);
};
