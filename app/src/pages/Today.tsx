import { Apple, Check, ChevronRight, Clock, Dumbbell, Flame, Lightbulb, Play, Plus, Trophy, Weight } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/feedback';
import { Medal } from '../components/Medal';
import { Empty, Section } from '../components/ui';
import { exerciseName, exercisePhotos } from '../data/exercises';
import { locale, t, tp } from '../i18n';
import { planName, routineName, sessionName } from '../lib/names';
import { ACHIEVEMENTS, achievementTitle, unlockedAchievements } from '../lib/achievements';
import { fmtDate, fmtNumber, fmtVolume, greeting } from '../lib/format';
import { autoTargets, mealsOn, sumMacros } from '../lib/nutrition';
import { volume } from '../lib/progression';
import { durationMin, sessionsThisWeek, streakWeeks, weekStart } from '../lib/stats';
import { actions, useStore } from '../store/store';
import type { Routine } from '../store/types';

// Home: the next workout up front, then the week, the numbers, today's food and a daily tip.

const TIPS = 12;

// About how long a routine takes: every set plus its rest.
const estimateMin = (r: Routine) => Math.max(5, Math.round(r.exercises.reduce((m, e) => m + e.sets * (e.restSec + 45), 0) / 60 / 5) * 5);

// Numbers count up when the screen opens (not with reduced motion).
const useCountUp = (target: number, ms = 700) => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [value, setValue] = useState(reduce ? target : 0);
    useEffect(() => {
        if (reduce || target === 0) {
            setValue(target);
            return;
        }
        let frame = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / ms, 1);
            setValue(Math.round(target * (1 - (1 - p) ** 3)));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, ms, reduce]);
    return value;
};

const CountUp = ({ value, format = fmtNumber }: { value: number; format?: (n: number) => string }) => <>{format(useCountUp(value))}</>;

// Weekly goal as a segmented ring: one segment per planned day.
const WeekRing = ({ done, target }: { done: number; target: number }) => {
    const r = 34, c = 2 * Math.PI * r, gap = target > 1 ? 6 : 0;
    const seg = c / target - gap;
    return (
        <svg viewBox="0 0 84 84" className="h-20 w-20 shrink-0 -rotate-90" role="img" aria-label={t('today.title', { done, target })}>
            {Array.from({ length: target }, (_, i) => (
                <circle key={i} cx={42} cy={42} r={r} fill="none" strokeWidth={9} strokeLinecap="round"
                    className={`transition-colors duration-700 ${i < done ? 'stroke-brand' : 'stroke-ink-4'}`}
                    strokeDasharray={`${Math.max(seg, 0.1)} ${c}`} strokeDashoffset={-i * (seg + gap)} />
            ))}
            <text x={42} y={-36} transform="rotate(90)" textAnchor="middle" fontSize={20} fontWeight={700} className="fill-white">
                {Math.min(done, target)}/{target}
            </text>
        </svg>
    );
};

// Monday to Sunday: trained days filled, today outlined.
const WeekStrip = ({ trained }: { trained: Set<number> }) => {
    const monday = weekStart(new Date());
    const today = (new Date().getDay() + 6) % 7;
    return (
        <ol className="mt-4 grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
                const done = trained.has(i);
                return (
                    <li key={i} className="flex flex-col items-center gap-1.5">
                        <span className={`text-[11px] font-medium uppercase ${i === today ? 'text-brand' : 'text-white/45'}`}>
                            {day.toLocaleDateString(locale(), { weekday: 'narrow' })}
                        </span>
                        <span aria-label={`${day.toLocaleDateString(locale(), { weekday: 'long' })}${done ? ` · ${t('home.trained')}` : ''}`}
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition ${
                                done ? 'bg-brand text-snow shadow-md shadow-brand/30' : i === today ? 'border-2 border-brand text-white' : i < today ? 'bg-ink-3 text-white/35' : 'bg-ink-3 text-white/60'}`}>
                            {done ? <Check size={16} strokeWidth={3} /> : day.getDate()}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
};

const Tile = ({ icon, value, label, delay }: { icon: ReactNode; value: ReactNode; label: string; delay: number }) => (
    <div className="welcome-in card p-3.5" style={{ animationDelay: `${delay}ms` }}>
        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-white/50">{label}</p>
    </div>
);

const NextWorkout = ({ routine, onStart, continuing }: { routine: Routine; onStart: () => void; continuing: boolean }) => {
    const { plan } = useStore();
    const photo = exercisePhotos(routine.exercises[0]?.exerciseId ?? '')?.[1];
    return (
        <div className="welcome-in relative overflow-hidden rounded-3xl bg-black shadow-xl shadow-black/20">
            {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />
            <div className="relative flex min-h-[17rem] flex-col justify-end p-5 text-snow">
                <span className="mb-auto self-start rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-snow">{t('today.next')}</span>
                <p className="mt-6 text-xs text-snow/70">{plan && planName(plan)} · {t('today.dayOf', { n: (plan?.nextIndex ?? 0) + 1, total: plan?.routineIds.length ?? 0 })}</p>
                <h2 className="text-[1.7rem] font-extrabold leading-tight tracking-tight">{routineName(routine)}</h2>
                <p className="mt-1 flex items-center gap-3 text-sm text-snow/80">
                    <span className="flex items-center gap-1"><Dumbbell size={14} /> {tp('home.exercises', routine.exercises.length)}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {t('home.minutes', { n: estimateMin(routine) })}</span>
                </p>
                <p className="mt-2 line-clamp-1 text-xs text-snow/60">{routine.exercises.map(e => exerciseName(e.exerciseId)).join(' · ')}</p>
                <button onClick={onStart} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-snow shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98]">
                    <Play size={18} fill="currentColor" /> {continuing ? t('today.continue') : t('today.start')}
                </button>
            </div>
        </div>
    );
};

const NutritionToday = () => {
    const { profile, meals, nutritionTargets, bodyWeights } = useStore();
    const weightKg = bodyWeights[0]?.weightKg;
    const targets = nutritionTargets ?? (weightKg && profile ? autoTargets(profile.goal, weightKg) : null);
    const eaten = sumMacros(mealsOn(meals, new Date()));
    if (!targets) {
        return (
            <Link to="/nutricion" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Apple size={20} /></span>
                <p className="min-w-0 flex-1 text-sm text-white/70">{t('home.setupNutrition')}</p>
                <ChevronRight className="shrink-0 text-white/40" />
            </Link>
        );
    }
    const left = targets.kcal - eaten.kcal;
    const pct = (n: number, of: number) => `${of > 0 ? Math.min((n / of) * 100, 100) : 0}%`;
    return (
        <Link to="/nutricion" className="card block p-4 hover:bg-ink-3">
            <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold tabular-nums"><CountUp value={Math.abs(left)} /></p>
                <p className={`text-sm ${left < 0 ? 'text-red-400' : 'text-white/55'}`}>{left < 0 ? t('nutrition.kcalOver') : t('nutrition.kcalLeft')}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-4">
                <div className={`h-full rounded-full transition-[width] duration-700 ${left < 0 ? 'bg-red-400' : 'bg-brand'}`} style={{ width: pct(eaten.kcal, targets.kcal) }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/55">
                <span>{t('macro.protein')}</span>
                <span className="tabular-nums">{fmtNumber(eaten.protein)} / {fmtNumber(targets.protein)} g</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-4">
                <div className="h-full rounded-full bg-sky-400 transition-[width] duration-700" style={{ width: pct(eaten.protein, targets.protein) }} />
            </div>
        </Link>
    );
};

export default function Today() {
    const { profile, plan, routines, sessions, active, seenAchievements } = useStore();
    const navigate = useNavigate();
    const unlocked = useMemo(() => unlockedAchievements(sessions, profile?.daysPerWeek ?? 3), [sessions, profile?.daysPerWeek]);
    const week = useMemo(() => sessionsThisWeek(sessions), [sessions]);
    if (!profile) return null;

    const next = plan ? routines.find(r => r.id === plan.routineIds[plan.nextIndex]) : undefined;
    const thisWeek = week.length;
    const trainedDays = new Set(week.map(s => (new Date(s.startedAt).getDay() + 6) % 7));
    const weekMinutes = week.reduce((m, s) => m + durationMin(s), 0);
    const weekVolume = week.reduce((v, s) => v + volume(s.sets), 0);
    const streak = streakWeeks(sessions);
    const lastSession = sessions[0];
    const latestMedal = [...unlocked.values()].sort((a, b) => b.date.localeCompare(a.date))[0];
    const unseen = [...unlocked.keys()].filter(id => !seenAchievements.includes(id)).length;
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);
    const tip = (dayOfYear % TIPS) + 1;

    const start = async (routineId: string | null) => {
        if (active && (active.routineId === routineId || !(await confirm({ title: t('active.confirm.title'), message: t('active.confirm.message'), confirmLabel: t('active.confirm.start'), danger: true })))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(routineId);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-3 px-4 pt-6">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/45">{now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <h1 className="truncate text-2xl font-bold tracking-tight">{greeting()}{profile.name ? `, ${profile.name}` : ''}</h1>
                </div>
                <span className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${streak > 0 ? 'bg-brand-soft text-brand' : 'bg-ink-3 text-white/50'}`}
                    aria-label={`${streak} ${tp('today.streak', streak)}`}>
                    <Flame size={16} className={streak > 0 ? 'fill-brand' : ''} /> {streak}
                </span>
            </header>

            <Section>
                {next ? (
                    <NextWorkout routine={next} onStart={() => start(next.id)} continuing={active?.routineId === next.id} />
                ) : (
                    <Empty icon={<Plus />} title={t('today.noPlan')}>
                        {t('today.noPlanHint')} <Link className="text-brand underline" to="/ajustes">{t('nav.settings')}</Link>
                    </Empty>
                )}
                <button onClick={() => start(null)} className="btn-ghost mt-2 w-full">
                    <Plus size={18} /> {t('workout.free')}
                </button>
            </Section>

            <Section title={t('home.week')}>
                <div className="welcome-in card p-4" style={{ animationDelay: '80ms' }}>
                    <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold leading-snug">
                                {thisWeek >= profile.daysPerWeek ? t('today.weekDone') : t('today.title', { done: thisWeek, target: profile.daysPerWeek })}
                            </h2>
                            <p className="mt-0.5 text-sm text-white/50">
                                {thisWeek >= profile.daysPerWeek ? t('today.weekDoneHint') : tp('today.left', profile.daysPerWeek - thisWeek)}
                            </p>
                        </div>
                        <WeekRing done={thisWeek} target={profile.daysPerWeek} />
                    </div>
                    <WeekStrip trained={trainedDays} />
                </div>
            </Section>

            <Section title={t('home.stats')}>
                <div className="grid grid-cols-2 gap-2">
                    <Tile delay={120} icon={<Flame size={16} />} value={<CountUp value={streak} />} label={tp('today.streak', streak)} />
                    <Tile delay={160} icon={<Trophy size={16} />} value={<CountUp value={sessions.length} />} label={t('today.total')} />
                    <Tile delay={200} icon={<Clock size={16} />} value={<CountUp value={weekMinutes} />} label={t('home.weekMinutes')} />
                    <Tile delay={240} icon={<Weight size={16} />} value={<CountUp value={Math.round(weekVolume)} format={n => fmtVolume(n, profile.unit)} />} label={t('home.weekVolume')} />
                </div>
            </Section>

            <Section title={t('home.nutrition')}>
                <NutritionToday />
            </Section>

            <Section>
                <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft to-transparent p-4">
                    <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand"><Lightbulb size={15} /> {t('home.tip')}</p>
                    <p className="text-[15px] leading-relaxed text-white/85">{t(`tip.${tip}` as Parameters<typeof t>[0])}</p>
                </div>
            </Section>

            <Section title={t('nav.achievements')}>
                <Link to="/logros" className="card flex items-center gap-3 p-3 hover:bg-ink-3">
                    {latestMedal
                        ? <Medal achievement={ACHIEVEMENTS.find(a => a.id === latestMedal.id)!} unlocked />
                        : <Medal achievement={ACHIEVEMENTS[0]} unlocked={false} />}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                            {latestMedal ? achievementTitle(ACHIEVEMENTS.find(a => a.id === latestMedal.id)!) : t('today.firstMedal')}
                        </p>
                        <p className="text-sm text-white/50">{t('achievements.count', { n: unlocked.size, total: ACHIEVEMENTS.length })}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-4">
                            <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%` }} />
                        </div>
                    </div>
                    {unseen > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink">{tp('today.newMedals', unseen)}</span>}
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
            </Section>

            {lastSession && (
                <Section title={t('today.last')}>
                    <Link to={`/sesion/${lastSession.id}`} className="card flex items-center justify-between gap-3 p-4 hover:bg-ink-3">
                        <div className="min-w-0">
                            <p className="truncate font-semibold">{sessionName(lastSession)}</p>
                            <p className="text-sm text-white/50">
                                {fmtDate(lastSession.startedAt)} · {durationMin(lastSession)} min · {fmtVolume(volume(lastSession.sets), profile.unit)}
                            </p>
                        </div>
                        <ChevronRight className="shrink-0 text-white/40" />
                    </Link>
                </Section>
            )}
        </div>
    );
}
