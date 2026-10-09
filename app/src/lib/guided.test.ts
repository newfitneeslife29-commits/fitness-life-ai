import { describe, expect, it } from 'vitest';
import { getExercise } from '../data/exercises';
import { GUIDES } from '../data/guides';
import type { Session } from '../store/types';
import { ACHIEVEMENTS, progressStats, unlockedAchievements } from './achievements';
import { cueAt, spokenTime } from './voice';

const session = (startedAt: string, sets: [string, number, number][]): Session => ({
    id: startedAt, routineId: null, routineName: '', startedAt, endedAt: startedAt,
    sets: sets.map(([exerciseId, weightKg, reps], i) => ({ id: `${startedAt}-${i}`, exerciseId, setIndex: i, weightKg, reps, completedAt: startedAt })),
});

describe('voice timer cues', () => {
    it('counts into the target, calls it, and says the time every 10 seconds', () => {
        expect(cueAt(1, 30)).toBeNull();
        expect(cueAt(10, 30)).toBe('10 segundos');
        expect(cueAt(27, 30)).toBe('3');
        expect(cueAt(29, 30)).toBe('1');
        expect(cueAt(30, 30)).toBe('¡Tiempo!');
        expect(cueAt(40, 30)).toBe('40 segundos');
        // No double cue: the countdown wins over a round number.
        expect(cueAt(20, 22)).toBe('2');
    });
    it('speaks minutes', () => {
        expect(spokenTime(60)).toBe('1 minuto');
        expect(spokenTime(90)).toBe('1 minuto y 30 segundos');
        expect(spokenTime(120)).toBe('2 minutos');
        expect(spokenTime(1)).toBe('1 segundo');
    });
});

describe('guides', () => {
    it('are complete in every language', () => {
        expect(GUIDES.length).toBeGreaterThanOrEqual(10);
        expect(new Set(GUIDES.map(g => g.id)).size).toBe(GUIDES.length);
        for (const g of GUIDES) {
            for (const text of [g.title, g.summary, ...g.steps]) {
                expect(text.es && text.en && text.pt, g.id).toBeTruthy();
            }
        }
    });
});

describe('achievements', () => {
    it('have unique ids and real goals', () => {
        expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length);
        expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    });

    it('unlock holds, variety, weekends and body-weight goals', () => {
        expect(getExercise('plancha')?.timed).toBe(true);
        const sessions = [
            session('2026-10-03T10:00:00', [['plancha', 0, 65], ['sentadilla', 60, 8]]), // Saturday
            session('2026-10-05T18:00:00', [['plancha', 0, 125]]),
        ];
        const weights = [
            { id: 'a', date: '2026-10-01T08:00:00.000Z', weightKg: 90 },
            { id: 'b', date: '2026-10-10T08:00:00.000Z', weightKg: 87 },
            { id: 'c', date: '2026-10-20T08:00:00.000Z', weightKg: 84 },
        ];
        const goal = { startKg: 90, targetKg: 84, startedAt: '2026-10-01T00:00:00.000Z' };
        const unlocked = unlockedAchievements(sessions, 3, { weights, goal });
        expect(unlocked.has('aguante-60')).toBe(true);
        expect(unlocked.get('aguante-120')?.sessionId).toBe('2026-10-05T18:00:00');
        expect(unlocked.has('finde')).toBe(true);
        expect(unlocked.get('primer-pesaje')?.date).toBe(weights[0].date);
        expect(unlocked.get('meta-mitad')?.date).toBe(weights[1].date);
        expect(unlocked.get('meta-peso')?.date).toBe(weights[2].date);
        expect(unlocked.has('variedad-10')).toBe(false);

        const stats = progressStats(sessions, 3);
        expect(stats).toMatchObject({ workouts: 2, exercises: 2 });
    });

    it('counts perfect weeks', () => {
        const week = (day: number) => [1, 2].map(d => session(`2026-09-${String(day + d).padStart(2, '0')}T18:00:00`, [['sentadilla', 60, 8]]));
        // Four weeks with 2 workouts each, 2 days a week planned.
        const sessions = [...week(6), ...week(13), ...week(20), ...week(27)];
        const unlocked = unlockedAchievements(sessions, 2);
        expect(unlocked.has('semana-completa')).toBe(true);
        expect(unlocked.has('semanas-completas-4')).toBe(true);
        expect(unlocked.has('racha-4')).toBe(true);
    });
});
