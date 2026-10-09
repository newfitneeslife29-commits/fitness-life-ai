import { Check, ChevronLeft, Disc3, Minus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { ExercisePicker } from '../components/ExercisePicker';
import { confirm } from '../components/feedback';
import { PlateSheet } from '../components/PlateSheet';
import { exerciseName, exerciseTip, getExercise } from '../data/exercises';
import { t, tp } from '../i18n';
import { fmtClock, fmtNumber, fmtRange, fmtRest, fmtWeight, parseDecimal, typedNumber } from '../lib/format';
import { cancelRestAlert, haptic, keepAwake, scheduleRestAlert } from '../lib/native';
import { sessionName } from '../lib/names';
import { displayToKg, kgToDisplay } from '../lib/progression';
import { useNow } from '../lib/useNow';
import { planExercise } from '../lib/workout';
import { actions, useStore } from '../store/store';
import type { ActiveExercise, Unit } from '../store/types';

// Numeric field that keeps what the user is typing ("62," or "") and only
// commits a parsed number, so decimals and clearing work on phone keyboards.
const NumberField = ({ value, onCommit, label, decimals }: { value: number; onCommit: (n: number) => void; label: string; decimals: boolean }) => {
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
            className="w-full rounded-lg bg-ink-3 py-2 text-center text-base font-semibold tabular-nums outline-none focus:bg-ink-4 focus:ring-1 focus:ring-brand"
        />
    );
};

const ExerciseCard = ({ ex, index, unit, onSwap }: { ex: ActiveExercise; index: number; unit: Unit; onSwap: () => void }) => {
    const sessions = useStore(s => s.sessions);
    const info = getExercise(ex.exerciseId);
    const name = exerciseName(ex.exerciseId);
    const [howTo, setHowTo] = useState(false);
    const [plates, setPlates] = useState(false);
    const { suggestion, previous } = planExercise(sessions, ex, unit);
    const nextSet = ex.sets.find(s => !s.done) ?? ex.sets[ex.sets.length - 1];
    const timed = info?.timed;
    const lastTop = previous.length ? Math.max(...previous.map(p => p.weightKg)) : 0;

    const remove = async () => {
        const ok = await confirm({ title: t('workout.removeExercise.title', { name }), message: t('workout.removeExercise.message'), confirmLabel: t('common.remove'), danger: true });
        if (ok) actions.removeExercise(index);
    };

    return (
        <section className="card overflow-hidden" aria-label={name}>
            <div className="flex items-start gap-3 p-4 pb-2">
                <button onClick={() => setHowTo(v => !v)} aria-expanded={howTo} aria-label={t('workout.howTo')} className="shrink-0">
                    <ExerciseDemo id={ex.exerciseId} name={name} variant="thumb" animate />
                </button>
                <div className="min-w-0 flex-1">
                    <Link to={`/ejercicios/${ex.exerciseId}`} className="block truncate text-lg font-semibold leading-tight hover:text-brand-strong">{name}</Link>
                    <p className="mt-0.5 text-xs text-white/50">
                        {fmtRange(ex.repMin, ex.repMax)} {timed ? t('unit.seconds') : t('unit.reps')} · {t('workout.rest')} {fmtRest(ex.restSec)}
                    </p>
                    <button onClick={() => setHowTo(v => !v)} className="mt-1 text-xs font-semibold text-brand">
                        {howTo ? t('workout.hideHowTo') : t('workout.howTo')}
                    </button>
                </div>
                <div className="flex shrink-0 gap-0.5">
                    {info?.equipment === 'barra' && (
                        <button onClick={() => setPlates(true)} aria-label={t('workout.plates')} className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-white"><Disc3 size={18} /></button>
                    )}
                    <button onClick={onSwap} aria-label={t('workout.swap')} className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-white"><RefreshCw size={18} /></button>
                    <button onClick={remove} aria-label={t('workout.removeExercise')} className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
            </div>

            {howTo && info && (
                <div className="mx-4 mb-3 space-y-2">
                    <ExerciseDemo id={ex.exerciseId} name={name} />
                    <p className="rounded-xl bg-ink-3 p-3 text-sm text-white/80">{exerciseTip(info)}</p>
                </div>
            )}

            <p className="px-4 pb-3 text-sm">
                {suggestion ? (
                    suggestion.increased && suggestion.weightKg > lastTop
                        ? <span className="text-good">{t('workout.goUp', { weight: fmtWeight(suggestion.weightKg, unit), reps: suggestion.reps, diff: fmtWeight(suggestion.weightKg - lastTop, unit) })}</span>
                        : <span className="text-white/60">{t('workout.target')}: {suggestion.weightKg > 0 ? `${fmtWeight(suggestion.weightKg, unit)} × ` : ''}{suggestion.reps}{timed ? ' s' : ` ${t('unit.reps')}`}</span>
                ) : (
                    <span className="text-white/60">{t('workout.firstTime', { reps: ex.repMin })}</span>
                )}
            </p>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-white/40">
                        <th className="w-10 pb-1 font-medium">{t('workout.set')}</th>
                        <th className="pb-1 text-left font-medium">{t('workout.previous')}</th>
                        <th className="w-20 pb-1 font-medium">{timed ? t('workout.extraLoad') : unit}</th>
                        <th className="w-16 pb-1 font-medium">{timed ? t('unit.sec') : t('unit.repsShort')}</th>
                        <th className="w-14 pb-1"><span className="sr-only">{t('workout.done')}</span></th>
                    </tr>
                </thead>
                <tbody>
                    {ex.sets.map((s, j) => {
                        const prev = previous[j];
                        return (
                            <tr key={s.id} className={s.done ? 'bg-good/10' : ''}>
                                <td className="py-1.5 text-center font-semibold text-white/60">{j + 1}</td>
                                <td className="py-1.5 text-white/45 tabular-nums">
                                    {prev ? `${prev.weightKg > 0 ? `${fmtNumber(kgToDisplay(prev.weightKg, unit))} × ` : ''}${prev.reps}` : '—'}
                                </td>
                                <td className="px-1 py-1.5">
                                    <NumberField label={t('workout.weightOf', { n: j + 1 })} decimals value={kgToDisplay(s.weightKg, unit)}
                                        onCommit={n => actions.setValue(index, j, 'weightKg', displayToKg(n, unit))} />
                                </td>
                                <td className="px-1 py-1.5">
                                    <NumberField label={t('workout.repsOf', { n: j + 1 })} decimals={false} value={s.reps}
                                        onCommit={n => actions.setValue(index, j, 'reps', Math.round(n))} />
                                </td>
                                <td className="py-1.5 pr-2 text-center">
                                    <button onClick={() => { if (!s.done) haptic('tap'); actions.toggleSet(index, j); }} aria-pressed={s.done} aria-label={t('workout.markDone', { n: j + 1 })}
                                        className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition ${s.done ? 'animate-pop bg-good text-ink' : 'bg-ink-3 text-white/40 hover:text-white'}`}>
                                        <Check size={18} strokeWidth={3} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="flex gap-2 p-3">
                <button onClick={() => actions.addSet(index)} className="btn-ghost flex-1 py-2"><Plus size={16} /> {t('workout.addSet')}</button>
                {ex.sets.length > 1 && (
                    <button onClick={() => actions.removeSet(index, ex.sets.length - 1)} aria-label={t('workout.removeLastSet')} className="btn-ghost py-2"><Minus size={16} /></button>
                )}
            </div>
            {plates && <PlateSheet open onClose={() => setPlates(false)} weightKg={nextSet?.weightKg ?? 0} unit={unit} exerciseName={name} />}
        </section>
    );
};

const RestBar = ({ endsAt, total }: { endsAt: number; total: number }) => {
    const now = useNow(true, 250);
    const left = Math.ceil((endsAt - now) / 1000);
    const finished = left <= 0;
    useEffect(() => {
        if (!finished) return;
        haptic('success');
        const timer = window.setTimeout(() => actions.skipRest(), 4000);
        return () => window.clearTimeout(timer);
    }, [finished]);
    return (
        <div role="timer" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2 pb-[env(safe-area-inset-bottom)]">
            <div className="h-1 bg-ink-4">
                <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
            </div>
            <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
                <div>
                    <p className="label">{finished ? t('rest.done') : t('rest.title')}</p>
                    <p className="text-2xl font-bold tabular-nums">{finished ? '0:00' : fmtClock(left)}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-2" onClick={() => actions.adjustRest(-15)}>−15</button>
                    <button className="btn-ghost px-3 py-2" onClick={() => actions.adjustRest(15)}>+15</button>
                    <button className="btn-primary px-4 py-2" onClick={() => actions.skipRest()}>{t('rest.skip')}</button>
                </div>
            </div>
        </div>
    );
};

export default function Workout() {
    const active = useStore(s => s.active);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const navigate = useNavigate();
    const now = useNow(!!active);
    const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; index: number } | null>(null);
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

    const done = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

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

    return (
        <div className="mx-auto min-h-dvh max-w-lg pb-40">
            {/* The safe-area padding lives in the sticky header so it never slides under the notch. */}
            <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-ink px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                <button onClick={() => navigate('/')} aria-label={t('workout.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white">
                    <ChevronLeft size={22} />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{sessionName(active)}</p>
                    <p className="text-xs tabular-nums text-white/50">{fmtClock((now - Date.parse(active.startedAt)) / 1000)} · {t('workout.progress', { done, total })}</p>
                </div>
                <button onClick={finish} className="btn-primary px-4 py-2">{t('workout.finish')}</button>
            </header>

            <div className="space-y-3 p-3">
                {active.exercises.map((ex, i) => (
                    <ExerciseCard key={`${ex.exerciseId}-${i}`} ex={ex} index={i} unit={unit} onSwap={() => setPicker({ mode: 'swap', index: i })} />
                ))}
                {active.exercises.length === 0 && (
                    <p className="card p-6 text-center text-white/60">{t('workout.emptyFree')}</p>
                )}
                <button onClick={() => setPicker({ mode: 'add' })} className="btn-ghost w-full"><Plus size={18} /> {t('picker.add')}</button>
                <button onClick={discard} className="btn w-full text-red-400 hover:bg-red-500/10">{t('workout.discard')}</button>
            </div>

            {active.restEndsAt && <RestBar endsAt={active.restEndsAt} total={active.restTotalSec} />}

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
