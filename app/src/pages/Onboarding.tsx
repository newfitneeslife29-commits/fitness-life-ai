import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AboutFields, ActivityChoice, emptyAbout, GoalFields, LimitationChips, parseAbout, parseGoal, type GoalDraft } from '../components/ProfileForm';
import { Choice } from '../components/ui';
import { Welcome } from '../components/Welcome';
import { authAvailable } from '../lib/auth';
import { autoTargets } from '../lib/nutrition';
import AuthScreen from './Auth';
import { exerciseName } from '../data/exercises';
import { adaptDays, pickProgram, programDescription, programName } from '../data/programs';
import { getLang, l10n, t } from '../i18n';
import { fmtNumber } from '../lib/format';
import { actions, useStore } from '../store/store';
import type { Activity, Goal, Level, Limitation, Setup, Unit } from '../store/types';

// Name and goal → about you → day to day and injuries → experience → days →
// where → weight goal → the plan.
const STEPS = 8;

export default function Onboarding() {
    useStore(s => s.lang); // re-render when the language changes
    // Welcome → (create account or sign in) → plan questions.
    const signedIn = useStore(s => s.account !== null && s.account !== undefined);
    const [stage, setStage] = useState<'welcome' | 'signUp' | 'signIn' | 'plan'>(() => (signedIn ? 'plan' : 'welcome'));
    // Back from Google/Apple on the web with an account but no plan yet: straight to the questions.
    useEffect(() => {
        if (signedIn && stage === 'welcome') setStage('plan');
    }, [signedIn]);
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [goal, setGoalState] = useState<Goal>('musculo');
    const [unit, setUnit] = useState<Unit>(getLang() === 'en' ? 'lbs' : 'kg');
    const [about, setAbout] = useState(emptyAbout);
    const [activity, setActivity] = useState<Activity>('ligero');
    const [limitations, setLimitations] = useState<Limitation[]>([]);
    const [level, setLevel] = useState<Level>('principiante');
    const [days, setDays] = useState(3);
    const [setup, setSetup] = useState<Setup>('gimnasio');
    const [weightGoal, setWeightGoal] = useState<GoalDraft>({ dir: 'subir', target: '' });

    // The weight goal starts from the training goal: losing fat → lose weight.
    const setGoal = (g: Goal) => {
        setGoalState(g);
        setWeightGoal(w => ({ ...w, dir: g === 'grasa' ? 'bajar' : g === 'salud' ? 'mantener' : 'subir' }));
    };

    const parsed = parseAbout(about, unit);
    const goalValue = parsed ? parseGoal(weightGoal, parsed.weightKg, unit) : undefined;
    const program = pickProgram({ setup, daysPerWeek: days, level });
    const programDays = adaptDays(program, limitations);
    const last = step === STEPS - 1;
    // Steps that need an answer before going on.
    const blocked = (step === 1 && !parsed) || (step === 6 && goalValue === undefined);

    const profileDraft = {
        name: name.trim(), goal, level, daysPerWeek: days, setup, unit, activity, limitations,
        sex: parsed?.sex, birthYear: parsed?.birthYear, heightCm: parsed?.heightCm, weightGoal: goalValue ?? null,
    };
    const targets = parsed ? autoTargets(profileDraft, parsed.weightKg) : null;

    const finish = () => actions.completeOnboarding(profileDraft, parsed?.weightKg);

    if (stage === 'welcome') {
        return (
            <Welcome
                onStart={() => { setUnit(getLang() === 'en' ? 'lbs' : 'kg'); setStage(authAvailable() ? 'signUp' : 'plan'); }}
                onSignIn={authAvailable() ? () => setStage('signIn') : undefined} />
        );
    }
    if (stage === 'signUp' || stage === 'signIn') {
        // Signing in may bring a plan from the account; otherwise the questions follow.
        const next = () => { actions.setAuthPrompted(); setUnit(getLang() === 'en' ? 'lbs' : 'kg'); setStage('plan'); };
        return <AuthScreen key={stage} initialMode={stage} onDone={next} onSkip={next} onBack={() => setStage('welcome')} />;
    }

    return (
        <main className="pt-safe mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-1.5 pt-6" aria-label={t('onboarding.step', { n: step + 1, total: STEPS })}>
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
                        <Choice label={t('settings.goal')} value={goal} onChange={setGoal} options={(['musculo', 'grasa', 'fuerza', 'salud'] as const).map(g => ({
                            value: g, label: t(`goal.${g}`), hint: t(`goal.${g}.hint`),
                        }))} />
                    </>
                )}
                {step === 1 && (
                    <>
                        <h1 className="mb-2 text-2xl font-bold">{t('onboarding.aboutQuestion')}</h1>
                        <p className="mb-6 text-white/60">{t('about.subtitle')}</p>
                        <AboutFields value={about} onChange={setAbout} unit={unit} onUnit={setUnit} />
                    </>
                )}
                {step === 2 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">{t('onboarding.activityTitle')}</h1>
                        <p className="label mb-2">{t('activity.question')}</p>
                        <ActivityChoice value={activity} onChange={setActivity} />
                        <p className="label mb-2 mt-8">{t('limits.question')}</p>
                        <p className="mb-3 text-sm text-white/55">{t('limits.hint')}</p>
                        <LimitationChips value={limitations} onChange={setLimitations} />
                        {limitations.length > 0 && <p className="mt-4 text-sm text-white/50">{t('limits.doctor')}</p>}
                    </>
                )}
                {step === 3 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">{t('onboarding.levelQuestion')}</h1>
                        <Choice label={t('settings.level')} value={level} onChange={setLevel} options={[
                            { value: 'principiante', label: t('level.principiante'), hint: t('level.principiante.hint') },
                            { value: 'intermedio', label: t('level.intermedio'), hint: t('level.intermedio.hint') },
                            { value: 'avanzado', label: t('level.avanzado'), hint: t('level.avanzado.hint') },
                        ]} />
                    </>
                )}
                {step === 4 && (
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
                {step === 5 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">{t('onboarding.setupQuestion')}</h1>
                        <Choice label={t('settings.setup')} value={setup} onChange={setSetup} options={[
                            { value: 'gimnasio', label: t('setup.gimnasio'), hint: t('setup.gimnasio.hint') },
                            { value: 'mancuernas', label: t('setup.mancuernas'), hint: t('setup.mancuernas.hint') },
                            { value: 'casa', label: t('setup.casa'), hint: t('setup.casa.hint') },
                        ]} />
                    </>
                )}
                {step === 6 && (
                    <>
                        <h1 className="mb-6 text-2xl font-bold">{t('weightGoal.question')}</h1>
                        <GoalFields value={weightGoal} onChange={setWeightGoal} currentKg={parsed?.weightKg ?? null} unit={unit} />
                    </>
                )}
                {last && (
                    <>
                        <p className="label mb-2">{t('onboarding.yourPlan')}</p>
                        <h1 className="mb-1 text-2xl font-bold">{programName(program)}</h1>
                        <p className="mb-6 text-white/60">{programDescription(program)}</p>
                        <ol className="space-y-3">
                            {programDays.map((day, i) => (
                                <li key={i} className="card p-4">
                                    <p className="mb-1 font-semibold"><span className="text-brand">{t('onboarding.day', { n: i + 1 })}</span> · {l10n(day.name)}</p>
                                    <p className="text-sm text-white/55">{day.slots.map(s => exerciseName(s.exerciseId)).join(' · ')}</p>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-4 text-sm text-white/50">{t('onboarding.rotationHint')}</p>
                        {targets && (
                            <p className="card mt-4 border-brand/30 bg-brand-soft p-4 text-sm font-medium">
                                {t('onboarding.targets', { kcal: fmtNumber(targets.kcal), protein: targets.protein })}
                            </p>
                        )}
                    </>
                )}
            </div>

            <div className="flex gap-3">
                <button className="btn-ghost" onClick={() => (step > 0 ? setStep(s => s - 1) : setStage('welcome'))} aria-label={t('common.back')}><ArrowLeft size={18} /></button>
                {last ? (
                    <button className="btn-primary flex-1" onClick={finish}><Check size={18} /> {t('onboarding.start')}</button>
                ) : (
                    <button className="btn-primary flex-1" disabled={blocked} onClick={() => setStep(s => s + 1)}>{t('common.next')} <ArrowRight size={18} /></button>
                )}
            </div>
        </main>
    );
}
