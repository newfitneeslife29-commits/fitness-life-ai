import { useEffect, useState } from 'react';

// Current time, re-rendering every `intervalMs` while `enabled`.
export const useNow = (enabled = true, intervalMs = 1000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!enabled) return;
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [enabled, intervalMs]);
    return now;
};
