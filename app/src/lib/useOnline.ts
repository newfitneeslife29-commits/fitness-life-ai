import { useSyncExternalStore } from 'react';
import { getCloudStatus, subscribeCloudStatus } from './cloud';

const subscribeOnline = (l: () => void) => {
    window.addEventListener('online', l);
    window.addEventListener('offline', l);
    return () => {
        window.removeEventListener('online', l);
        window.removeEventListener('offline', l);
    };
};

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine !== false, () => true);

// Whether the account's copy is up to date, waiting, or waiting for signal.
export const useCloudStatus = () => useSyncExternalStore(subscribeCloudStatus, getCloudStatus, getCloudStatus);
