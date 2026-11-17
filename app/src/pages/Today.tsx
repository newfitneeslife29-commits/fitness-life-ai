import { ArrowRight, Bot, Check, ChevronRight, Clock, Crown, Dumbbell, Gift, Flame, GraduationCap, PartyPopper, Play, Plus, Trophy } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { confirm } from '../components/feedback';
import { Empty, HeroStat, Photo, Section } from '../components/ui';
import { namedCover, routineCover } from '../data/covers';
import { exerciseName } from '../data/exercises';
import { locale, t, tp } from '../i18n';
import { planName, routineName } from '../lib/names';
import { fmtNumber, greeting } from '../lib/format';
import { autoTargets, mealsOn, sumMacros, waterTargetMl } from '../lib/nutrition';
import { fallbackPlan, usePremiumActive } from '../lib/premium';
import { useStreak } from '../lib/streak';
import { currentPause } from '../lib/pause';
import { PauseBanner } from '../components/PauseCard';
import { challengeDef, challengeName, challengeStatus } from '../lib/challenges';
import { ShopCard } from '../components/ShopCard';
import { PremiumKeepCard } from '../components/PremiumKeepCard';
import { localDay } from '../lib/activity';
import { stepGoalOf, stepsOn } from '../lib/movement';
import { sessionsThisWeek, streakWeeks, weekStart } from '../lib/stats';
import { actions, useStore } from '../store/store';
import type { PlanUpdate, Routine } from '../store/types';
import { weekPhase } from '../lib/plan';
import { useNow } from '../lib/useNow';
import { estimateMinutes } from '../lib/reminders';
import { WELCOME_STEPS, welcomeStatus } from '../lib/welcome';
import { adventWorkout, isAdventKey, travelRoutine } from '../data/travel';

// Home, kept short: the next workout up front, today at a glance (week,
// food, water, steps), the AI trainer and one promotion. The rest lives in
// Progress and Nutrition.

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

const NextWorkout = ({ routine, onStart, continuing }: { routine: Routine; onStart: () => void; continuing: boolean }) => {
    const { plan, routines } = useStore();
    const planRoutines = (plan?.routineIds ?? []).map(id => routines.find(r => r.id === id)).filter((r): r is Routine => !!r);
    const cover = routineCover(routine, planRoutines);
    return (
        <div className="welcome-in relative overflow-hidden rounded-3xl bg-black shadow-xl shadow-black/20">
            <img src={cover.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: cover.position }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            <div className="relative flex min-h-[17rem] flex-col justify-end p-5 text-snow">
                <span className="mb-auto self-start rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-snow">{t('today.next')}</span>
                <p className="mt-6 text-xs text-snow/70">{plan && planName(plan)} · {t('today.dayOf', { n: (plan?.nextIndex ?? 0) + 1, total: plan?.routineIds.length ?? 0 })}</p>
                <h2 className="text-[1.7rem] font-extrabold leading-tight tracking-tight">{routineName(routine)}</h2>
                <p className="mt-1 flex items-center gap-3 text-sm text-snow/80">
                    <span className="flex items-center gap-1"><Dumbbell size={14} /> {tp('home.exercises', routine.exercises.length)}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {t('home.minutes', { n: estimateMinutes(routine) })}</span>
                </p>
                <p className="mt-2 line-clamp-1 text-xs text-snow/60">{routine.exercises.map(e => exerciseName(e.exerciseId)).join(' · ')}</p>
                <button onClick={onStart} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-snow shadow-lg shadow-brand/30 transition hover:bg-brand-strong active:scale-[0.98]">
                    <Play size={18} fill="currentColor" /> {continuing ? t('today.continue') : t('today.start')}
                </button>
            </div>
        </div>
    );
};

// A small progress ring with the number in the middle.
const MiniRing = ({ pct, color, children }: { pct: number; color: string; children: ReactNode }) => {
    const r = 26, c = 2 * Math.PI * r;
    return (
        <span className="relative flex h-[62px] w-[62px] items-center justify-center">
            <svg viewBox="0 0 62 62" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx={31} cy={31} r={r} fill="none" strokeWidth={6} className="stroke-ink-4" />
                <circle cx={31} cy={31} r={r} fill="none" strokeWidth={6} strokeLinecap="round" className={`${color} transition-[stroke-dasharray] duration-700`}
                    strokeDasharray={`${Math.max(0.001, Math.min(1, pct)) * c} ${c}`} />
            </svg>
            <span className="relative text-[13px] font-extrabold tabular-nums leading-none">{children}</span>
        </span>
    );
};

// Today at a glance: the week, food, protein, water and steps, each one a tap
// away from its screen.
const DayCard = ({ trained, thisWeek }: { trained: Set<number>; thisWeek: number }) => {
    const state = useStore();
    const { profile, meals, nutritionTargets, bodyWeights, sessions } = state;
    const now = useNow(true, 60_000);
    if (!profile) return null;
    const day = new Date(now);
    const weightKg = bodyWeights[0]?.weightKg ?? null;
    const targets = nutritionTargets ?? (weightKg ? autoTargets(profile, weightKg) : null);
    const eaten = sumMacros(mealsOn(meals, day));
    const trainedToday = sessions.some(x => new Date(x.startedAt).toDateString() === day.toDateString());
    const waterDrunk = state.water?.[localDay(day)] ?? 0;
    const waterTarget = waterTargetMl(profile, weightKg, { trained: trainedToday, proteinG: targets?.protein });
    const steps = stepsOn(state, localDay(day));
    const stepGoal = stepGoalOf(state);
    const left = targets ? targets.kcal - eaten.kcal : null;
    // The first running 30-day challenge, in one line.
    const challenge = (state.challenges ?? []).map(j => ({ j, st: challengeDef(j.id) ? challengeStatus(j, state) : null }))
        .find(x => x.st?.state === 'running');
    const tile = (to: string, ring: ReactNode, label: string) => (
        <Link to={to} className="flex flex-col items-center gap-1.5 rounded-2xl py-1 text-center active:scale-[0.97]">
            {ring}
            <span className="text-[11px] font-medium leading-tight text-white/55">{label}</span>
        </Link>
    );
    return (
        <div className="welcome-in card p-4" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold leading-snug">
                    {thisWeek >= profile.daysPerWeek ? t('today.weekDone') : t('today.title', { done: thisWeek, target: profile.daysPerWeek })}
                </h2>
                <Link to="/actividad" className="shrink-0 text-xs font-semibold text-brand">{t('home.seeAll')}</Link>
            </div>
            <WeekStrip trained={trained} />
            <div className="mt-4 grid grid-cols-4 gap-1 border-t border-line pt-4">
                {tile('/nutricion', (
                    <MiniRing pct={targets ? eaten.kcal / targets.kcal : 0} color={left !== null && left < 0 ? 'stroke-red-400' : 'stroke-brand'}>
                        {left === null ? fmtNumber(eaten.kcal) : fmtNumber(Math.abs(left))}
                    </MiniRing>
                ), left === null ? t('nutrition.heroEaten') : left < 0 ? t('nutrition.kcalOver') : t('nutrition.heroLeft'))}
                {tile('/nutricion', (
                    <MiniRing pct={targets ? eaten.protein / targets.protein : 0} color="stroke-sky-400">{fmtNumber(eaten.protein)}g</MiniRing>
                ), t('macro.protein'))}
                {tile('/nutricion', (
                    <MiniRing pct={waterDrunk / waterTarget} color="stroke-cyan-400">{(waterDrunk / 1000).toLocaleString(locale(), { maximumFractionDigits: 1 })}L</MiniRing>
                ), t('water.title'))}
                {tile('/movimiento', (
                    <MiniRing pct={steps / stepGoal} color="stroke-emerald-400">{steps >= 10_000 ? `${Math.floor(steps / 1000)}k` : fmtNumber(steps)}</MiniRing>
                ), t('home.heroSteps'))}
            </div>
            {challenge?.st && (
                <Link to="/retos" className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm hover:bg-amber-400/15">
                    <Trophy size={16} className="shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate font-medium">{challengeName(challenge.j.id)} · {t('challenges.progress', { n: challenge.st.progress, target: challenge.st.target })}</span>
                    <ChevronRight size={16} className="shrink-0 text-white/40" />
                </Link>
            )}
        </div>
    );
};

// People starting out: the guide that explains how training works.
const BeginnerCard = () => (
    <Link to="/aprende/empezar" className="card flex items-center gap-3 border-brand/30 p-4 hover:bg-ink-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-snow"><GraduationCap size={22} /></span>
        <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('home.beginnerTitle')}</span>
            <span className="block text-sm text-white/55">{t('home.beginnerHint')}</span>
        </span>
        <ChevronRight className="shrink-0 text-white/40" />
    </Link>
);

// The first week: four small steps (lib/welcome.ts), each one a tap away.
const WELCOME_LINKS = { workout: '/rutinas', meal: '/nutricion', water: '/nutricion', three: '/rutinas' } as const;
const WelcomeCard = ({ startedAt }: { startedAt: string }) => {
    const sessions = useStore(s => s.sessions);
    const meals = useStore(s => s.meals);
    const water = useStore(s => s.water);
    const status = useMemo(() => welcomeStatus({ sessions, meals, water }, startedAt), [sessions, meals, water, startedAt]);
    if (status.daysLeft === 0) return null;
    const all = status.count === WELCOME_STEPS.length;
    return (
        <Section>
            <div className="card border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-brand/10 p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-brand text-snow">{all ? <PartyPopper size={22} /> : <Trophy size={22} />}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t('welcome.title')}</span>
                        <span className="block text-sm text-white/60">{all ? t('welcome.done') : tp('welcome.hint', status.daysLeft, { done: status.count, total: WELCOME_STEPS.length })}</span>
                    </span>
                </div>
                {!all && (
                    <ul className="mt-3 space-y-1.5">
                        {WELCOME_STEPS.map(step => (
                            <li key={step}>
                                <Link to={WELCOME_LINKS[step]} className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-ink-3">
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${status.done[step] ? 'bg-good text-snow' : 'border-2 border-white/30'}`}>
                                        {status.done[step] && <Check size={13} strokeWidth={3} />}
                                    </span>
                                    <span className={status.done[step] ? 'text-white/45 line-through' : 'font-medium'}>{t(`welcome.step.${step}`)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Section>
    );
};

// December 1–25: today's 10-minute mini workout and the "25 days to
// Christmas" challenge (lib/challenges.ts, data/travel.ts).
const AdventCard = ({ onStart }: { onStart: (routine: Routine) => void }) => {
    const sessions = useStore(s => s.sessions);
    const cardio = useStore(s => s.cardio);
    const steps = useStore(s => s.steps);
    const activeDays = useStore(s => s.activeDays);
    const mine = useStore(s => s.challenges?.find(c => c.id === 'advent'));
    const now = new Date();
    if (now.getMonth() !== 11 || now.getDate() > 25) return null;
    const day = now.getDate();
    const workout = adventWorkout(day);
    const routine = travelRoutine(workout);
    const today = localDay(now);
    const doneToday = sessions.some(x => isAdventKey(x.dayKey) && localDay(new Date(x.startedAt)) === today);
    const status = mine ? challengeStatus(mine, { sessions, cardio, steps, activeDays }, now) : null;
    return (
        <Section>
            <div className="card overflow-hidden border-emerald-400/40 bg-gradient-to-br from-emerald-600/25 via-ink-2 to-rose-600/20 p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-rose-500 text-2xl" aria-hidden>🎄</span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t('advent.title')}</span>
                        <span className="block text-sm text-white/60">{t('advent.day', { n: day })} · {routineName(routine)} · {workout.minutes} min</span>
                    </span>
                </div>
                {doneToday ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-good"><Check size={16} strokeWidth={3} /> {t('advent.doneToday')}</p>
                ) : (
                    <button onClick={() => onStart(routine)} className="btn-primary mt-3 w-full"><Play size={18} fill="currentColor" /> {t('advent.start')}</button>
                )}
                {status ? (
                    <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-white/60">
                            <span>{t('challenges.progress', { n: status.progress, target: status.target })}</span>
                            {status.state === 'done' && <span className="font-semibold text-amber-300">{t('challenges.done')}</span>}
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-4">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" style={{ width: `${Math.round((status.progress / status.target) * 100)}%` }} />
                        </div>
                    </div>
                ) : (
                    <Link to="/retos" className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold text-emerald-300">{t('advent.join')} <ChevronRight size={16} /></Link>
                )}
            </div>
        </Section>
    );
};

// The Premium personal trainer: shown to everyone, unlocked with Premium.
const TrainerCard = ({ premium }: { premium: boolean }) => (
    <Link to="/entrenador" className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-snow shadow-lg shadow-violet-600/25 active:scale-[0.99]">
        <Photo photo={namedCover('espalda-5')} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-violet-700/95 via-indigo-600/80 to-indigo-600/30" />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-snow/15 backdrop-blur"><Bot size={22} /></span>
        <span className="relative min-w-0 flex-1">
            <span className="flex items-center gap-2 font-bold">
                {t('trainer.title')}
                {!premium && <span className="flex items-center gap-1 rounded-full bg-snow px-2 py-0.5 text-[11px] font-bold text-violet-700"><Gift size={11} /> {t('trainer.tryFree')}</span>}
            </span>
            <span className="block text-sm text-snow/85">{t('trainer.homeHint')}</span>
        </span>
        <ChevronRight className="relative shrink-0" />
    </Link>
);

// Shown once after a completed week moved the plan on.
const PlanUpdateCard = ({ update }: { update: PlanUpdate }) => (
    <div className="welcome-in rounded-2xl border border-good/30 bg-gradient-to-br from-good/15 to-transparent p-4">
        <p className="flex items-center gap-2 font-bold"><PartyPopper size={18} className="text-good" /> {t('plan.updated.title')}</p>
        <p className="mt-1 text-sm text-white/75">{t('plan.updated.body', { week: update.week, phase: t(`plan.phase.${weekPhase(update.week)}`) })}</p>
        <p className="mt-1 text-sm text-white/60">{t(`plan.phaseHint.${weekPhase(update.week)}`)}</p>
        {update.swaps.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
                {update.swaps.slice(0, 4).map((sw, i) => (
                    <li key={i} className="flex items-center gap-2 text-white/80">
                        <ArrowRight size={14} className="shrink-0 text-good" /> <span className="truncate">{exerciseName(sw.from)} → <b>{exerciseName(sw.to)}</b></span>
                    </li>
                ))}
                {update.swaps.length > 4 && <li className="text-xs text-white/50">{tp('plan.updated.more', update.swaps.length - 4)}</li>}
            </ul>
        )}
        <div className="mt-3 flex gap-2">
            <Link to="/rutinas" onClick={() => actions.dismissPlanUpdate()} className="btn-primary flex-1 py-2">{t('plan.updated.see')}</Link>
            <button onClick={() => actions.dismissPlanUpdate()} className="btn-ghost py-2">{t('plan.updated.ok')}</button>
        </div>
    </div>
);

// For free users: what Premium unlocks, one tap away.
const PremiumBanner = () => (
    <Link to="/premium" className="welcome-in flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-amber-600 p-4 text-snow shadow-lg shadow-brand/25 transition active:scale-[0.99]" style={{ animationDelay: '60ms' }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15"><Crown size={22} /></span>
        <span className="min-w-0 flex-1">
            <span className="block font-bold">Fitness Life Premium</span>
            <span className="block text-sm text-snow/90">{t('home.premium', { price: fallbackPlan('annual').perMonth })}</span>
        </span>
        <ChevronRight className="shrink-0" />
    </Link>
);

export default function Today() {
    const { profile, plan, routines, sessions, active } = useStore();
    const navigate = useNavigate();
    const premium = usePremiumActive();
    const week = useMemo(() => sessionsThisWeek(sessions), [sessions]);
    const activity = useStreak();
    if (!profile) return null;

    const next = plan ? routines.find(r => r.id === plan.routineIds[plan.nextIndex]) : undefined;
    const thisWeek = week.length;
    const trainedDays = new Set(week.map(s => (new Date(s.startedAt).getDay() + 6) % 7));
    const streak = streakWeeks(sessions);
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);

    const start = async (routineId: string | null, given?: Routine) => {
        if (active && (active.routineId === routineId || !(await confirm({ title: t('active.confirm.title'), message: t('active.confirm.message'), confirmLabel: t('active.confirm.start'), danger: true })))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(routineId, given);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <header className="bleed-top relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-brand via-orange-500 to-rose-500 px-4 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] text-snow shadow-lg shadow-brand/25">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-snow/15 blur-2xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-amber-300/30 blur-2xl" />
                <div className="relative flex items-center gap-3">
                    <Link to="/ajustes" aria-label={t('profile.changePhoto')} className="shrink-0 rounded-full ring-2 ring-snow/80">
                        <Avatar src={profile.avatar} name={profile.name} size={46} />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-snow/80">{now.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <h1 className="truncate text-2xl font-extrabold tracking-tight">{greeting()}{profile.name ? `, ${profile.name}` : ''}</h1>
                    </div>
                    <Link to="/actividad" className="flex items-center gap-1 rounded-full bg-snow/20 px-3 py-1.5 text-sm font-bold backdrop-blur"
                        aria-label={`${t('activity.streak')}: ${tp('activity.days', activity.activeStreak)}`}>
                        <Flame size={16} className={activity.activeStreak > 1 ? 'fill-amber-300 text-amber-300' : ''} /> {activity.activeStreak}
                    </Link>
                </div>
                <div className="relative mt-4 grid grid-cols-3 gap-2">
                    <HeroStat value={`${Math.min(thisWeek, profile.daysPerWeek)}/${profile.daysPerWeek}`} label={t('home.heroWeek')} />
                    <HeroStat value={fmtNumber(streak)} label={t('progress.heroStreak')} />
                    <HeroStat value={fmtNumber(sessions.length)} label={t('home.heroTotal')} />
                </div>
            </header>

            {currentPause(profile) && <Section><PauseBanner /></Section>}

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

            {plan?.update && !plan.update.seen && <Section><PlanUpdateCard update={plan.update} /></Section>}

            <AdventCard onStart={r => void start(r.id, r)} />

            {profile.createdAt && <WelcomeCard startedAt={profile.createdAt} />}

            {premium && <Section><PremiumKeepCard /></Section>}

            <Section title={t('home.today')}>
                <DayCard trained={trainedDays} thisWeek={thisWeek} />
            </Section>

            {profile.level === 'principiante' && sessions.length < 6 && <Section><BeginnerCard /></Section>}

            <Section><TrainerCard premium={premium} /></Section>

            {/* One promotion at a time. Premium waits until they have trained twice
                (value first), then takes turns with the shop. */}
            <Section>{!premium && sessions.length >= 2 && dayOfYear % 2 === 0 ? <PremiumBanner /> : <ShopCard />}</Section>
        </div>
    );
}
