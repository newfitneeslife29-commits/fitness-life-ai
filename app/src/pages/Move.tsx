import { Bike, Check, ChevronLeft, ChevronRight, Footprints, Moon, Pencil, Play, Plus, Route, Smartphone, Trash2, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { HealthCard } from '../components/HealthCard';
import { Chips, Photo, Section, Sheet } from '../components/ui';
import { kindPhoto, moveHero, movePhoto } from '../data/photos';
import { getWalkPlan, WALK_PLANS } from '../data/walking';
import { l10n, locale, t } from '../i18n';
import { localDay } from '../lib/activity';
import { cardioKcal, distUnit, fromDist, pace, speed, stepsFor, toDist } from '../lib/cardio';
import { fmtClock, fmtDate, fmtNumber, parseDecimal } from '../lib/format';
import { healthRemembered } from '../lib/health';
import { cardioTotals, enablePedometer, manualSleep, pedometerOn, pedometerSupported, sleepRating, stepGoalOf, stepsOn, syncMovement, walkPlanStatus } from '../lib/movement';
import { isNative } from '../lib/native';
import { weekStart } from '../lib/stats';
import { actions, getState, useStore } from '../store/store';
import type { CardioKind, CardioSession, Unit } from '../store/types';

// Movement: steps of the day and their history, sleep, walks and rides
// (recorded with GPS or typed in) and walking plans.

const KINDS: { kind: CardioKind; icon: ReactNode; gradient: string }[] = [
    { kind: 'walk', icon: <Footprints size={22} />, gradient: 'from-emerald-500 to-teal-500 shadow-emerald-500/30' },
    { kind: 'bike', icon: <Bike size={22} />, gradient: 'from-sky-500 to-indigo-500 shadow-sky-500/30' },
    { kind: 'run', icon: <Zap size={22} />, gradient: 'from-orange-500 to-rose-500 shadow-orange-500/30' },
];

const dayShort = (d: Date) => d.toLocaleDateString(locale(), { weekday: 'narrow' });
const lastDays = (n: number, now = new Date()) => Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i)));
const hours = (minutes: number) => (minutes / 60).toLocaleString(locale(), { maximumFractionDigits: 1 });

export const fmtDist = (meters: number, unit: Unit) =>
    `${toDist(meters, unit).toLocaleString(locale(), { maximumFractionDigits: 2, minimumFractionDigits: meters > 0 ? 2 : 0 })} ${distUnit(unit)}`;

export const cardioStat = (s: { kind: CardioKind; distanceM: number; durationSec: number }, unit: Unit) => {
    if (s.kind === 'bike') return `${speed(s.distanceM, s.durationSec, unit).toLocaleString(locale(), { maximumFractionDigits: 1 })} ${distUnit(unit)}/h`;
    const p = pace(s.distanceM, s.durationSec, unit);
    return p ? `${fmtClock(p)} /${distUnit(unit)}` : '–';
};

// Seven bars, today last; the dashed line is the goal.
const WeekBars = ({ values, goal, color, label }: { values: { day: Date; value: number }[]; goal: number; color: string; label: (v: number) => string }) => {
    const max = Math.max(goal, ...values.map(v => v.value), 1);
    return (
        <div className="relative mt-4 flex h-28 items-end gap-2" role="img" aria-label={values.map(v => `${dayShort(v.day)} ${label(v.value)}`).join(', ')}>
            <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-white/20" style={{ bottom: `${(goal / max) * 100}%` }} />
            {values.map(({ day, value }, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className={`w-full rounded-t-lg ${value >= goal ? color : `${color} opacity-50`}`} style={{ height: `${Math.max(3, (value / max) * 100)}%` }} />
                    <span className={`text-[10px] font-semibold uppercase ${i === values.length - 1 ? 'text-white' : 'text-white/40'}`}>{dayShort(day)}</span>
                </div>
            ))}
        </div>
    );
};

const dayFrom = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const shiftDay = (key: string, by: number) => {
    const d = dayFrom(key);
    return localDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + by));
};
const HISTORY_DAYS = 60;
const dayTitle = (key: string) => {
    const today = localDay(new Date());
    if (key === today) return t('steps.today');
    if (key === shiftDay(today, -1)) return t('steps.yesterday');
    const text = dayFrom(key).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' });
    return text.charAt(0).toLocaleUpperCase(locale()) + text.slice(1);
};

// Type the steps of any of the last days by hand (for days without Health or the phone sensor).
const LogStepsSheet = ({ day, onClose }: { day: string | null; onClose: () => void }) => {
    const state = useStore(s => s);
    const [key, setKey] = useState(day ?? localDay(new Date()));
    const [value, setValue] = useState('');
    const today = localDay(new Date());
    const oldest = shiftDay(today, -(HISTORY_DAYS - 1));
    const current = stepsOn(state, key);
    const pick = (k: string) => {
        setKey(k);
        setValue('');
    };
    const save = () => {
        // Steps are whole numbers: "8.500", "8,500" and "8500" are all 8500.
        const digits = value.replace(/\D/g, '');
        const n = Number(digits);
        if (!digits || n > 100000) {
            toast(t('steps.logInvalid'));
            return;
        }
        actions.setSteps(key, n);
        toast(t('steps.logged', { n: fmtNumber(n) }));
        onClose();
    };
    return (
        <Sheet open={day !== null} onClose={onClose} title={t('steps.logTitle')}>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-ink-3 p-2">
                <button onClick={() => pick(shiftDay(key, -1))} disabled={key <= oldest} aria-label={t('steps.prevDay')} className="btn-ghost h-10 w-10 p-0 disabled:opacity-30"><ChevronLeft size={20} /></button>
                <p className="text-center font-semibold">{dayTitle(key)}</p>
                <button onClick={() => pick(shiftDay(key, 1))} disabled={key >= today} aria-label={t('steps.nextDay')} className="btn-ghost h-10 w-10 p-0 disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>
            <p className="mt-3 text-sm text-white/55">{t('steps.logNow', { n: fmtNumber(current) })}</p>
            <label className="mt-3 block">
                <span className="label mb-1 block">{t('steps.logCount')}</span>
                <input value={value} onChange={e => setValue(e.target.value)} inputMode="numeric" placeholder={current ? String(current) : '8000'} autoFocus
                    className="w-full rounded-xl border border-line bg-ink px-3 py-3 text-2xl font-bold tabular-nums outline-none focus:border-brand" />
            </label>
            <p className="mt-2 text-xs text-white/45">{t('steps.logHint')}</p>
            <button onClick={save} className="btn-primary mt-4 w-full py-3.5"><Check size={18} /> {t('steps.logSave')}</button>
        </Sheet>
    );
};

// Steps day by day: summary of the period and one row per day, tap a day to change it.
const StepsHistory = ({ onEdit }: { onEdit: (day: string) => void }) => {
    const state = useStore(s => s);
    const goal = stepGoalOf(state);
    const [range, setRange] = useState<7 | 30>(7);
    const [more, setMore] = useState(false);
    const today = localDay(new Date());
    const days = Array.from({ length: range }, (_, i) => shiftDay(today, -i));
    const values = days.map(d => stepsOn(state, d));
    const counted = values.filter(v => v > 0);
    const avg = counted.length ? Math.round(counted.reduce((a, b) => a + b, 0) / counted.length) : 0;
    const best = Math.max(0, ...values);
    const metGoal = values.filter(v => v >= goal).length;
    const total = values.reduce((a, b) => a + b, 0);
    const list = more ? Array.from({ length: HISTORY_DAYS }, (_, i) => shiftDay(today, -i)) : days.slice(0, Math.min(range, 10));
    const max = Math.max(goal, ...list.map(d => stepsOn(state, d)), 1);
    return (
        <div className="card overflow-hidden">
            <div className="flex gap-1 p-2">
                {([7, 30] as const).map(n => (
                    <button key={n} onClick={() => { setRange(n); setMore(false); }}
                        className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${range === n ? 'bg-emerald-500 text-snow shadow-md shadow-emerald-500/30' : 'text-white/60 hover:bg-ink-3'}`}>
                        {t('steps.range', { n })}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-1 sm:grid-cols-4">
                {[
                    [t('steps.avg'), fmtNumber(avg)],
                    [t('steps.best'), fmtNumber(best)],
                    [t('steps.goalDays'), `${metGoal}/${range}`],
                    [t('steps.total'), fmtNumber(total)],
                ].map(([label, v]) => (
                    <div key={label} className="rounded-xl bg-ink-3 px-3 py-2">
                        <p className="text-lg font-extrabold tabular-nums">{v}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</p>
                    </div>
                ))}
            </div>
            <ul className="divide-y divide-line border-t border-line">
                {list.map(d => {
                    const v = stepsOn(state, d);
                    return (
                        <li key={d}>
                            <button onClick={() => onEdit(d)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-3">
                                <span className="w-28 shrink-0 truncate text-sm font-medium">{dayTitle(d)}</span>
                                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-4">
                                    <span className={`block h-full rounded-full ${v >= goal ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-emerald-500/50'}`} style={{ width: `${Math.max(v ? 3 : 0, (v / max) * 100)}%` }} />
                                </span>
                                <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums">{v ? fmtNumber(v) : '–'}</span>
                                {v >= goal ? <Check size={16} className="shrink-0 text-emerald-400" /> : <Pencil size={14} className="shrink-0 text-white/30" />}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {!more && (
                <button onClick={() => setMore(true)} className="w-full border-t border-line py-3 text-sm font-semibold text-emerald-400 hover:bg-ink-3">
                    {t('steps.seeMore', { n: HISTORY_DAYS })}
                </button>
            )}
        </div>
    );
};

const StepsCard = ({ onLog }: { onLog: () => void }) => {
    const state = useStore(s => s);
    const today = localDay(new Date());
    const steps = stepsOn(state, today);
    const goal = stepGoalOf(state);
    const [editGoal, setEditGoal] = useState(false);
    const pct = Math.min(1, steps / goal);
    const r = 52, c = 2 * Math.PI * r;
    const unit = state.profile?.unit ?? 'kg';
    const meters = steps * ((state.profile?.heightCm ?? 0) ? (state.profile!.heightCm! * 0.415) / 100 : 0.75);
    const week = lastDays(7).map(day => ({ day, value: stepsOn(state, localDay(day)) }));
    const counting = isNative() && (healthRemembered() || pedometerOn());

    const turnOnPedometer = async () => {
        if (await enablePedometer()) {
            await syncMovement();
            toast(t('steps.counting'));
        } else toast(t('steps.denied'), 4000);
    };

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-4 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent p-4">
                <div className="relative h-32 w-32 shrink-0">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
                        <circle cx={60} cy={60} r={r} fill="none" className="stroke-ink-4" strokeWidth={12} />
                        <circle cx={60} cy={60} r={r} fill="none" strokeWidth={12} strokeLinecap="round" stroke="url(#steps-grad)"
                            strokeDasharray={`${pct * c} ${c}`} className="transition-[stroke-dasharray] duration-700" />
                        <defs><linearGradient id="steps-grad"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#2dd4bf" /></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Footprints size={18} className="text-emerald-400" />
                        <span className="text-2xl font-extrabold tabular-nums" aria-label={t('steps.todayLabel', { n: fmtNumber(steps) })}>{fmtNumber(steps)}</span>
                        <span className="text-[11px] text-white/50">{t('steps.of', { goal: fmtNumber(goal) })}</span>
                    </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-lg font-bold leading-tight">{steps >= goal ? t('steps.goalDone') : t('steps.toGo', { n: fmtNumber(goal - steps) })}</p>
                    <p className="text-sm text-white/60">≈ {fmtDist(meters, unit)}</p>
                    <button onClick={onLog} className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-bold text-snow shadow-md shadow-emerald-500/30"><Plus size={15} /> {t('steps.log')}</button>
                    {!state.walkPlan && <button onClick={() => setEditGoal(true)} className="block text-sm font-semibold text-emerald-400">{t('steps.changeGoal')}</button>}
                </div>
            </div>
            <div className="px-4 pb-4">
                <WeekBars values={week} goal={goal} color="bg-gradient-to-t from-emerald-500 to-teal-400" label={v => fmtNumber(v)} />
            </div>
            {!counting && (
                <div className="border-t border-line p-4 text-sm">
                    <p className="text-white/65">{isNative() ? t('steps.howToCount') : t('steps.webHint')}</p>
                    {pedometerSupported() && (
                        <button onClick={turnOnPedometer} className="btn-ghost mt-3 w-full"><Smartphone size={16} /> {t('steps.usePhone')}</button>
                    )}
                </div>
            )}
            <Sheet open={editGoal} onClose={() => setEditGoal(false)} title={t('steps.goalTitle')}>
                <Chips<number> label={t('steps.goalTitle')} value={goal} onChange={n => { actions.updateProfile({ stepGoal: n }); setEditGoal(false); }}
                    options={[5000, 6000, 8000, 10000, 12000, 15000].map(n => ({ value: n, label: fmtNumber(n) }))} />
            </Sheet>
        </div>
    );
};

const WalkPlanCard = () => {
    const plan = useStore(s => s.walkPlan ?? null);
    const navigate = useNavigate();
    const [choosing, setChoosing] = useState(false);
    const status = plan ? walkPlanStatus(plan) : null;
    const def = plan ? getWalkPlan(plan.id) : null;

    const start = () => {
        if (!plan || !status) return;
        // A walk or ride already being recorded is never replaced.
        if (getState().cardioActive) {
            navigate('/cardio');
            return;
        }
        actions.startCardio('walk', { targetMin: status.spec.minutes, walkPlan: `${plan.id}:${status.week}:${status.walk}` });
        navigate('/cardio');
    };

    const picker = (
        <Sheet open={choosing} onClose={() => setChoosing(false)} title={t('walkPlan.choose')}>
            <ul className="space-y-2">
                {WALK_PLANS.map(p => (
                    <li key={p.id}>
                        <button onClick={() => { actions.setWalkPlan(p.id); setChoosing(false); toast(t('walkPlan.started', { name: l10n(p.name) })); }}
                            className="card w-full p-4 text-left hover:bg-ink-3">
                            <p className="font-semibold">{l10n(p.name)}</p>
                            <p className="text-sm text-white/60">{l10n(p.description)}</p>
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );

    if (!plan || !status || !def) {
        return (
            <>
                <button onClick={() => setChoosing(true)} className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 p-4 text-left text-snow shadow-lg shadow-emerald-500/25 active:scale-[0.99]">
                    <Photo photo={movePhoto('correr-7')} />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-emerald-700/95 via-emerald-600/80 to-lime-500/35" />
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/20 backdrop-blur"><Route size={22} /></span>
                    <span className="relative min-w-0 flex-1">
                        <span className="block font-bold">{t('walkPlan.ctaTitle')}</span>
                        <span className="block text-sm text-snow/90">{t('walkPlan.ctaText')}</span>
                    </span>
                    <ChevronRight className="relative shrink-0" />
                </button>
                {picker}
            </>
        );
    }

    return (
        <div className="card overflow-hidden">
            <div className="relative flex min-h-[9rem] flex-col justify-end overflow-hidden bg-emerald-800 p-4 text-snow">
                <Photo photo={movePhoto('correr-7')} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-emerald-900/10" />
                <p className="relative text-xs font-semibold uppercase tracking-wide text-emerald-300">{t('walkPlan.week', { n: status.week + 1, of: def.weeks.length })}</p>
                <p className="relative text-lg font-bold">{l10n(def.name)}</p>
                <div className="relative mt-2 flex gap-1.5" aria-label={t('walkPlan.doneOf', { n: status.doneThisWeek, of: status.spec.walks })}>
                    {Array.from({ length: status.spec.walks }, (_, i) => (
                        <span key={i} className={`h-2 flex-1 rounded-full ${i < status.doneThisWeek ? 'bg-emerald-400' : 'bg-snow/25'}`} />
                    ))}
                </div>
            </div>
            <div className="p-4">
                {status.finished ? (
                    <p className="font-semibold">{t('walkPlan.finished')}</p>
                ) : status.doneThisWeek >= status.spec.walks ? (
                    <p className="text-sm text-white/70">{t('walkPlan.weekDone')}</p>
                ) : (
                    <>
                        <p className="font-semibold">{t('walkPlan.today', { n: status.walk + 1, min: status.spec.minutes })}</p>
                        <p className="text-sm text-white/60">{status.spec.intervals ? t('walkPlan.intervals') : t('walkPlan.brisk')} · {t('walkPlan.stepGoal', { n: fmtNumber(status.spec.steps) })}</p>
                        <button onClick={start} className="btn-primary mt-3 w-full bg-emerald-500 hover:bg-emerald-600"><Play size={16} fill="currentColor" /> {t('walkPlan.start')}</button>
                    </>
                )}
                <button onClick={() => setChoosing(true)} className="mt-3 text-sm font-semibold text-white/50 hover:text-white">{t('walkPlan.change')}</button>
            </div>
            {picker}
        </div>
    );
};

const SleepSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const [bed, setBed] = useState('23:00');
    const [wake, setWake] = useState('07:00');
    const entry = manualSleep(new Date(), bed, wake);
    const save = () => {
        if (entry.minutes < 30 || entry.minutes > 18 * 60) return toast(t('sleep.invalid'));
        actions.logSleep([entry]);
        toast(t('sleep.saved', { h: hours(entry.minutes) }));
        onClose();
    };
    const input = 'rounded-xl border border-line bg-ink px-3 py-2 text-xl font-bold tabular-nums outline-none focus:border-brand';
    return (
        <Sheet open={open} onClose={onClose} title={t('sleep.logTitle')}>
            <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="label mb-1 block">{t('sleep.bed')}</span><input type="time" value={bed} onChange={e => setBed(e.target.value)} className={`${input} w-full`} /></label>
                <label className="block"><span className="label mb-1 block">{t('sleep.wake')}</span><input type="time" value={wake} onChange={e => setWake(e.target.value)} className={`${input} w-full`} /></label>
            </div>
            <p className="mt-4 text-center text-3xl font-extrabold tabular-nums text-indigo-300">{t('sleep.hours', { h: hours(entry.minutes) })}</p>
            <button className="btn-primary mt-4 w-full" onClick={save}>{t('common.save')}</button>
        </Sheet>
    );
};

const SleepCard = () => {
    const sleep = useStore(s => s.sleep ?? null);
    const [open, setOpen] = useState(false);
    const list = sleep ?? [];
    const last = list[0];
    const byDay = new Map(list.map(e => [e.day, e.minutes]));
    const week = lastDays(7).map(day => ({ day, value: byDay.get(localDay(day)) ?? 0 }));
    const logged = week.filter(w => w.value > 0);
    const avg = logged.length ? logged.reduce((n, w) => n + w.value, 0) / logged.length : 0;
    const rating = last ? sleepRating(last.minutes) : null;
    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-4 bg-gradient-to-br from-indigo-500/25 via-violet-500/10 to-transparent p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/25 text-indigo-300"><Moon size={28} /></span>
                <div className="min-w-0 flex-1">
                    {last ? (
                        <>
                            <p className="text-3xl font-extrabold tabular-nums">{t('sleep.hours', { h: hours(last.minutes) })}</p>
                            <p className="text-sm text-white/60">{t(`sleep.rating.${rating!}`)} · {fmtDate(last.wakeAt)}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-semibold">{t('sleep.emptyTitle')}</p>
                            <p className="text-sm text-white/60">{t('sleep.emptyText')}</p>
                        </>
                    )}
                </div>
                <button onClick={() => setOpen(true)} aria-label={t('sleep.logTitle')} className="rounded-full bg-indigo-500 p-2.5 text-snow shadow-lg shadow-indigo-500/30"><Plus size={20} /></button>
            </div>
            {logged.length > 0 && (
                <div className="px-4 pb-4">
                    <WeekBars values={week} goal={8 * 60} color="bg-gradient-to-t from-indigo-500 to-violet-400" label={v => `${hours(v)} h`} />
                    <p className="mt-3 text-sm text-white/60">{t('sleep.average', { h: hours(avg) })}</p>
                </div>
            )}
            <SleepSheet open={open} onClose={() => setOpen(false)} />
        </div>
    );
};

const ManualCardioSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const heightCm = useStore(s => s.profile?.heightCm);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const [kind, setKind] = useState<CardioKind>('walk');
    const [dist, setDist] = useState('');
    const [minutes, setMinutes] = useState('');
    const save = () => {
        const d = parseDecimal(dist), m = parseDecimal(minutes);
        if (!(d > 0 && d < 1000) || !(m > 0 && m < 1440)) return toast(t('nutrition.invalidNumbers'));
        const distanceM = fromDist(d, unit), durationSec = Math.round(m * 60);
        const end = new Date();
        actions.addCardio({
            kind, startedAt: new Date(end.getTime() - durationSec * 1000).toISOString(), endedAt: end.toISOString(), durationSec, distanceM,
            steps: kind === 'bike' ? undefined : stepsFor(distanceM, heightCm), kcal: cardioKcal(kind, distanceM, durationSec, weightKg), source: 'manual',
        });
        toast(t('cardio.saved'));
        setDist(''); setMinutes('');
        onClose();
    };
    const input = 'w-full rounded-xl border border-line bg-ink px-3 py-2.5 tabular-nums outline-none focus:border-brand';
    return (
        <Sheet open={open} onClose={onClose} title={t('cardio.addManual')}>
            <Chips<CardioKind> label={t('cardio.kind')} value={kind} onChange={setKind} options={KINDS.map(k => ({ value: k.kind, label: t(`cardio.kind.${k.kind}`) }))} />
            <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block"><span className="label mb-1 block">{t('cardio.distance', { unit: distUnit(unit) })}</span><input value={dist} onChange={e => setDist(e.target.value)} inputMode="decimal" className={input} /></label>
                <label className="block"><span className="label mb-1 block">{t('cardio.minutes')}</span><input value={minutes} onChange={e => setMinutes(e.target.value)} inputMode="decimal" className={input} /></label>
            </div>
            <button className="btn-primary mt-4 w-full" onClick={save}>{t('common.save')}</button>
        </Sheet>
    );
};

const CardioHistory = () => {
    const sessions = useStore(s => s.cardio ?? null) ?? [];
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const [adding, setAdding] = useState(false);
    const week = cardioTotals(sessions, weekStart(new Date()));
    const remove = async (s: CardioSession) => {
        if (await confirm({ title: t('cardio.deleteTitle'), message: t('cardio.deleteMessage'), confirmLabel: t('common.delete'), danger: true })) actions.deleteCardio(s.id);
    };
    return (
        <>
            <div className="grid grid-cols-3 gap-2">
                {[
                    { value: fmtDist(week.distanceM, unit), label: t('cardio.weekDistance') },
                    { value: fmtClock(week.durationSec), label: t('cardio.weekTime') },
                    { value: `${fmtNumber(week.kcal)}`, label: t('cardio.weekKcal') },
                ].map(s => (
                    <div key={s.label} className="card px-3 py-3 text-center">
                        <p className="text-base font-bold tabular-nums">{s.value}</p>
                        <p className="text-[11px] text-white/50">{s.label}</p>
                    </div>
                ))}
            </div>
            {sessions.length > 0 && (
                <ul className="card mt-2 divide-y divide-line">
                    {sessions.slice(0, 20).map(s => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-snow ${KINDS.find(k => k.kind === s.kind)!.gradient}`}>
                                {s.kind === 'bike' ? <Bike size={18} /> : s.kind === 'run' ? <Zap size={18} /> : <Footprints size={18} />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold tabular-nums">{fmtDist(s.distanceM, unit)} <span className="text-sm font-normal text-white/50">· {fmtClock(s.durationSec)}</span></p>
                                <p className="text-xs text-white/50">{t(`cardio.kind.${s.kind}`)} · {fmtDate(s.startedAt)} · {cardioStat(s, unit)}{s.steps ? ` · ${t('cardio.steps', { n: fmtNumber(s.steps) })}` : ''}</p>
                            </div>
                            <button onClick={() => remove(s)} aria-label={t('cardio.deleteTitle')} className="rounded p-1 text-white/35 hover:text-red-400"><Trash2 size={15} /></button>
                        </li>
                    ))}
                </ul>
            )}
            <button className="btn-ghost mt-2 w-full" onClick={() => setAdding(true)}><Plus size={16} /> {t('cardio.addManual')}</button>
            <ManualCardioSheet open={adding} onClose={() => setAdding(false)} />
        </>
    );
};

export default function Move() {
    const navigate = useNavigate();
    const active = useStore(s => s.cardioActive ?? null);
    const [logDay, setLogDay] = useState<string | null>(null);
    const start = (kind: CardioKind) => {
        if (!getState().cardioActive) actions.startCardio(kind);
        navigate('/cardio');
    };
    return (
        <div className="space-y-6 pb-4">
            <header className="bleed-top relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] text-snow shadow-lg shadow-teal-600/25">
                <Photo photo={moveHero()} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-emerald-700/85 via-teal-600/45 to-sky-700/15" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="relative -ml-2 rounded-lg p-2 text-snow/80 hover:bg-snow/10"><ChevronLeft size={22} /></button>
                <h1 className="relative mt-10 text-3xl font-extrabold tracking-tight drop-shadow">{t('move.title')}</h1>
                <p className="relative text-sm text-snow/85">{t('move.subtitle')}</p>
            </header>

            {active && (
                <Section>
                    <button onClick={() => navigate('/cardio')} className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500 p-4 text-left font-semibold text-snow shadow-lg shadow-emerald-500/30">
                        <span className="h-3 w-3 animate-pulse rounded-full bg-snow" /> {t('cardio.inProgress', { kind: t(`cardio.kind.${active.kind}`) })}
                        <ChevronRight className="ml-auto" />
                    </button>
                </Section>
            )}

            <Section title={t('steps.title')}>
                <StepsCard onLog={() => setLogDay(localDay(new Date()))} />
            </Section>

            <Section title={t('steps.history')}>
                <StepsHistory onEdit={setLogDay} />
            </Section>
            {logDay && <LogStepsSheet key={logDay} day={logDay} onClose={() => setLogDay(null)} />}

            {isNative() && <Section><HealthCard /></Section>}

            <Section title={t('cardio.startTitle')}>
                <div className="grid grid-cols-3 gap-2">
                    {KINDS.map(k => (
                        <button key={k.kind} onClick={() => start(k.kind)} disabled={!!active}
                            className={`relative flex h-32 flex-col items-start justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-left text-snow shadow-lg active:scale-95 disabled:opacity-40 ${k.gradient}`}>
                            <Photo photo={kindPhoto(k.kind)} />
                            <span aria-hidden className={`absolute inset-0 bg-gradient-to-br opacity-35 ${k.gradient}`} />
                            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                            <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${k.gradient}`}>{k.icon}</span>
                            <span className="relative flex w-full items-center justify-between text-sm font-bold">{t(`cardio.kind.${k.kind}`)} <Play size={14} fill="currentColor" /></span>
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs text-white/45">{t('cardio.gpsNoteOpen')}</p>
            </Section>

            <Section title={t('walkPlan.title')}>
                <WalkPlanCard />
            </Section>

            <Section title={t('sleep.title')}>
                <SleepCard />
            </Section>

            <Section title={t('cardio.history')}>
                <CardioHistory />
            </Section>
        </div>
    );
}
