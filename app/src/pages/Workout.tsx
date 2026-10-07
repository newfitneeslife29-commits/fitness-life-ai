import { Check, ChevronLeft, Info, Minus, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { getExercise } from '../data/exercises';
import { fmtClock, fmtNumber, fmtRange, fmtRest, fmtWeight } from '../lib/format';
import { displayToKg, kgToDisplay } from '../lib/progression';
import { useNow } from '../lib/useNow';
import { planExercise } from '../lib/workout';
import { actions, useStore } from '../store/store';
import type { ActiveExercise, Unit } from '../store/types';

// Numeric field that keeps what the user is typing ("62," or "") and only
// commits a parsed number, so decimals and clearing work on phone keyboards.
const NumberField = ({ value, onCommit, label, decimals }: { value: number; onCommit: (n: number) => void; label: string; decimals: boolean }) => {
    const [text, setText] = useState(String(value).replace('.', ','));
    const focused = useRef(false);
    useEffect(() => {
        if (!focused.current) setText(String(value).replace('.', ','));
    }, [value]);
    const commit = (raw: string) => {
        const n = Number(raw.replace(',', '.'));
        if (raw.trim() !== '' && Number.isFinite(n)) onCommit(n);
    };
    return (
        <input
            aria-label={label}
            inputMode={decimals ? 'decimal' : 'numeric'}
            value={text}
            onFocus={e => { focused.current = true; e.currentTarget.select(); }}
            onChange={e => { setText(e.target.value); commit(e.target.value); }}
            onBlur={() => { focused.current = false; setText(String(value).replace('.', ',')); }}
            className="w-full rounded-lg bg-ink-3 py-2 text-center text-base font-semibold tabular-nums outline-none focus:bg-ink-4 focus:ring-1 focus:ring-brand"
        />
    );
};

const ExerciseCard = ({ ex, index, unit, onSwap }: { ex: ActiveExercise; index: number; unit: Unit; onSwap: () => void }) => {
    const sessions = useStore(s => s.sessions);
    const info = getExercise(ex.exerciseId);
    const [showTip, setShowTip] = useState(false);
    const { suggestion, previous } = planExercise(sessions, ex);
    const timed = info?.timed;
    const lastTop = previous.length ? Math.max(...previous.map(p => p.weightKg)) : 0;

    return (
        <section className="card overflow-hidden" aria-label={info?.name}>
            <div className="flex items-start justify-between gap-2 p-4 pb-2">
                <div className="min-w-0">
                    <Link to={`/ejercicios/${ex.exerciseId}`} className="block truncate text-lg font-semibold hover:text-brand-strong">{info?.name ?? ex.exerciseId}</Link>
                    <p className="text-xs text-white/50">
                        {fmtRange(ex.repMin, ex.repMax)} {timed ? 'segundos' : 'reps'} · descanso {fmtRest(ex.restSec)}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1">
                    {info?.tip && (
                        <button onClick={() => setShowTip(v => !v)} aria-label="Consejo técnico" className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-white"><Info size={18} /></button>
                    )}
                    <button onClick={onSwap} aria-label="Cambiar ejercicio" className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-white"><RefreshCw size={18} /></button>
                    <button onClick={() => window.confirm(`¿Quitar ${info?.name ?? 'este ejercicio'} del entreno?`) && actions.removeExercise(index)}
                        aria-label="Quitar ejercicio" className="rounded-lg p-2 text-white/50 hover:bg-ink-3 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
            </div>

            {showTip && <p className="mx-4 mb-2 rounded-lg bg-ink-3 p-3 text-sm text-white/75">{info?.tip}</p>}

            <p className="px-4 pb-3 text-sm">
                {suggestion ? (
                    suggestion.increased && suggestion.weightKg > lastTop
                        ? <span className="text-good">Toca subir: {fmtWeight(suggestion.weightKg, unit)} × {suggestion.reps} (+{fmtWeight(suggestion.weightKg - lastTop, unit)})</span>
                        : <span className="text-white/60">Objetivo: {suggestion.weightKg > 0 ? `${fmtWeight(suggestion.weightKg, unit)} × ` : ''}{suggestion.reps}{timed ? ' s' : ' reps'}</span>
                ) : (
                    <span className="text-white/60">Primera vez: elige un peso con el que llegues a {ex.repMin} reps con buena técnica.</span>
                )}
            </p>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-white/40">
                        <th className="w-10 pb-1 font-medium">Serie</th>
                        <th className="pb-1 text-left font-medium">Anterior</th>
                        <th className="w-20 pb-1 font-medium">{timed ? 'Lastre' : unit}</th>
                        <th className="w-16 pb-1 font-medium">{timed ? 'Seg' : 'Reps'}</th>
                        <th className="w-14 pb-1"><span className="sr-only">Hecha</span></th>
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
                                    <NumberField label={`Peso serie ${j + 1}`} decimals value={kgToDisplay(s.weightKg, unit)}
                                        onCommit={n => actions.setValue(index, j, 'weightKg', displayToKg(n, unit))} />
                                </td>
                                <td className="px-1 py-1.5">
                                    <NumberField label={`Repeticiones serie ${j + 1}`} decimals={false} value={s.reps}
                                        onCommit={n => actions.setValue(index, j, 'reps', Math.round(n))} />
                                </td>
                                <td className="py-1.5 pr-2 text-center">
                                    <button onClick={() => actions.toggleSet(index, j)} aria-pressed={s.done} aria-label={`Marcar serie ${j + 1} como hecha`}
                                        className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition ${s.done ? 'bg-good text-ink' : 'bg-ink-3 text-white/40 hover:text-white'}`}>
                                        <Check size={18} strokeWidth={3} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="flex gap-2 p-3">
                <button onClick={() => actions.addSet(index)} className="btn-ghost flex-1 py-2"><Plus size={16} /> Serie</button>
                {ex.sets.length > 1 && (
                    <button onClick={() => actions.removeSet(index, ex.sets.length - 1)} aria-label="Quitar la última serie" className="btn-ghost py-2"><Minus size={16} /></button>
                )}
            </div>
        </section>
    );
};

const RestBar = ({ endsAt, total }: { endsAt: number; total: number }) => {
    const now = useNow(true, 250);
    const left = Math.ceil((endsAt - now) / 1000);
    const finished = left <= 0;
    useEffect(() => {
        if (!finished) return;
        navigator.vibrate?.([200, 100, 200]);
        const t = window.setTimeout(() => actions.skipRest(), 4000);
        return () => window.clearTimeout(t);
    }, [finished]);
    return (
        <div role="timer" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="h-1 bg-ink-4">
                <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
            </div>
            <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
                <div>
                    <p className="label">{finished ? '¡A por la siguiente!' : 'Descanso'}</p>
                    <p className="text-2xl font-bold tabular-nums">{finished ? '0:00' : fmtClock(left)}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-ghost px-3 py-2" onClick={() => actions.adjustRest(-15)}>−15</button>
                    <button className="btn-ghost px-3 py-2" onClick={() => actions.adjustRest(15)}>+15</button>
                    <button className="btn-primary px-4 py-2" onClick={() => actions.skipRest()}>Saltar</button>
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
    if (!active) return null;

    const done = active.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);

    const finish = () => {
        if (done === 0) {
            if (window.confirm('No has marcado ninguna serie. ¿Descartar el entreno?')) actions.discardWorkout();
            return;
        }
        if (done < total && !window.confirm(`Quedan ${total - done} series sin marcar y no se guardarán. ¿Terminar igualmente?`)) return;
        finishing.current = true;
        const id = actions.finishWorkout();
        navigate(id ? `/sesion/${id}?nuevo=1` : '/', { replace: true });
    };

    return (
        <div className="pt-safe mx-auto min-h-dvh max-w-lg pb-40">
            <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-ink/95 px-2 py-2 backdrop-blur">
                <button onClick={() => navigate('/')} aria-label="Volver (el entreno sigue abierto)" className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white">
                    <ChevronLeft size={22} />
                </button>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{active.routineName}</p>
                    <p className="text-xs tabular-nums text-white/50">{fmtClock((now - Date.parse(active.startedAt)) / 1000)} · {done}/{total} series</p>
                </div>
                <button onClick={finish} className="btn-primary px-4 py-2">Terminar</button>
            </header>

            <div className="space-y-3 p-3">
                {active.exercises.map((ex, i) => (
                    <ExerciseCard key={`${ex.exerciseId}-${i}`} ex={ex} index={i} unit={unit} onSwap={() => setPicker({ mode: 'swap', index: i })} />
                ))}
                {active.exercises.length === 0 && (
                    <p className="card p-6 text-center text-white/60">Entreno libre: añade el primer ejercicio.</p>
                )}
                <button onClick={() => setPicker({ mode: 'add' })} className="btn-ghost w-full"><Plus size={18} /> Añadir ejercicio</button>
                <button onClick={() => window.confirm('¿Descartar este entreno? No se guardará nada.') && actions.discardWorkout()}
                    className="btn w-full text-red-400 hover:bg-red-500/10">Descartar entreno</button>
            </div>

            {active.restEndsAt && <RestBar endsAt={active.restEndsAt} total={active.restTotalSec} />}

            <ExercisePicker
                open={picker !== null}
                onClose={() => setPicker(null)}
                title={picker?.mode === 'swap' ? 'Cambiar ejercicio' : 'Añadir ejercicio'}
                swapFor={picker?.mode === 'swap' ? active.exercises[picker.index]?.exerciseId : undefined}
                onPick={id => picker?.mode === 'swap' ? actions.swapExercise(picker.index, id) : actions.addExercise(id)}
            />
        </div>
    );
}
