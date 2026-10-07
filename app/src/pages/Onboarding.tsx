import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { Chips, Choice } from '../components/ui';
import { getExercise } from '../data/exercises';
import { pickProgram } from '../data/programs';
import { actions } from '../store/store';
import type { Goal, Level, Setup, Unit } from '../store/types';

const STEPS = ['Objetivo', 'Nivel', 'Días', 'Material', 'Plan'] as const;

export default function Onboarding() {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState<Goal>('musculo');
    const [level, setLevel] = useState<Level>('principiante');
    const [days, setDays] = useState(3);
    const [setup, setSetup] = useState<Setup>('gimnasio');
    const [unit, setUnit] = useState<Unit>('kg');

    const program = pickProgram(setup, days);
    const last = step === STEPS.length - 1;

    const finish = () => actions.completeOnboarding({ name: name.trim(), goal, level, daysPerWeek: days, setup, unit });

    return (
        <main className="pt-safe mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2 pt-6" aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
                {STEPS.map((s, i) => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-ink-4'}`} />
                ))}
            </div>

            <div className="flex-1 py-8">
                {step === 0 && (
                    <>
                        <p className="label mb-2">Fitness Life</p>
                        <h1 className="mb-1 text-3xl font-bold tracking-tight">Tu plan de fuerza en 1 minuto</h1>
                        <p className="mb-8 text-white/60">Te decimos qué entrenar, apuntas cada serie y la app te sugiere el peso de la próxima vez.</p>
                        <label className="label mb-2 block" htmlFor="name">¿Cómo te llamas? (opcional)</label>
                        <input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
                            className="mb-8 w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand" />
                        <p className="label mb-2">¿Qué buscas?</p>
                        <Choice label="Objetivo" value={goal} onChange={setGoal} options={[
                            { value: 'musculo', label: 'Ganar músculo', hint: 'Series de 6 a 15 repeticiones' },
                            { value: 'fuerza', label: 'Ganar fuerza', hint: 'Pesos altos, 4 a 6 repeticiones' },
                            { value: 'salud', label: 'Ponerme en forma', hint: 'Más ligero, sesiones más cortas' },
                        ]} />
                    </>
                )}
                {step === 1 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">¿Cuánta experiencia tienes con pesas?</h1>
                        <Choice label="Nivel" value={level} onChange={setLevel} options={[
                            { value: 'principiante', label: 'Principiante', hint: 'Menos de 6 meses entrenando' },
                            { value: 'intermedio', label: 'Intermedio', hint: 'Entre 6 meses y 2 años' },
                            { value: 'avanzado', label: 'Avanzado', hint: 'Más de 2 años de forma constante' },
                        ]} />
                    </>
                )}
                {step === 2 && (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">¿Cuántos días a la semana puedes entrenar?</h1>
                        <p className="mb-6 text-white/60">Elige lo que puedas mantener; siempre se puede cambiar.</p>
                        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Días por semana">
                            {[2, 3, 4, 5, 6].map(d => (
                                <button key={d} role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                                    className={`card py-5 text-2xl font-bold ${days === d ? 'border-brand bg-brand-soft text-brand-strong' : ''}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </>
                )}
                {step === 3 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">¿Dónde vas a entrenar?</h1>
                        <Choice label="Material" value={setup} onChange={setSetup} options={[
                            { value: 'gimnasio', label: 'Gimnasio', hint: 'Barras, máquinas y poleas' },
                            { value: 'mancuernas', label: 'Con mancuernas', hint: 'Mancuernas y un banco' },
                            { value: 'casa', label: 'En casa sin material', hint: 'Solo tu peso corporal' },
                        ]} />
                        <p className="label mb-2 mt-8">Unidades</p>
                        <Chips label="Unidades" value={unit} onChange={setUnit} options={[{ value: 'kg', label: 'Kilos (kg)' }, { value: 'lbs', label: 'Libras (lb)' }]} />
                    </>
                )}
                {last && (
                    <>
                        <p className="label mb-2">Tu plan</p>
                        <h1 className="mb-1 text-2xl font-bold">{program.name}</h1>
                        <p className="mb-6 text-white/60">{program.description}</p>
                        <ol className="space-y-3">
                            {program.days.map((day, i) => (
                                <li key={day.name} className="card p-4">
                                    <p className="mb-1 font-semibold"><span className="text-brand">Día {i + 1}</span> · {day.name}</p>
                                    <p className="text-sm text-white/55">{day.slots.map(s => getExercise(s.exerciseId)?.name).join(' · ')}</p>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-4 text-sm text-white/50">Las sesiones rotan en orden: haz la siguiente cuando entrenes, sin importar el día de la semana.</p>
                    </>
                )}
            </div>

            <div className="flex gap-3">
                {step > 0 && (
                    <button className="btn-ghost" onClick={() => setStep(s => s - 1)} aria-label="Atrás"><ArrowLeft size={18} /></button>
                )}
                {last ? (
                    <button className="btn-primary flex-1" onClick={finish}><Check size={18} /> Empezar con este plan</button>
                ) : (
                    <button className="btn-primary flex-1" onClick={() => setStep(s => s + 1)}>Siguiente <ArrowRight size={18} /></button>
                )}
            </div>
        </main>
    );
}
