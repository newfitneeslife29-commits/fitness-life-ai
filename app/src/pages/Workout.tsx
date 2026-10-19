import { ArrowLeftRight, BookOpen, Sparkles, Check, ChevronLeft, Clock3, Copy, Disc3, Dumbbell, Minus, Plus, RefreshCw, Repeat, Target, Timer, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ActiveClock } from '../components/ActiveClock';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { GuidedWorkout } from '../components/GuidedWorkout';
import { ExercisePicker } from '../components/ExercisePicker';
import { HoldTimer } from '../components/HoldTimer';
import { OfflineNotice } from '../components/OfflineNotice';
import { confirm, toast } from '../components/feedback';
import { PlateSheet } from '../components/PlateSheet';
import { UnitToggle } from '../components/UnitToggle';
import { Sheet } from '../components/ui';
import { busyAlternatives, equipmentLabel, exerciseName, exerciseTip, getExercise, muscleLabel } from '../data/exercises';
import { t, tp } from '../i18n';
import { fmtClock, fmtNumber, fmtRange, fmtRest, fmtVolume, fmtWeight, parseDecimal, typedNumber } from '../lib/format';
import { cancelRestAlert, haptic, keepAwake, primeSound, scheduleRestAlert } from '../lib/native';
import { sessionName } from '../lib/names';
import { displayToKg, kgToDisplay, stepForUnit } from '../lib/progression';
import { useNow } from '../lib/useNow';
import { useRestCountdown } from '../lib/useRest';
import { isBurnWorkout, planExercise } from '../lib/workout';
import { actions, useStore } from '../store/store';
import type { ActiveExercise, Unit } from '../store/types';

// Numeric field that keeps what the user is typing ("62," or "") and only
// commits a parsed number, so decimals and clearing work on phone keyboards.
const NumberField = ({ value, onCommit, label, decimals, active }: { value: number; onCommit: (n: number) => void; label: string; decimals: boolean; active?: boolean }) => {
    const [text, setText] = useState(typedNumber(value));
    const focused = useRef(false);
    useEffect(() => {
        if (!focused.current) setText(typedNumber(value));
    }, [value]);
    const commit = (raw: string) => {
        const n = parseDecimal(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) onCommit(n);
    };
    return (
        <input
            aria-label={label}
            inputMode={decimals ? 'decimal' : 'numeric'}
            value={text}
            onFocus={e => { focused.current = true; e.currentTarget.select(); }}
            onChange={e => { setText(e.target.value); commit(e.target.value); }}
            onBlur={() => { focused.current = false; setText(typedNumber(value)); }}
            className={`h-11 w-full rounded-xl text-center text-lg font-bold tabular-nums outline-none transition focus:bg-ink-4 focus:ring-2 focus:ring-brand ${active ? 'bg-ink-4 ring-1 ring-white/10' : 'bg-ink-3'}`}
        />
    );
};

// Small − / + under the set being done: one tap is one plate or one rep.
const Step = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
    <button onClick={() => { haptic('tap'); onClick(); }} aria-label={label}
        className="flex h-8 flex-1 items-center justify-center rounded-lg bg-ink-3 text-xs font-semibold tabular-nums text-white/70 transition hover:bg-ink-4 hover:text-white active:scale-95">
        {children}
    </button>
);

// "Machine taken": swap to the same muscle with dumbbells, cables or bodyweight.
const BusySheet = ({ exerciseId, exclude, onClose, onPick }: { exerciseId: string; exclude: string[]; onClose: () => void; onPick: (id: string) => void }) => {
    const options = busyAlternatives(exerciseId, exclude);
    const muscle = getExercise(exerciseId)?.muscle;
    return (
        <Sheet open onClose={onClose} title={t('workout.busy.title')}>
            <p className="mb-3 text-sm text-white/60">{muscle ? t('workout.busy.hint', { muscle: muscleLabel(muscle).toLowerCase() }) : ''}</p>
            <ul className="space-y-2">
                {options.map(e => (
                    <li key={e.id}>
                        <button onClick={() => onPick(e.id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-3 p-2 text-left hover:bg-ink-4">
                            <ExerciseDemo id={e.id} name={exerciseName(e.id)} variant="thumb" />
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium">{exerciseName(e.id)}</span>
                                <span className="text-xs text-white/50">{muscleLabel(e.muscle)} · {equipmentLabel(e.equipment)}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-brand">{t('workout.busy.use')}</span>
                        </button>
                    </li>
                ))}
                {options.length === 0 && <li className="py-4 text-center text-sm text-white/50">{t('workout.busy.none')}</li>}
            </ul>
        </Sheet>
    );
};

const Pill = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-3 px-2.5 py-1 text-xs text-white/65">{icon}{children}</span>
);

const SET_GRID = 'grid grid-cols-[2rem_minmax(0,1fr)_5.25rem_4.25rem_2.75rem] items-center gap-1.5';

const ExerciseCard = ({ ex, index, unit, current, onSwap, others }: { ex: ActiveExercise; index: number; unit: Unit; current: boolean; onSwap: () => void; others: string[] }) => {
    const sessions = useStore(s => s.sessions);
    // Beginners see how each exercise is done without asking.
    const beginner = useStore(s => s.profile?.level === 'principiante' && s.sessions.length < 6);
    const info = getExercise(ex.exerciseId);
    const name = exerciseName(ex.exerciseId);
    const [howTo, setHowTo] = useState(beginner && index === 0);
    const [plates, setPlates] = useState(false);
    const [busy, setBusy] = useState(false);
    const canBeBusy = !!info && info.equipment !== 'peso corporal' && info.equipment !== 'mancuernas';
    const lastDone = [...ex.sets].reverse().find(s => s.done);
    const { suggestion, previous } = planExercise(sessions, ex, unit);
    const nextSet = ex.sets.find(s => !s.done) ?? ex.sets[ex.sets.length - 1];
    const timed = info?.timed;
    const openSet = ex.sets.findIndex(s => !s.done);
    const doneCount = ex.sets.filter(s => s.done).length;
    const complete = ex.sets.length > 0 && doneCount === ex.sets.length;
    const lastTop = previous.length ? Math.max(...previous.map(p => p.weightKg)) : 0;
    // One small plate in the user's unit: 2.5 kg / 5 lb, 2 kg dumbbells,
    // 1 kg / 2.5 lb of extra load on bodyweight moves.
    const plateKg = info?.equipment === 'peso corporal' ? 1 : info?.equipment === 'mancuernas' ? 2 : 2.5;
    const stepKg = stepForUnit(plateKg, unit);
    const stepLabel = fmtNumber(kgToDisplay(stepKg, unit));
    const goUp = suggestion && suggestion.increased && suggestion.weightKg > lastTop;

    const remove = async () => {
        const ok = await confirm({ title: t('workout.removeExercise.title', { name }), message: t('workout.removeExercise.message'), confirmLabel: t('common.remove'), danger: true });
        if (ok) actions.removeExercise(index);
    };

    return (
        <section id={`ex-${index}`} aria-label={name}
            className={`card scroll-mt-48 overflow-hidden transition ${current ? 'border-brand/50 shadow-lg shadow-brand/10' : complete ? 'border-good/30' : ''}`}>
            <div className="flex items-start gap-3 p-4 pb-3">
                <button onClick={() => setHowTo(v => !v)} aria-expanded={howTo} aria-label={t('workout.howTo')} className="relative shrink-0">
                    <ExerciseDemo id={ex.exerciseId} name={name} variant="thumb" animate />
                    <span className={`absolute -left-1.5 -top-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-bold ring-2 ring-ink-2 ${complete ? 'bg-good text-ink' : current ? 'bg-brand text-ink' : 'bg-ink-4 text-white/80'}`}>
                        {complete ? <Check size={13} strokeWidth={3.5} /> : index + 1}
                    </span>
                </button>
                <div className="min-w-0 flex-1">
                    <Link to={`/ejercicios/${ex.exerciseId}`} className="line-clamp-2 text-[17px] font-bold leading-snug hover:text-brand-strong">{name}</Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/50">
                        {info && <span>{muscleLabel(info.muscle)} · {equipmentLabel(info.equipment)}</span>}
                        {complete && <span className="rounded-full bg-good/15 px-2 py-0.5 font-semibold text-good">{t('workout.completed')}</span>}
                    </p>
                </div>
                <div className="-mr-1 -mt-1 flex shrink-0">
                    {info?.equipment === 'barra' && (
                        <button onClick={() => setPlates(true)} aria-label={t('workout.plates')} className="rounded-lg p-2 text-white/45 hover:bg-ink-3 hover:text-white"><Disc3 size={18} /></button>
                    )}
                    <button onClick={onSwap} aria-label={t('workout.swap')} className="rounded-lg p-2 text-white/45 hover:bg-ink-3 hover:text-white"><RefreshCw size={18} /></button>
                    <button onClick={remove} aria-label={t('workout.removeExercise')} className="rounded-lg p-2 text-white/45 hover:bg-ink-3 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 px-4">
                <Pill icon={<Repeat size={12} />}>{fmtRange(ex.repMin, ex.repMax)} {timed ? t('unit.seconds') : t('unit.reps')}</Pill>
                <Pill icon={<Timer size={12} />}>{t('workout.rest')} {fmtRest(ex.restSec)}</Pill>
                <button onClick={() => setHowTo(v => !v)} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                    <BookOpen size={12} /> {howTo ? t('workout.hideHowTo') : t('workout.howTo')}
                </button>
                {canBeBusy && (
                    <button onClick={() => setBusy(true)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs text-white/70 hover:bg-ink-3">
                        <ArrowLeftRight size={12} /> {t('workout.busy')}
                    </button>
                )}
            </div>

            {howTo && info && (
                <div className="mx-4 mt-3 space-y-2 animate-fade">
                    <ExerciseDemo id={ex.exerciseId} name={name} />
                    <p className="rounded-xl bg-ink-3 p-3 text-sm text-white/80">{exerciseTip(info)}</p>
                </div>
            )}

            <div className={`mx-4 mt-3 flex items-start gap-2.5 rounded-xl p-3 text-sm ${goUp ? 'bg-good/10' : 'bg-ink-3/70'}`}>
                {goUp ? <TrendingUp size={18} className="mt-px shrink-0 text-good" /> : <Target size={18} className="mt-px shrink-0 text-brand" />}
                {suggestion ? (
                    goUp
                        ? <span className="font-semibold text-good">{t('workout.goUp', { weight: fmtWeight(suggestion.weightKg, unit), reps: suggestion.reps, diff: fmtWeight(suggestion.weightKg - lastTop, unit) })}</span>
                        : <span className="text-white/75">{t('workout.target')}: <b className="text-white">{suggestion.weightKg > 0 ? `${fmtWeight(suggestion.weightKg, unit)} × ` : ''}{suggestion.reps}{timed ? ' s' : ` ${t('unit.reps')}`}</b></span>
                ) : (
                    <span className="text-white/70">{timed ? t('workout.firstTimeTimed', { seconds: ex.repMin }) : t('workout.firstTime', { reps: ex.repMin })}</span>
                )}
            </div>

            {timed && openSet >= 0 && (
                <HoldTimer target={ex.sets[openSet].reps || ex.repMin} onDone={sec => {
                    actions.setValue(index, openSet, 'reps', sec);
                    actions.toggleSet(index, openSet);
                }} />
            )}

            <div className="mt-3 px-2.5">
                <div className={`${SET_GRID} px-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40`}>
                    <span className="text-center">{t('workout.set')}</span>
                    <span>{t('workout.previous')}</span>
                    <span className="text-center">{timed ? t('workout.extraLoad') : unit}</span>
                    <span className="text-center">{timed ? t('unit.sec') : t('unit.repsShort')}</span>
                    <span><span className="sr-only">{t('workout.done')}</span></span>
                </div>
                {ex.sets.map((s, j) => {
                    const prev = previous[j];
                    const isNext = j === openSet;
                    return (
                        <div key={s.id} className={`rounded-xl px-1.5 py-1.5 transition ${s.done ? 'bg-good/[0.08]' : isNext ? 'bg-brand/[0.07]' : ''}`}>
                            <div className={SET_GRID}>
                                <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${s.done ? 'bg-good/20 text-good' : isNext ? 'text-brand ring-2 ring-brand' : 'bg-ink-3 text-white/55'}`}>{j + 1}</span>
                                <span className="truncate text-sm tabular-nums text-white/45">
                                    {prev ? `${prev.weightKg > 0 ? `${fmtNumber(kgToDisplay(prev.weightKg, unit))} × ` : ''}${prev.reps}` : '—'}
                                </span>
                                <span>
                                    <NumberField label={t('workout.weightOf', { n: j + 1 })} decimals active={isNext} value={kgToDisplay(s.weightKg, unit)}
                                        onCommit={n => actions.setValue(index, j, 'weightKg', displayToKg(n, unit))} />
                                </span>
                                <span>
                                    <NumberField label={t('workout.repsOf', { n: j + 1 })} decimals={false} active={isNext} value={s.reps}
                                        onCommit={n => actions.setValue(index, j, 'reps', Math.round(n))} />
                                </span>
                                <span className="flex justify-center">
                                    <button onClick={() => { if (!s.done) { haptic('tap'); primeSound(); } actions.toggleSet(index, j); }} aria-pressed={s.done} aria-label={t('workout.markDone', { n: j + 1 })}
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${s.done ? 'animate-pop bg-good text-ink shadow-md shadow-good/30' : isNext ? 'bg-brand/15 text-brand hover:bg-brand hover:text-ink' : 'bg-ink-3 text-white/35 hover:text-white'}`}>
                                        <Check size={20} strokeWidth={3} />
                                    </button>
                                </span>
                            </div>
                            {isNext && !timed && (
                                <div className={`${SET_GRID} mt-1.5`}>
                                    <span />
                                    <span />
                                    <span className="flex gap-1">
                                        <Step label={t('workout.weightDown', { n: j + 1 })} onClick={() => actions.setValue(index, j, 'weightKg', Math.max(0, s.weightKg - stepKg))}>−{stepLabel}</Step>
                                        <Step label={t('workout.weightUp', { n: j + 1 })} onClick={() => actions.setValue(index, j, 'weightKg', s.weightKg + stepKg)}>+{stepLabel}</Step>
                                    </span>
                                    <span className="flex gap-1">
                                        <Step label={t('workout.repsDown', { n: j + 1 })} onClick={() => actions.setValue(index, j, 'reps', Math.max(0, s.reps - 1))}><Minus size={14} /></Step>
                                        <Step label={t('workout.repsUp', { n: j + 1 })} onClick={() => actions.setValue(index, j, 'reps', s.reps + 1)}><Plus size={14} /></Step>
                                    </span>
                                    <span />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-2 p-3">
                {lastDone && !complete && (
                    <button onClick={() => { haptic('tap'); primeSound(); actions.repeatLastSet(index); }} className="btn flex-1 bg-brand-soft py-2.5 text-brand hover:bg-brand/20"
                        aria-label={t('workout.repeatSet.label')}>
                        <Copy size={16} /> <span className="truncate">{t('workout.repeatSet', { value: `${lastDone.weightKg > 0 ? `${fmtNumber(kgToDisplay(lastDone.weightKg, unit))} × ` : ''}${lastDone.reps}` })}</span>
                    </button>
                )}
                <button onClick={() => actions.addSet(index)} className="btn-ghost flex-1 py-2.5"><Plus size={16} /> {t('workout.addSet')}</button>
                {ex.sets.length > 1 && (
                    <button onClick={() => actions.removeSet(index, ex.sets.length - 1)} aria-label={t('workout.removeLastSet')} className="btn-ghost px-3.5 py-2.5"><Minus size={16} /></button>
                )}
            </div>
            {busy && (
                <BusySheet exerciseId={ex.exerciseId} exclude={others} onClose={() => setBusy(false)} onPick={id => {
                    actions.swapExercise(index, id);
                    setBusy(false);
                    toast(t('workout.busy.swapped', { name: exerciseName(id) }));
                }} />
            )}
            {plates && <PlateSheet open onClose={() => setPlates(false)} weightKg={nextSet?.weightKg ?? 0} unit={unit} exerciseName={name} />}
        </section>
    );
};

// Countdown ring around the seconds left.
const Ring = ({ progress, children }: { progress: number; children: ReactNode }) => {
    const r = 34;
    const length = 2 * Math.PI * r;
    return (
        <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-ink-4" />
                <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-brand transition-[stroke-dashoffset] duration-200"
                    strokeDasharray={length} strokeDashoffset={length * (1 - progress)} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">{children}</div>
        </div>
    );
};

export interface NextUp { name: string; set: number; value: string }

const RestPanel = ({ endsAt, total, next }: { endsAt: number; total: number; next: NextUp | null }) => {
    const { left, finished, ending } = useRestCountdown(endsAt);
    return (
        <div role="timer" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] animate-rise">
            <div className="mx-auto flex max-w-lg items-center gap-3.5 rounded-3xl border border-line bg-ink-2/95 p-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <Ring progress={finished ? 0 : Math.max(0, Math.min(1, left / total))}>
                    <span className={`text-xl font-extrabold tabular-nums ${ending ? 'text-brand' : ''}`}>{finished ? '0:00' : fmtClock(left)}</span>
                </Ring>
                <div className="min-w-0 flex-1">
                    <p className="label">{finished ? t('rest.done') : t('rest.title')}</p>
                    {next ? (
                        <>
                            <p className="mt-0.5 truncate text-sm font-semibold"><span className="font-normal text-white/50">{t('rest.next')}: </span>{t('rest.nextSet', { name: next.name, n: next.set })}</p>
                            {next.value && <p className="truncate text-xs tabular-nums text-white/55">{next.value}</p>}
                        </>
                    ) : (
                        <p className="mt-0.5 text-sm text-good">{t('rest.allDone')}</p>
                    )}
                    <div className="mt-2 flex gap-1.5">
                        <button className="btn-ghost flex-1 px-2 py-2" onClick={() => actions.adjustRest(-15)}>−15</button>
                        <button className="btn-ghost flex-1 px-2 py-2" onClick={() => actions.adjustRest(15)}>+15</button>
                        <button className="btn-primary flex-[1.4] px-3 py-2" onClick={() => actions.skipRest()}>{t('rest.skip')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Stat = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
    <div className="min-w-0 rounded-xl bg-ink-3/70 px-2.5 py-2">
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">{icon}{label}</p>
        <p className="mt-0.5 truncate text-[15px] font-bold tabular-nums">{value}</p>
    </div>
);

// Guided (full screen, one exercise at a time) or the list of every set.
const VIEW_KEY = 'fitness-life:workout-view';
const savedView = (): 'guided' | 'list' => {
    try {
        return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'guided';
    } catch {
        return 'guided';
    }
};

export default function Workout() {
    const active = useStore(s => s.active);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const goal = useStore(s => s.profile?.goal);
    const navigate = useNavigate();
    const now = useNow(!!active);
    const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; index: number } | null>(null);
    const [view, setView] = useState(savedView);
    const changeView = (next: 'guided' | 'list') => {
        setView(next);
        try { localStorage.setItem(VIEW_KEY, next); } catch { /* the choice just isn't remembered */ }
    };
    // Set when finishing, so the "no workout, go home" redirect below does not
    // override the navigation to the session summary.
    const finishing = useRef(false);

    useEffect(() => {
        if (!active && !finishing.current) navigate('/', { replace: true });
    }, [active, navigate]);

    // Screen stays on while this page is open (re-acquired when the app
    // comes back to the foreground, since the browser drops the lock).
    useEffect(() => {
        void keepAwake(true);
        const onVisible = () => document.visibilityState === 'visible' && keepAwake(true);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            void keepAwake(false);
        };
    }, []);

    // Notification when the rest ends, even with the phone locked (apps only).
    const restEndsAt = active?.restEndsAt ?? null;
    useEffect(() => {
        if (restEndsAt) void scheduleRestAlert(restEndsAt);
        else void cancelRestAlert();
    }, [restEndsAt]);
    if (!active) return null;

    const sets = active.exercises.flatMap(e => e.sets);
    const done = sets.filter(s => s.done).length;
    const total = sets.length;
    const volumeKg = sets.reduce((sum, s) => (s.done ? sum + s.weightKg * s.reps : sum), 0);
    // The exercise being done: the first one with a set left.
    const currentIndex = active.exercises.findIndex(e => e.sets.some(s => !s.done));
    const current = currentIndex >= 0 ? active.exercises[currentIndex] : null;
    const nextSetIndex = current ? current.sets.findIndex(s => !s.done) : -1;
    const nextSet = current?.sets[nextSetIndex];
    const next: NextUp | null = current && nextSet ? {
        name: exerciseName(current.exerciseId),
        set: nextSetIndex + 1,
        value: nextSet.weightKg > 0 ? `${fmtWeight(nextSet.weightKg, unit)} × ${nextSet.reps}` : `${nextSet.reps}`,
    } : null;

    const jumpTo = (i: number) => document.getElementById(`ex-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const finish = async () => {
        if (done === 0) {
            if (await confirm({ title: t('workout.noSets.title'), message: t('workout.noSets.message'), confirmLabel: t('common.discard'), danger: true })) actions.discardWorkout();
            return;
        }
        if (done < total && !(await confirm({ title: t('workout.finish.title'), message: tp('workout.finish.unmarked', total - done), confirmLabel: t('workout.finish') }))) return;
        haptic('success');
        finishing.current = true;
        const id = actions.finishWorkout();
        navigate(id ? `/sesion/${id}?nuevo=1` : '/', { replace: true });
    };

    const discard = async () => {
        const ok = await confirm({ title: t('workout.discard.title'), message: t('workout.discard.message'), confirmLabel: t('common.discard'), danger: true });
        if (ok) actions.discardWorkout();
    };

    if (view === 'guided') {
        return <GuidedWorkout active={active} unit={unit} onFinish={finish} onList={() => changeView('list')} onClose={() => navigate('/')} />;
    }

    return (
        <div className="mx-auto min-h-dvh max-w-lg pb-44">
            {/* The safe-area padding lives in the sticky header so it never slides under the notch. */}
            <header className="sticky top-0 z-30 border-b border-line bg-ink/90 px-3 pb-3 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-xl">
                <div className="flex items-center gap-1.5">
                    <button onClick={() => navigate('/')} aria-label={t('workout.back')} className="-ml-1.5 rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white">
                        <ChevronLeft size={22} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold leading-tight">{sessionName(active)}</p>
                        {active.exercises.length > 0 && (
                            <p className="text-xs text-white/50">{t('workout.exerciseOf', { n: (currentIndex >= 0 ? currentIndex : active.exercises.length - 1) + 1, total: active.exercises.length })}</p>
                        )}
                    </div>
                    <button onClick={() => changeView('guided')} aria-label={t('guided.guidedView')} className="rounded-lg p-2 text-brand hover:bg-ink-3"><Sparkles size={20} /></button>
                    <UnitToggle unit={unit} />
                    <button onClick={finish} className="btn-primary ml-1 px-4 py-2">{t('workout.finish')}</button>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <Stat icon={<Clock3 size={11} />} label={t('workout.time')} value={fmtClock((now - Date.parse(active.startedAt)) / 1000)} />
                    <Stat icon={<Dumbbell size={11} />} label={t('workout.volume')} value={fmtVolume(volumeKg, unit)} />
                    <Stat icon={<Check size={11} />} label={t('workout.sets')} value={t('workout.progress', { done, total })} />
                </div>
                {isBurnWorkout(active, goal) && <div className="mt-2.5"><ActiveClock active={active} /></div>}

                {active.exercises.length > 1 && (
                    <nav aria-label={t('workout.exercises')} className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
                        {active.exercises.map((e, i) => {
                            const left = e.sets.filter(s => !s.done).length;
                            const complete = e.sets.length > 0 && left === 0;
                            const doneShare = e.sets.length ? (e.sets.length - left) / e.sets.length : 0;
                            return (
                                <button key={`${e.exerciseId}-${i}`} onClick={() => jumpTo(i)} aria-label={t('workout.jumpTo', { name: exerciseName(e.exerciseId) })}
                                    aria-current={i === currentIndex ? 'step' : undefined}
                                    className={`relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition ${i === currentIndex ? 'border-brand bg-brand-soft text-white' : complete ? 'border-good/30 text-white/70' : 'border-line text-white/60'}`}>
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${complete ? 'bg-good text-ink' : i === currentIndex ? 'bg-brand text-ink' : 'bg-ink-4'}`}>
                                        {complete ? <Check size={11} strokeWidth={3.5} /> : i + 1}
                                    </span>
                                    <span className="max-w-[8.5rem] truncate">{exerciseName(e.exerciseId)}</span>
                                    {!complete && doneShare > 0 && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" style={{ width: `${doneShare * 100}%` }} />}
                                </button>
                            );
                        })}
                    </nav>
                )}
                <div className="absolute inset-x-0 -bottom-px h-0.5 bg-ink-4" aria-hidden>
                    <div className="h-full bg-gradient-to-r from-brand to-good transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
            </header>

            <div className="space-y-3 p-3">
                <OfflineNotice />
                {active.exercises.map((ex, i) => (
                    <ExerciseCard key={`${ex.exerciseId}-${i}`} ex={ex} index={i} unit={unit} current={i === currentIndex} onSwap={() => setPicker({ mode: 'swap', index: i })}
                        others={active.exercises.map(e => e.exerciseId)} />
                ))}
                {active.exercises.length === 0 && (
                    <p className="card p-6 text-center text-white/60">{t('workout.emptyFree')}</p>
                )}
                <button onClick={() => setPicker({ mode: 'add' })} className="btn-ghost w-full border border-dashed border-line"><Plus size={18} /> {t('picker.add')}</button>
                <button onClick={discard} className="btn w-full text-red-400 hover:bg-red-500/10">{t('workout.discard')}</button>
            </div>

            {active.restEndsAt && <RestPanel endsAt={active.restEndsAt} total={active.restTotalSec} next={next} />}

            <ExercisePicker
                open={picker !== null}
                onClose={() => setPicker(null)}
                title={picker?.mode === 'swap' ? t('workout.swap') : t('picker.add')}
                swapFor={picker?.mode === 'swap' ? active.exercises[picker.index]?.exerciseId : undefined}
                onPick={id => picker?.mode === 'swap' ? actions.swapExercise(picker.index, id) : actions.addExercise(id)}
            />
        </div>
    );
}
