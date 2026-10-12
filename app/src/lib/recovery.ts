import { getExercise, type Muscle } from '../data/exercises';
import { useEffect } from 'react';
import { t } from '../i18n';
import { useStore } from '../store/store';
import type { Session } from '../store/types';
import { scheduleRecoveryAlerts } from './native';

// Muscle groups and how long they usually need between hard sessions.
export type Group = 'piernas' | 'pecho' | 'espalda' | 'hombros' | 'brazos' | 'core';
export const GROUPS: Group[] = ['piernas', 'pecho', 'espalda', 'hombros', 'brazos', 'core'];
const GROUP_OF: Record<Muscle, Group> = {
    cuadriceps: 'piernas', isquios: 'piernas', gluteos: 'piernas', gemelos: 'piernas',
    pecho: 'pecho', espalda: 'espalda', hombros: 'hombros', biceps: 'brazos', triceps: 'brazos', core: 'core',
};
export const RECOVERY_HOURS: Record<Group, number> = { piernas: 48, pecho: 48, espalda: 48, hombros: 48, brazos: 48, core: 24 };
const HOUR = 3_600_000;

export interface GroupStatus {
    group: Group;
    lastAt: number; // last session that worked it (ms)
    readyAt: number;
    ready: boolean;
}

// Each group's last hard work (2+ working sets in a session) and when it is rested.
export const recoveryStatus = (sessions: Session[], now = Date.now()): GroupStatus[] => {
    const last = new Map<Group, number>();
    for (const s of sessions) {
        const counts = new Map<Group, number>();
        for (const set of s.sets) {
            const muscle = getExercise(set.exerciseId)?.muscle;
            if (!muscle || set.warmup) continue;
            const g = GROUP_OF[muscle];
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        const at = Date.parse(s.endedAt || s.startedAt);
        for (const [g, n] of counts) if (n >= 2 && at > (last.get(g) ?? 0)) last.set(g, at);
    }
    return GROUPS.filter(g => last.has(g)).map(g => {
        const lastAt = last.get(g)!;
        const readyAt = lastAt + RECOVERY_HOURS[g] * HOUR;
        return { group: g, lastAt, readyAt, ready: readyAt <= now };
    });
};

// The hour the user usually starts training (median of the last sessions), 7–20.
export const usualHour = (sessions: Session[]) => {
    const hours = sessions.slice(0, 10).map(s => new Date(s.startedAt).getHours()).sort((a, b) => a - b);
    const h = hours.length ? hours[Math.floor(hours.length / 2)] : 10;
    return Math.min(20, Math.max(7, h));
};

export interface RecoveryAlert {
    at: Date;
    groups: Group[];
    hours: number;
}

// Reminders for groups trained in the last few days, one hour before the
// usual training time once they are rested. Groups ready at the same time go
// in one reminder. Nothing if the user has not trained in over a week.
export const recoveryAlerts = (sessions: Session[], now = new Date()): RecoveryAlert[] => {
    const status = recoveryStatus(sessions, now.getTime()).filter(s => !s.ready && s.lastAt > now.getTime() - 4 * 24 * HOUR);
    const hour = Math.max(7, usualHour(sessions) - 1);
    const byTime = new Map<number, RecoveryAlert>();
    for (const s of status) {
        const ready = new Date(s.readyAt);
        const at = new Date(ready.getFullYear(), ready.getMonth(), ready.getDate(), hour);
        if (at.getTime() < s.readyAt) at.setDate(at.getDate() + 1);
        const key = at.getTime();
        const alert = byTime.get(key) ?? { at, groups: [], hours: RECOVERY_HOURS[s.group] };
        alert.groups.push(s.group);
        alert.hours = Math.max(alert.hours, RECOVERY_HOURS[s.group]);
        byTime.set(key, alert);
    }
    return [...byTime.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 4);
};

export const groupLabel = (g: Group) => t(`recovery.group.${g}`);
const joinGroups = (groups: Group[]) => {
    const names = groups.map(groupLabel);
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} ${t('common.and')} ${names[names.length - 1]}`;
};

export const alertText = (a: RecoveryAlert) => a.groups.length === 1
    ? { title: t(`recovery.rested.${a.groups[0]}`, { hours: a.hours }), body: t(`recovery.go.${a.groups[0]}`) }
    : { title: t('recovery.restedMany', { groups: joinGroups(a.groups), hours: a.hours }), body: t('recovery.goMany', { groups: joinGroups(a.groups) }) };

// Keeps the phone's recovery reminders in line with the workouts logged.
export const useRecoveryAlerts = () => {
    const sessions = useStore(s => s.sessions);
    const on = useStore(s => s.profile !== null && s.profile.recoveryAlerts !== false);
    const lang = useStore(s => s.lang);
    useEffect(() => {
        void scheduleRecoveryAlerts(on ? recoveryAlerts(sessions).map(a => ({ at: a.at, ...alertText(a) })) : []);
    }, [sessions, on, lang]);
};
