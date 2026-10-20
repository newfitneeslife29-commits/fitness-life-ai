import { Check, ChevronDown, Clock3, Dumbbell, Flame, HelpCircle, List, Mic, MicOff, Minus, Play, Plus, SkipForward, Target, Trophy, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { routineCover } from '../data/covers';
import { exerciseMotion } from '../data/motion';
import { exerciseName, exercisePhotos, exerciseTip, getExercise, muscleLabel, type Muscle } from '../data/exercises';
import { t, type Key } from '../i18n';
import { fmtClock, fmtNumber, fmtRange, fmtRest, fmtVolume, fmtWeight, parseDecimal, typedNumber } from '../lib/format';
import { haptic, primeSound, restOver, restTick } from '../lib/native';
import { sessionName } from '../lib/names';
import { displayToKg, kgToDisplay, stepForUnit } from '../lib/progression';
import { useNow } from '../lib/useNow';
import { useRestCountdown } from '../lib/useRest';
import { speak, voiceAvailable } from '../lib/voice';
import { handsFreeSupported, useHandsFree, type HandsFreeState, type VoiceCommand } from '../lib/voiceCommands';
import { toast } from './feedback';
import { usePremiumActive } from '../lib/premium';
import { useNavigate } from 'react-router-dom';
import { isBurnWorkout, planExercise } from '../lib/workout';
import { actions, useStore } from '../store/store';
import type { ActiveWorkout, Unit } from '../store/types';
import { ActiveClock } from './ActiveClock';
import { MusicButton } from './MusicSheet';
import { InjuryNote } from './PauseCard';
import { HoldTimer } from './HoldTimer';
import { Sheet } from './ui';
import { UnitToggle } from './UnitToggle';

// The guided workout: a cover of the session, a "get ready" countdown before
// each exercise, the exercise full screen with big controls, a full-screen
// rest that shows what comes next, and a finish line. Same data as the list
// view: switching between them never loses anything.

const READY_SEC = 10;
const TIPS: Key[] = ['guided.tip1', 'guided.tip2', 'guided.tip3', 'guided.tip4', 'guided.tip5'];

// The animated demo when there is one; otherwise the start and end photos
// crossfading, slowly zooming: the movement at a glance.
const Motion = ({ id, className = '' }: { id: string; className?: string }) => {
    const video = exerciseMotion(id);
    const photos = exercisePhotos(id);
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        if (video) return;
        const timer = window.setInterval(() => setFrame(f => 1 - f), 1100);
        return () => window.clearInterval(timer);
    }, [video]);
    if (video) {
        return (
            <div role="img" aria-label={t('demo.alt', { name: exerciseName(id) })} className={`overflow-hidden bg-snow ${className}`}>
                <video src={video} poster={photos?.[1]} autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-contain" />
            </div>
        );
    }
    if (!photos) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-brand/30 via-ink-2 to-ink ${className}`}>
                <Dumbbell size={72} className="text-white/30" />
            </div>
        );
    }
    return (
        <div role="img" aria-label={t('demo.alt', { name: exerciseName(id) })} className={`overflow-hidden bg-snow ${className}`}>
            {photos.map((src, i) => (
                <img key={src} src={src} alt="" decoding="async"
                    className={`absolute inset-0 h-full w-full animate-kenburns object-cover transition-opacity duration-700 ${frame === i ? 'opacity-100' : 'opacity-0'}`} />
            ))}
        </div>
    );
};

const RoundButton = ({ label, onClick, children, tone = 'glass' }: { label: string; onClick: () => void; children: ReactNode; tone?: 'glass' | 'ink' }) => (
    <button onClick={onClick} aria-label={label}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 ${tone === 'glass' ? 'bg-black/35 text-snow backdrop-blur-md hover:bg-black/50' : 'bg-ink-3 text-white hover:bg-ink-4'}`}>
        {children}
    </button>
);

// One segment per exercise, filled by its sets done.
const Segments = ({ active, current }: { active: ActiveWorkout; current: number }) => (
    <div className="flex gap-1" aria-hidden>
        {active.exercises.map((e, i) => {
            const share = e.sets.length ? e.sets.filter(s => s.done).length / e.sets.length : 0;
            return (
                <div key={i} className={`h-1 flex-1 overflow-hidden rounded-full ${i === current ? 'bg-white/45' : 'bg-white/25'}`}>
                    <div className={`h-full rounded-full transition-[width] duration-500 ${share === 1 ? 'bg-good' : 'bg-white'}`} style={{ width: `${share * 100}%` }} />
                </div>
            );
        })}
    </div>
);

// A big number to tap and type, with − / + on each side.
const BigNumber = ({ value, onCommit, label, decimals }: { value: number; onCommit: (n: number) => void; label: string; decimals: boolean }) => {
    const [text, setText] = useState(typedNumber(value));
    const focused = useRef(false);
    useEffect(() => {
        if (!focused.current) setText(typedNumber(value));
    }, [value]);
    return (
        <input aria-label={label} inputMode={decimals ? 'decimal' : 'numeric'} value={text}
            onFocus={e => { focused.current = true; e.currentTarget.select(); }}
            onChange={e => {
                setText(e.target.value);
                const n = parseDecimal(e.target.value);
                if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n);
            }}
            onBlur={() => { focused.current = false; setText(typedNumber(value)); }}
            style={{ fontSize: text.length > 4 ? '1.75rem' : text.length > 3 ? '2.1rem' : '2.6rem' }}
            className="h-12 w-full bg-transparent text-center font-black leading-none tabular-nums outline-none" />
    );
};

const Dial = ({ title, unitLabel, minusLabel, plusLabel, onMinus, onPlus, children }: {
    title: string; unitLabel: string; minusLabel: string; plusLabel: string; onMinus: () => void; onPlus: () => void; children: ReactNode;
}) => (
    <div className="min-w-0 flex-1 rounded-3xl border border-line bg-ink-2 px-2 pb-2.5 pt-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">{title}</p>
        <div className="mt-1 flex items-center gap-1">
            <button onClick={() => { haptic('tap'); onMinus(); }} aria-label={minusLabel} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-3 active:scale-90"><Minus size={18} /></button>
            <div className="min-w-0 flex-1">{children}</div>
            <button onClick={() => { haptic('tap'); onPlus(); }} aria-label={plusLabel} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-3 active:scale-90"><Plus size={18} /></button>
        </div>
        <p className="mt-0.5 text-xs font-semibold text-white/50">{unitLabel}</p>
    </div>
);

const estimateMinutes = (active: ActiveWorkout) => {
    const sec = active.exercises.reduce((sum, e) => sum + e.sets.length * ((getExercise(e.exerciseId)?.timed ? e.repMax : 40) + e.restSec), 0);
    return Math.max(5, Math.round(sec / 60 / 5) * 5);
};

const focusArea = (active: ActiveWorkout) => {
    const count = new Map<Muscle, number>();
    for (const e of active.exercises) {
        const m = getExercise(e.exerciseId)?.muscle;
        if (m) count.set(m, (count.get(m) ?? 0) + 1);
    }
    return [...count].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => muscleLabel(m)).join(' · ');
};

// The cover: what today's session is, then one big Start.
// Turns hands-free on and off; it pulses while listening.
const HandsFreeButton = ({ state }: { state: HandsFreeState }) => {
    const on = useStore(s => s.profile?.handsFree === true);
    const premium = usePremiumActive();
    const navigate = useNavigate();
    if (!handsFreeSupported()) return null;
    const toggle = () => {
        haptic('tap');
        // Premium: otherwise it opens Premium.
        if (!premium) {
            toast(t('handsFree.locked'), 3500);
            navigate('/premium');
            return;
        }
        actions.updateProfile({ handsFree: !on });
        toast(t(on ? 'handsFree.off' : 'handsFree.on'), on ? 2000 : 4500);
    };
    return (
        <button onClick={toggle} aria-label={t('handsFree.title')} aria-pressed={on} data-testid="hands-free"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition active:scale-90 ${on ? 'bg-brand text-ink' : 'bg-black/35 text-snow hover:bg-black/50'}`}>
            {on && state === 'listening' && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/50" />}
            {on ? <Mic size={19} className="relative" /> : <MicOff size={19} />}
        </button>
    );
};

const Overview = ({ active, onStart, onList, onClose, unit, handsFree }: { active: ActiveWorkout; onStart: () => void; onList: () => void; onClose: () => void; unit: Unit; handsFree: HandsFreeState }) => {
    const level = useStore(s => s.profile?.level ?? 'principiante');
    const cover = routineCover({ id: active.routineId ?? active.id, exercises: active.exercises.map(e => ({ exerciseId: e.exerciseId, sets: e.sets.length, repMin: e.repMin, repMax: e.repMax, restSec: e.restSec })) });
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink animate-fade">
            <div className="relative h-[42vh] min-h-[16rem]">
                <img src={cover.src} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: cover.position }} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-ink" />
                <div className="relative mx-auto flex max-w-lg items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] text-snow">
                    <RoundButton label={t('workout.back')} onClick={onClose}><ChevronDown size={22} /></RoundButton>
                    <p className="truncate px-2 text-sm font-extrabold uppercase tracking-[0.18em]">{sessionName(active)}</p>
                    <span className="flex gap-2">
                        <HandsFreeButton state={handsFree} />
                        <MusicButton className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-snow backdrop-blur-md transition hover:bg-black/50 active:scale-90" />
                        <RoundButton label={t('guided.listView')} onClick={onList}><List size={20} /></RoundButton>
                    </span>
                </div>
            </div>
            <div className="relative mx-auto -mt-10 max-w-lg rounded-t-[2rem] bg-ink px-5 pb-40 pt-6">
                <h1 className="text-[2rem] font-black leading-tight tracking-tight">{sessionName(active)}</h1>
                <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-ink-2 py-3">
                    <div className="px-3"><dd className="truncate font-bold">{t(`level.${level}`)}</dd><dt className="text-xs text-white/50">{t('guided.level')}</dt></div>
                    <div className="px-3"><dd className="truncate font-bold">{t('guided.minutes', { n: estimateMinutes(active) })}</dd><dt className="text-xs text-white/50">{t('workout.time')}</dt></div>
                    <div className="px-3"><dd className="line-clamp-2 text-sm font-bold leading-tight">{focusArea(active) || '—'}</dd><dt className="text-xs text-white/50">{t('guided.focus')}</dt></div>
                </dl>
                {active.injury && <InjuryNote injury={active.injury} className="mt-4" />}
                <h2 className="mb-2 mt-7 text-xl font-extrabold">{t('guided.exercises')} <span className="font-medium text-white/45">({active.exercises.length})</span></h2>
                <ol className="divide-y divide-line">
                    {active.exercises.map((e, i) => {
                        const photo = exercisePhotos(e.exerciseId)?.[1];
                        const timed = getExercise(e.exerciseId)?.timed;
                        return (
                            <li key={`${e.exerciseId}-${i}`} className="flex items-center gap-4 py-3">
                                <span className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-snow">
                                    {photo ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Dumbbell className="m-auto mt-5 text-ink/30" size={30} />}
                                    <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-snow">{i + 1}</span>
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[17px] font-semibold leading-snug">{exerciseName(e.exerciseId)}</span>
                                    <span className="text-sm tabular-nums text-white/55">
                                        {e.sets.length} × {fmtRange(e.repMin, e.repMax)}{timed ? ' s' : ''} · {t('workout.rest')} {fmtRest(e.restSec)}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/90 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
                <div className="mx-auto flex max-w-lg items-center gap-3">
                    <UnitToggle unit={unit} />
                    <button onClick={onStart} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-amber-500 text-lg font-extrabold text-ink shadow-lg shadow-brand/30 transition active:scale-[0.98]">
                        <Play size={20} fill="currentColor" /> {t('guided.start')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// "Get ready": 10 seconds, the last three beep, then the exercise starts.
const Ready = ({ id, index, total, onGo }: { id: string; index: number; total: number; onGo: () => void }) => {
    const sound = useStore(s => s.profile?.restSound !== false);
    const voiceOn = useStore(s => s.profile?.voice !== false) && voiceAvailable();
    const [endsAt] = useState(() => Date.now() + READY_SEC * 1000);
    const now = useNow(true, 200);
    const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
    const said = useRef<number | null>(null);
    useEffect(() => {
        if (voiceOn) void speak(`${t('guided.ready')} ${exerciseName(id)}`);
    }, []);
    useEffect(() => {
        if (said.current === left) return;
        said.current = left;
        if (left === 0) { restOver(sound); onGo(); } else if (left <= 3) restTick(sound, true);
    }, [left]);
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-snow animate-fade">
            <Motion id={id} className="absolute inset-0" />
            <div className="absolute inset-0 bg-black/55" />
            <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="text-3xl font-black uppercase tracking-[0.12em]">{t('guided.ready')}</p>
                <p key={left} className="mt-2 animate-pop text-[9rem] font-black leading-none tabular-nums drop-shadow-xl" aria-live="polite">{left}</p>
                <p className="mt-6 text-lg text-snow/80">{t('workout.exerciseOf', { n: index + 1, total })}</p>
                <p className="mt-1 text-3xl font-extrabold leading-tight">{exerciseName(id)}</p>
            </div>
            <div className="relative px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                <button onClick={onGo} className="mx-auto block h-14 w-full max-w-xs rounded-full bg-snow text-lg font-extrabold text-ink shadow-xl active:scale-[0.98]">{t('guided.goNow')}</button>
            </div>
        </div>
    );
};

const Rest = ({ active, endsAt, total, nextIndex, onList, unit, burn }: { active: ActiveWorkout; endsAt: number; total: number; nextIndex: number; onList: () => void; unit: Unit; burn: boolean }) => {
    const { left, finished, ending } = useRestCountdown(endsAt);
    const voiceOn = useStore(s => s.profile?.voice !== false) && voiceAvailable();
    const next = active.exercises[nextIndex];
    const nextSet = next?.sets.findIndex(s => !s.done) ?? -1;
    const set = next?.sets[nextSet];
    const done = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const timed = next ? getExercise(next.exerciseId)?.timed : false;
    useEffect(() => {
        if (voiceOn && next) void speak(t('guided.restVoice', { name: exerciseName(next.exerciseId) }));
    }, []);
    return (
        <div role="timer" aria-live="polite" className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-brand via-orange-600 to-rose-600 text-snow animate-fade">
            <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold tabular-nums">{t('workout.progress', { done, total: active.exercises.reduce((n, e) => n + e.sets.length, 0) })}</span>
                <RoundButton label={t('guided.listView')} onClick={onList}><List size={20} /></RoundButton>
            </div>
            <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 pt-4 text-center">
                {burn && <div className="mb-3"><ActiveClock active={active} tone="light" /></div>}
                <p className="text-lg font-black uppercase tracking-[0.35em]">{finished ? t('rest.done') : t('rest.title')}</p>
                <p className={`mt-1 text-[5.5rem] font-black leading-none tabular-nums ${ending ? 'animate-pulse' : ''}`}>{fmtClock(left)}</p>
                <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-snow transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
                </div>
                <div className="mt-5 flex w-full max-w-xs gap-3">
                    <button onClick={() => actions.adjustRest(20)} className="h-12 flex-1 rounded-full bg-white/20 text-lg font-extrabold backdrop-blur active:scale-95">+20 s</button>
                    <button onClick={() => actions.skipRest()} className="h-12 flex-1 rounded-full bg-snow text-lg font-extrabold text-brand-strong shadow-lg active:scale-95">{t('rest.skip')}</button>
                </div>
                <p className="mt-5 text-sm italic text-snow/85">“{t(TIPS[done % TIPS.length])}”</p>
            </div>
            {next && set && (
                <>
                    <div className="mx-auto mt-auto flex w-full max-w-lg items-end justify-between gap-3 px-6 pb-3">
                        <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-snow/80">{nextSet > 0 ? t('rest.next') : t('guided.next', { n: nextIndex + 1, total: active.exercises.length })}</p>
                            <p className="truncate text-2xl font-extrabold">{exerciseName(next.exerciseId)}</p>
                            <p className="text-sm text-snow/80">{t('guided.setOf', { n: nextSet + 1, total: next.sets.length })}</p>
                        </div>
                        <p className="shrink-0 text-right">
                            <span className="block text-3xl font-black tabular-nums">×{set.reps}{timed ? ' s' : ''}</span>
                            {set.weightKg > 0 && <span className="text-sm font-semibold tabular-nums text-snow/85">{fmtWeight(set.weightKg, unit)}</span>}
                        </p>
                    </div>
                    <div className="relative mx-auto h-[34vh] w-full max-w-lg overflow-hidden rounded-t-[2rem] bg-snow">
                        <Motion id={next.exerciseId} className="absolute inset-0" />
                    </div>
                </>
            )}
        </div>
    );
};

const Done = ({ active, onFinish, onList, unit }: { active: ActiveWorkout; onFinish: () => void; onList: () => void; unit: Unit }) => {
    const now = useNow(true, 1000);
    const sets = active.exercises.flatMap(e => e.sets).filter(s => s.done);
    const volume = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
    useEffect(() => {
        haptic('success');
        if (active.restEndsAt) actions.skipRest();
    }, []);
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink px-6 text-center animate-fade">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgb(var(--brand)/0.35),transparent_60%)]" />
            <span className="relative flex h-28 w-28 animate-pop items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-brand to-rose-500 text-snow shadow-2xl shadow-brand/40">
                <Trophy size={52} />
            </span>
            <h1 className="relative mt-6 text-3xl font-black">{t('guided.doneTitle')}</h1>
            <p className="relative mt-2 text-white/65">{t('guided.doneText')}</p>
            <div className="relative mt-6 grid w-full max-w-sm grid-cols-3 gap-2">
                {[
                    { icon: <Clock3 size={16} />, label: t('workout.time'), value: fmtClock((now - Date.parse(active.startedAt)) / 1000) },
                    { icon: <Dumbbell size={16} />, label: t('workout.volume'), value: fmtVolume(volume, unit) },
                    { icon: <Flame size={16} />, label: t('workout.sets'), value: String(sets.length) },
                ].map(s => (
                    <div key={s.label} className="rounded-2xl border border-line bg-ink-2 px-2 py-3">
                        <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/45">{s.icon}{s.label}</p>
                        <p className="mt-1 truncate text-lg font-extrabold tabular-nums">{s.value}</p>
                    </div>
                ))}
            </div>
            <button onClick={onFinish} className="relative mt-8 h-14 w-full max-w-sm rounded-full bg-gradient-to-r from-brand to-amber-500 text-lg font-extrabold text-ink shadow-lg shadow-brand/30 active:scale-[0.98]">
                {t('guided.save')}
            </button>
            <button onClick={onList} className="relative mt-3 text-sm font-semibold text-white/60 underline">{t('guided.listView')}</button>
        </div>
    );
};

export const GuidedWorkout = ({ active, unit, onFinish, onList, onClose }: { active: ActiveWorkout; unit: Unit; onFinish: () => void; onList: () => void; onClose: () => void }) => {
    const sessions = useStore(s => s.sessions);
    const sound = useStore(s => s.profile?.restSound !== false);
    const goal = useStore(s => s.profile?.goal);
    const burn = isBurnWorkout(active, goal);
    const now = useNow(true, 1000);
    const doneCount = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const [started, setStarted] = useState(doneCount > 0);
    const [skipped, setSkipped] = useState<number[]>([]);
    // Exercises already introduced with "get ready".
    const [introduced, setIntroduced] = useState<number[]>([]);
    const [howTo, setHowTo] = useState(false);

    const current = active.exercises.findIndex((e, i) => !skipped.includes(i) && e.sets.some(s => !s.done));
    const ex = current >= 0 ? active.exercises[current] : null;
    const setIndex = ex ? ex.sets.findIndex(s => !s.done) : -1;
    const set = ex?.sets[setIndex];
    const info = ex ? getExercise(ex.exerciseId) : undefined;

    // Hands-free: what each word does on the screen showing now.
    const screen = !started ? 'overview' : !ex || !set ? 'done' : active.restEndsAt ? 'rest' : setIndex === 0 && !introduced.includes(current) ? 'ready' : 'exercise';
    const premium = usePremiumActive();
    const handsFreeOn = useStore(s => s.profile?.handsFree === true) && premium;
    const handsFree = useHandsFree(handsFreeOn, (c: VoiceCommand) => {
        const did = (label: Key) => { haptic('tap'); toast(`🎙 ${t(label)}`, 1200); };
        if (screen === 'overview' && (c === 'done' || c === 'next')) { primeSound(); setStarted(true); did('handsFree.cmd.start'); }
        else if (screen === 'ready' && (c === 'done' || c === 'next')) { setIntroduced(list => [...list, current]); did('handsFree.cmd.start'); }
        else if (screen === 'exercise' && c === 'done' && !info?.timed) { primeSound(); actions.toggleSet(current, setIndex); did('handsFree.cmd.done'); }
        else if (screen === 'exercise' && c === 'next') { setSkipped(s => [...s, current]); did('handsFree.cmd.next'); }
        else if (screen === 'rest' && (c === 'done' || c === 'next')) { actions.skipRest(); did('handsFree.cmd.next'); }
        else if (screen === 'rest' && c === 'more') { actions.adjustRest(20); did('handsFree.cmd.more'); }
        else if (screen === 'done' && c === 'save') { did('handsFree.cmd.save'); onFinish(); }
    });
    useEffect(() => {
        if (handsFree === 'denied') toast(t('handsFree.denied'), 4500);
        if (handsFree === 'unavailable') toast(t('handsFree.unavailable'), 4500);
        if (handsFree === 'denied' || handsFree === 'unavailable') actions.updateProfile({ handsFree: false });
    }, [handsFree]);

    if (!started) return <Overview active={active} unit={unit} handsFree={handsFree} onClose={onClose} onList={onList} onStart={() => { primeSound(); haptic('tap'); setStarted(true); }} />;
    if (!ex || !set) return <Done active={active} unit={unit} onFinish={onFinish} onList={onList} />;
    if (active.restEndsAt) return <Rest active={active} endsAt={active.restEndsAt} total={active.restTotalSec} nextIndex={current} onList={onList} unit={unit} burn={burn} />;
    // A new exercise starts with "get ready" (not between its sets).
    if (setIndex === 0 && !introduced.includes(current)) {
        return <Ready key={current} id={ex.exerciseId} index={current} total={active.exercises.length} onGo={() => setIntroduced(list => [...list, current])} />;
    }

    const { suggestion, previous } = planExercise(sessions, ex, unit);
    const prev = previous[setIndex];
    const lastTop = previous.length ? Math.max(...previous.map(p => p.weightKg)) : 0;
    const goUp = suggestion && suggestion.increased && suggestion.weightKg > lastTop;
    const plateKg = info?.equipment === 'peso corporal' ? 1 : info?.equipment === 'mancuernas' ? 2 : 2.5;
    const stepKg = stepForUnit(plateKg, unit);
    const n = setIndex + 1;
    const complete = () => {
        haptic('success');
        primeSound();
        actions.toggleSet(current, setIndex);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink animate-fade">
            <div className="relative min-h-[34vh] flex-1">
                <Motion id={ex.exerciseId} className="absolute inset-0" />
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[calc(0.6rem+env(safe-area-inset-top))] text-snow">
                    <div className="mx-auto max-w-lg">
                        <Segments active={active} current={current} />
                        <div className="mt-3 flex items-start justify-between gap-2">
                            <RoundButton label={t('workout.back')} onClick={onClose}><ChevronDown size={22} /></RoundButton>
                            <div className="min-w-0 text-center">
                                <p className="truncate text-sm font-extrabold">{t('workout.exerciseOf', { n: current + 1, total: active.exercises.length })}</p>
                                {burn
                                    ? <div className="mt-1.5"><ActiveClock active={active} tone="light" /></div>
                                    : <p className="text-xs font-semibold tabular-nums text-snow/75">{fmtClock((now - Date.parse(active.startedAt)) / 1000)}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                                <RoundButton label={t('guided.listView')} onClick={onList}><List size={20} /></RoundButton>
                                <RoundButton label={t('settings.restSound')} onClick={() => actions.updateProfile({ restSound: !sound })}>
                                    {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
                                </RoundButton>
                                <HandsFreeButton state={handsFree} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink to-transparent" />
            </div>

            <section aria-label={exerciseName(ex.exerciseId)} className="relative z-10 -mt-7 rounded-t-[2rem] bg-ink px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
                <div className="mx-auto max-w-lg">
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="truncate text-2xl font-extrabold">{exerciseName(ex.exerciseId)}</h1>
                        {info && <button onClick={() => setHowTo(true)} aria-label={t('workout.howTo')} className="shrink-0 text-white/50 hover:text-white"><HelpCircle size={22} /></button>}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                        {ex.sets.map((s, j) => (
                            <span key={s.id} className={`h-2 rounded-full transition-all ${s.done ? 'w-2 bg-good' : j === setIndex ? 'w-6 bg-brand' : 'w-2 bg-ink-4'}`} />
                        ))}
                        <span className="ml-1.5 text-sm font-semibold text-white/60">{t('guided.setOf', { n, total: ex.sets.length })}</span>
                    </div>
                    <p className={`mt-2 text-balance text-center text-sm ${goUp ? 'font-semibold text-good' : 'text-white/60'}`}>
                        {goUp ? <TrendingUp size={15} className="mr-1 inline align-[-2px]" /> : <Target size={15} className="mr-1 inline align-[-2px] text-brand" />}
                        {suggestion
                            ? goUp ? t('workout.goUp', { weight: fmtWeight(suggestion.weightKg, unit), reps: suggestion.reps, diff: fmtWeight(suggestion.weightKg - lastTop, unit) })
                                : `${t('workout.target')}: ${suggestion.weightKg > 0 ? `${fmtWeight(suggestion.weightKg, unit)} × ` : ''}${suggestion.reps}${info?.timed ? ' s' : ` ${t('unit.reps')}`}`
                            : prev ? t('guided.lastTime', { value: `${prev.weightKg > 0 ? `${fmtNumber(kgToDisplay(prev.weightKg, unit))} × ` : ''}${prev.reps}` }) : t('guided.firstTime')}
                    </p>

                    {info?.timed ? (
                        <div className="mt-3">
                            <HoldTimer key={`${current}-${setIndex}`} auto={burn} target={set.reps || ex.repMin} onDone={sec => {
                                actions.setValue(current, setIndex, 'reps', sec);
                                complete();
                            }} />
                        </div>
                    ) : (
                        <div className="mt-4 flex gap-2.5">
                            <Dial title={t('guided.weight')} unitLabel={unit === 'kg' ? 'kg' : 'lb'}
                                minusLabel={t('workout.weightDown', { n })} plusLabel={t('workout.weightUp', { n })}
                                onMinus={() => actions.setValue(current, setIndex, 'weightKg', Math.max(0, set.weightKg - stepKg))}
                                onPlus={() => actions.setValue(current, setIndex, 'weightKg', set.weightKg + stepKg)}>
                                <BigNumber label={t('workout.weightOf', { n })} decimals value={kgToDisplay(set.weightKg, unit)}
                                    onCommit={v => actions.setValue(current, setIndex, 'weightKg', displayToKg(v, unit))} />
                            </Dial>
                            <Dial title={t('guided.reps')} unitLabel={`${t('unit.reps')} · ${fmtRange(ex.repMin, ex.repMax)}`}
                                minusLabel={t('workout.repsDown', { n })} plusLabel={t('workout.repsUp', { n })}
                                onMinus={() => actions.setValue(current, setIndex, 'reps', Math.max(0, set.reps - 1))}
                                onPlus={() => actions.setValue(current, setIndex, 'reps', set.reps + 1)}>
                                <BigNumber label={t('workout.repsOf', { n })} decimals={false} value={set.reps}
                                    onCommit={v => actions.setValue(current, setIndex, 'reps', Math.round(v))} />
                            </Dial>
                        </div>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                        {!info?.timed && (
                            <button onClick={complete} className="flex h-16 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-amber-500 text-lg font-extrabold text-ink shadow-lg shadow-brand/30 transition active:scale-[0.97]">
                                <Check size={24} strokeWidth={3} /> {t('guided.setDone')}
                            </button>
                        )}
                        <button onClick={() => { haptic('tap'); setSkipped(s => [...s, current]); }} aria-label={t('guided.skipExercise')}
                            className={`flex h-16 items-center justify-center gap-2 rounded-full bg-ink-3 font-semibold text-white/80 active:scale-95 ${info?.timed ? 'flex-1' : 'w-16'}`}>
                            <SkipForward size={22} />{info?.timed && <span>{t('guided.skipExercise')}</span>}
                        </button>
                    </div>
                </div>
            </section>

            <Sheet open={howTo} onClose={() => setHowTo(false)} title={exerciseName(ex.exerciseId)}>
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl"><Motion id={ex.exerciseId} className="absolute inset-0" /></div>
                {info && <p className="mt-3 text-sm leading-relaxed text-white/80">{exerciseTip(info)}</p>}
            </Sheet>
        </div>
    );
};
