import { useEffect, useRef } from 'react';
import { actions, useStore } from '../store/store';
import { COUNTDOWN_SEC, restOver, restTick } from './native';
import { useNow } from './useNow';

// The rest countdown: a tick each of the last 10 seconds, the "go" alert at
// zero, then the rest closes by itself.
export const useRestCountdown = (endsAt: number) => {
    const sound = useStore(s => s.profile?.restSound !== false);
    const now = useNow(true, 250);
    const left = Math.ceil((endsAt - now) / 1000);
    const finished = left <= 0;
    const ticked = useRef<number | null>(null);
    useEffect(() => {
        if (left > 0 && left <= COUNTDOWN_SEC && ticked.current !== left) {
            ticked.current = left;
            restTick(sound, left <= 3);
        }
    }, [left, sound]);
    useEffect(() => {
        if (!finished) return;
        restOver(sound);
        const timer = window.setTimeout(() => actions.skipRest(), 4000);
        return () => window.clearTimeout(timer);
    }, [finished]);
    return { left: Math.max(0, left), finished, ending: !finished && left <= COUNTDOWN_SEC };
};
