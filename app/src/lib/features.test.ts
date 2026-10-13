import { describe, expect, it } from 'vitest';
import { busyAlternatives, getExercise } from '../data/exercises';
import { womenProgram } from '../data/programs';
import type { Session } from '../store/types';
import { activitySummary, localDay, monthGrid } from './activity';
import { APP_ICONS, DEFAULT_ICON } from './appIcons';
import { bmiBand, bmiOf, healthyWeightRange } from './nutrition';
import { summarizeHeart } from './health';
import { advancePlan, buildPlan, waveFor, weekPhase } from './plan';
import { recoveryAlerts, recoveryStatus } from './recovery';
import { equivalent, monthWrap } from './wrapped';

describe('busyAlternatives', () => {
    it('offers the same main muscle with dumbbells or cables first', () => {
        const options = busyAlternatives('prensa');
        expect(options.length).toBeGreaterThan(0);
        for (const e of options) {
            expect(e.muscle).toBe('cuadriceps');
            expect(e.equipment).not.toBe('maquina');
        }
        expect(options[0].equipment).toBe('mancuernas');
    });
    it('leaves out exercises already in the workout and keeps timed with timed', () => {
        const ids = busyAlternatives('jalon-pecho').map(e => e.id);
        expect(ids).not.toContain('jalon-pecho');
        expect(busyAlternatives('jalon-pecho', ['remo-mancuerna']).map(e => e.id)).not.toContain('remo-mancuerna');
        for (const e of busyAlternatives('pallof')) expect(!!e.timed).toBe(!!getExercise('pallof')?.timed);
    });
});

const sessionOn = (d: Date): Session => ({ id: d.toISOString(), routineId: null, routineName: 'x', startedAt: d.toISOString(), endedAt: d.toISOString(), sets: [] });

describe('activity', () => {
    const now = new Date(2026, 9, 12, 18); // 12 Oct 2026
    it('counts active and training days this month and the streaks', () => {
        const opened = ['2026-09-30', '2026-10-10', '2026-10-11'];
        const sessions = [sessionOn(new Date(2026, 9, 12, 9)), sessionOn(new Date(2026, 9, 5, 9))];
        const s = activitySummary(opened, sessions, now);
        expect(s.activeThisMonth).toBe(4); // 5, 10, 11, 12
        expect(s.trainedThisMonth).toBe(2);
        expect(s.activeStreak).toBe(3); // 10, 11, 12
        expect(s.bestStreak).toBe(3);
        expect(s.trainedTotal).toBe(2);
    });
    it('keeps a streak alive when today is not in yet', () => {
        expect(activitySummary(['2026-10-10', '2026-10-11'], [], now).activeStreak).toBe(2);
        expect(activitySummary(['2026-10-09'], [], now).activeStreak).toBe(0);
    });
    it('lays out a month in Monday-first weeks', () => {
        const grid = monthGrid(2026, 9, ['2026-10-01'], [sessionOn(new Date(2026, 9, 2, 9))], now);
        expect(grid.every(w => w.length === 7)).toBe(true);
        const days = grid.flat();
        expect(days[0].date.getDay()).toBe(1);
        expect(days.filter(d => d.inMonth)).toHaveLength(31);
        expect(days.find(d => localDay(d.date) === '2026-10-01')?.opened).toBe(true);
        expect(days.find(d => localDay(d.date) === '2026-10-02')?.trained).toBe(true);
        expect(days.find(d => localDay(d.date) === '2026-10-20')?.future).toBe(true);
    });
});

describe('bmi', () => {
    it('computes BMI, its band and the healthy range', () => {
        expect(bmiOf(80, 180)).toBeCloseTo(24.69, 1);
        expect(bmiBand(17)).toBe('under');
        expect(bmiBand(22)).toBe('normal');
        expect(bmiBand(27)).toBe('over');
        expect(bmiBand(31)).toBe('obese');
        expect(healthyWeightRange(180)).toEqual({ minKg: 59.9, maxKg: 80.7 });
    });
});

describe('womenProgram', () => {
    it('has a plan to lose and one to keep weight for every place, home included', () => {
        for (const aim of ['bajar', 'mantener'] as const) {
            for (const setup of ['casa', 'mancuernas', 'gimnasio'] as const) {
                const p = womenProgram(aim, setup);
                expect(p, `${aim} ${setup}`).toBeDefined();
                expect(p.setup).toBe(setup);
                expect(p.women).toBe(aim);
                expect(p.days.length).toBeGreaterThanOrEqual(3);
            }
        }
    });
});

describe('recovery', () => {
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const set = (exerciseId: string, i: number) => ({ id: `${exerciseId}${i}`, exerciseId, setIndex: i, weightKg: 50, reps: 8, completedAt: '' });
    const legs: Session = { id: 'a', routineId: null, routineName: 'Pierna', startedAt: at(10, 18), endedAt: at(10, 19), sets: [set('sentadilla', 1), set('sentadilla', 2), set('press-banca', 1)] };
    it('marks a group trained hard as recovering for 48 hours', () => {
        const status = recoveryStatus([legs], new Date(2026, 9, 11, 12).getTime());
        expect(status.map(s => s.group)).toEqual(['piernas']); // one set of chest is not enough
        expect(status[0].ready).toBe(false);
        expect(recoveryStatus([legs], new Date(2026, 9, 12, 20).getTime())[0].ready).toBe(true);
    });
    it('reminds one hour before the usual training time once rested', () => {
        const alerts = recoveryAlerts([legs], new Date(2026, 9, 11, 12));
        expect(alerts).toHaveLength(1);
        expect(alerts[0].groups).toEqual(['piernas']);
        // Rested on the 12th at 19:00; usually trains at 18:00 -> reminder on the 13th at 17:00.
        expect(alerts[0].at).toEqual(new Date(2026, 9, 13, 17));
        expect(recoveryAlerts([legs], new Date(2026, 9, 20, 12))).toHaveLength(0);
    });
});

describe('wrapped', () => {
    it('compares the weight lifted with the heaviest thing lifted at least once', () => {
        expect(equivalent(12_450)).toEqual({ key: 'bus', emoji: '🚌', count: 1 });
        expect(equivalent(11_000)?.key).toBe('elephant');
        expect(equivalent(11_000)?.count).toBe(1);
        expect(equivalent(14_000)?.count).toBe(1);
        expect(equivalent(25)).toBeNull();
    });
    it('sums the month and finds new records', () => {
        const s = (id: string, d: Date, w: number, r: number): Session => ({
            id, routineId: null, routineName: 'x', startedAt: d.toISOString(), endedAt: new Date(d.getTime() + 3_600_000).toISOString(),
            sets: [{ id: id + 's', exerciseId: 'press-banca', setIndex: 1, weightKg: w, reps: r, completedAt: '' }],
        });
        const sessions = [s('b', new Date(2026, 9, 3, 9), 80, 5), s('a', new Date(2026, 8, 20, 9), 75, 5)];
        const wrap = monthWrap(sessions, 2026, 9);
        expect(wrap.sessions).toBe(1);
        expect(wrap.volumeKg).toBe(400);
        expect(wrap.minutes).toBe(60);
        expect(wrap.trainedDays.size).toBe(1);
        expect(wrap.records).toEqual([{ exerciseId: 'press-banca', weightKg: 80, reps: 5, isNew: true }]);
    });
});

describe('summarizeHeart', () => {
    it('averages the day and keeps the latest reading', () => {
        expect(summarizeHeart([
            { value: 60, startDate: '2026-10-12T08:00:00Z' },
            { value: 150, startDate: '2026-10-12T18:00:00Z' },
            { value: 90, startDate: '2026-10-12T12:00:00Z' },
            { value: 0, startDate: '2026-10-12T13:00:00Z' },
        ])).toEqual({ avg: 100, min: 60, max: 150, last: 150 });
        expect(summarizeHeart([])).toBeNull();
    });
});

describe('Android health permissions', () => {
    it('keeps only the three Health Connect reads the app uses', async () => {
        const { readFileSync } = await import('node:fs');
        const app = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
        const plugin = readFileSync('node_modules/@capgo/capacitor-health/android/src/main/AndroidManifest.xml', 'utf8');
        const names = (xml: string, re: RegExp) => new Set([...xml.matchAll(re)].map(m => m[1]));
        const declared = names(plugin, /android\.permission\.health\.([A-Z0-9_]+)"/g);
        const removed = names(app, /android\.permission\.health\.([A-Z0-9_]+)" tools:node="remove"/g);
        const kept = [...declared].filter(p => !removed.has(p)).sort();
        expect(kept).toEqual(['READ_ACTIVE_CALORIES_BURNED', 'READ_HEART_RATE', 'READ_STEPS']);
        for (const p of removed) expect(declared.has(p), p).toBe(true);
    });
});

describe('app icon colors', () => {
    const ids = APP_ICONS.map(i => i.id);
    const cap = (id: string) => id[0].toUpperCase() + id.slice(1);
    it('has the same colors in the app, Android and iOS', async () => {
        const { existsSync, readFileSync } = await import('node:fs');
        const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
        const aliases = [...manifest.matchAll(/<activity-alias\s+android:name="\.Icon(\w+)"[\s\S]*?android:enabled="(\w+)"/g)];
        expect(aliases.map(m => m[1])).toEqual(ids.map(cap));
        expect(aliases.filter(m => m[2] === 'true').map(m => m[1])).toEqual([cap(DEFAULT_ICON)]);
        // Only the aliases open the app from the launcher.
        expect(manifest.match(/category\.LAUNCHER/g)).toHaveLength(ids.length);
        const java = readFileSync('android/app/src/main/java/com/fitnesslife/app/LauncherIconPlugin.java', 'utf8');
        const swift = readFileSync('ios/App/App/LauncherIconPlugin.swift', 'utf8');
        // The plugin is registered by MainViewController, so the app must start with it.
        expect(readFileSync('ios/App/App/SceneDelegate.swift', 'utf8')).toContain('rootViewController = MainViewController()');
        const list = ids.map(id => `"${id}"`).join(', ');
        expect(java).toContain(`Arrays.asList(${list})`);
        expect(swift).toContain(`[${list}]`);
        const pbx = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
        const alternates = ids.filter(id => id !== DEFAULT_ICON).map(id => `AppIcon-${cap(id)}`);
        expect(pbx).toContain(`ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "${alternates.join(' ')}"`);
        for (const id of ids.filter(i => i !== DEFAULT_ICON)) {
            expect(existsSync(`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_${id}.xml`), id).toBe(true);
            expect(existsSync(`ios/App/App/Assets.xcassets/AppIcon-${cap(id)}.appiconset/AppIcon-${cap(id)}.png`), id).toBe(true);
        }
    });
});

describe('weekly plan updates', () => {
    const profile = { goal: 'musculo' as const, level: 'intermedio' as const, daysPerWeek: 3, setup: 'gimnasio' as const };
    it('runs a 4-week wave: base, volume, intensity, lighter week', () => {
        expect([1, 2, 3, 4, 5].map(weekPhase)).toEqual(['base', 'volumen', 'intensidad', 'descarga', 'base']);
        const main = { sets: 3, repMin: 6, repMax: 10, restSec: 120 };
        const acc = { sets: 3, repMin: 10, repMax: 15, restSec: 75 };
        expect(waveFor(acc, 'accessory', false, 2).sets).toBe(4);
        expect(waveFor(main, 'main', false, 3)).toEqual({ sets: 3, repMin: 4, repMax: 8, restSec: 150 });
        expect(waveFor(main, 'main', false, 3, true)).toEqual(main);
        expect(waveFor(main, 'main', false, 4).sets).toBe(2);
    });
    it('keeps main lifts and swaps accessories for the same muscle', () => {
        const w1 = buildPlan(profile, 1).routines;
        const w2 = buildPlan(profile, 2).routines;
        let swapped = 0;
        w1.forEach((r, i) => r.exercises.forEach((e, j) => {
            const next = w2[i].exercises[j];
            if (e.exerciseId !== next.exerciseId) {
                swapped++;
                expect(getExercise(next.exerciseId)?.muscle).toBe(getExercise(e.exerciseId)?.muscle);
            }
        }));
        expect(swapped).toBeGreaterThan(0);
        // Day A of full body: squat, bench and row are main lifts and stay.
        expect(w2[0].exercises.slice(0, 3).map(e => e.exerciseId)).toEqual(['sentadilla', 'press-banca', 'remo-barra']);
        for (const r of w2) expect(new Set(r.exercises.map(e => e.exerciseId)).size).toBe(r.exercises.length);
        // A main lift of the program never shows up as an accessory.
        const mains = new Set(w1.flatMap(r => r.exercises.slice(0, 2).map(e => e.exerciseId)));
        for (const [i, r] of w2.entries()) r.exercises.forEach((e, j) => {
            if (e.exerciseId !== w1[i].exercises[j].exerciseId) expect(mains.has(e.exerciseId), e.exerciseId).toBe(false);
        });
    });
    it('moves the plan on, keeps days edited by hand and lists the swaps', () => {
        const { plan, routines } = buildPlan(profile, 1);
        const edited = { ...routines[1], edited: true };
        const all = [routines[0], edited, { id: 'mine', name: 'Mía', source: 'custom' as const, exercises: [] }];
        const next = advancePlan(profile, { ...plan, nextIndex: 1 }, all, '2026-10-12');
        expect(next.plan.week).toBe(2);
        expect(next.plan.nextIndex).toBe(1);
        expect(next.plan.advancedFor).toBe('2026-10-12');
        expect(next.plan.routineIds[1]).toBe(edited.id);
        expect(next.routines.find(r => r.id === 'mine')).toBeDefined();
        expect(next.routines.some(r => r.id === routines[0].id)).toBe(false);
        expect(next.plan.update?.swaps.length).toBeGreaterThan(0);
        expect(next.plan.update?.seen).toBe(false);
    });
});
