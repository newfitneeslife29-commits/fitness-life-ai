import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { Chips, Choice } from '../components/ui';
import { Welcome } from '../components/Welcome';
import { exerciseName } from '../data/exercises';
import { pickProgram, programDescription, programName } from '../data/programs';
import { getLang, l10n, t } from '../i18n';
import { actions, useStore } from '../store/store';
import type { Goal, Level, Setup, Unit } from '../store/types';

const STEPS = 5;

export default function Onboarding() {
    useStore(s => s.lang); // re-render when the language changes
    const [started, setStarted] = useState(false);
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [goal, setGoal] = useState<Goal>('musculo');
    const [level, setLevel] = useState<Level>('principiante');
    const [days, setDays] = useState(3);
    const [setup, setSetup] = useState<Setup>('gimnasio');
    const [unit, setUnit] = useState<Unit>(getLang() === 'en' ? 'lbs' : 'kg');

    const program = pickProgram(setup, days);
    const last = step === STEPS - 1;

    const finish = () => actions.completeOnboarding({ name: name.trim(), goal, level, daysPerWeek: days, setup, unit });

    if (!started) return <Welcome onStart={() => { setUnit(getLang() === 'en' ? 'lbs' : 'kg'); setStarted(true); }} />;

    return (
        <main className="pt-safe mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2 pt-6" aria-label={t('onboarding.step', { n: step + 1, total: STEPS })}>
                {Array.from({ length: STEPS }, (_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-ink-4'}`} />
                ))}
            </div>

            <div className="flex-1 animate-fade py-8" key={step}>
                {step === 0 && (
                    <>
                        <p className="label mb-2">Fitness Life</p>
                        <h1 className="mb-1 text-3xl font-bold tracking-tight">{t('onboarding.title')}</h1>
                        <p className="mb-8 text-white/60">{t('onboarding.subtitle')}</p>
                        <label className="label mb-2 block" htmlFor="name">{t('onboarding.nameLabel')}</label>
                        <input id="name" value={name} onChange={e => setName(e.target.value)} placeholder={t('onboarding.namePlaceholder')}
                            className="mb-8 w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand" />
                        <p className="label mb-2">{t('onboarding.goalQuestion')}</p>
                        <Choice label={t('settings.goal')} value={goal} onChange={setGoal} options={[
                            { value: 'musculo', label: t('goal.musculo'), hint: t('goal.musculo.hint') },
                            { value: 'fuerza', label: t('goal.fuerza'), hint: t('goal.fuerza.hint') },
                            { value: 'salud', label: t('goal.salud'), hint: t('goal.salud.hint') },
                        ]} />
                    </>
                )}
                {step === 1 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">{t('onboarding.levelQuestion')}</h1>
                        <Choice label={t('settings.level')} value={level} onChange={setLevel} options={[
                            { value: 'principiante', label: t('level.principiante'), hint: t('level.principiante.hint') },
                            { value: 'intermedio', label: t('level.intermedio'), hint: t('level.intermedio.hint') },
                            { value: 'avanzado', label: t('level.avanzado'), hint: t('level.avanzado.hint') },
                        ]} />
                    </>
                )}
                {step === 2 && (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t('onboarding.daysQuestion')}</h1>
                        <p className="mb-6 text-white/60">{t('onboarding.daysHint')}</p>
                        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t('settings.days')}>
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
                        <h1 className="mb-6 text-2xl font-bold">{t('onboarding.setupQuestion')}</h1>
                        <Choice label={t('settings.setup')} value={setup} onChange={setSetup} options={[
                            { value: 'gimnasio', label: t('setup.gimnasio'), hint: t('setup.gimnasio.hint') },
                            { value: 'mancuernas', label: t('setup.mancuernas'), hint: t('setup.mancuernas.hint') },
                            { value: 'casa', label: t('setup.casa'), hint: t('setup.casa.hint') },
                        ]} />
                        <p className="label mb-2 mt-8">{t('settings.units')}</p>
                        <Chips label={t('settings.units')} value={unit} onChange={setUnit} options={[{ value: 'kg', label: t('unit.kgLong') }, { value: 'lbs', label: t('unit.lbLong') }]} />
                    </>
                )}
                {last && (
                    <>
                        <p className="label mb-2">{t('onboarding.yourPlan')}</p>
                        <h1 className="mb-1 text-2xl font-bold">{programName(program)}</h1>
                        <p className="mb-6 text-white/60">{programDescription(program)}</p>
                        <ol className="space-y-3">
                            {program.days.map((day, i) => (
                                <li key={i} className="card p-4">
                                    <p className="mb-1 font-semibold"><span className="text-brand">{t('onboarding.day', { n: i + 1 })}</span> · {l10n(day.name)}</p>
                                    <p className="text-sm text-white/55">{day.slots.map(s => exerciseName(s.exerciseId)).join(' · ')}</p>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-4 text-sm text-white/50">{t('onboarding.rotationHint')}</p>
                    </>
                )}
            </div>

            <div className="flex gap-3">
                <button className="btn-ghost" onClick={() => (step > 0 ? setStep(s => s - 1) : setStarted(false))} aria-label={t('common.back')}><ArrowLeft size={18} /></button>
                {last ? (
                    <button className="btn-primary flex-1" onClick={finish}><Check size={18} /> {t('onboarding.start')}</button>
                ) : (
                    <button className="btn-primary flex-1" onClick={() => setStep(s => s + 1)}>{t('common.next')} <ArrowRight size={18} /></button>
                )}
            </div>
        </main>
    );
}
