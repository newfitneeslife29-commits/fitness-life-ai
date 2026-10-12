import { Bot, Check, ChevronLeft, Footprints, HeartPulse, Info, Moon, Salad } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Chips, Section } from '../components/ui';
import { exerciseName, getExercise } from '../data/exercises';
import { adaptDays, prescribe, programDescription, programName, womenProgram } from '../data/programs';
import { l10n, t, tp } from '../i18n';
import { fmtRange, fmtRest } from '../lib/format';
import { actions, useStore } from '../store/store';
import type { Setup } from '../store/types';

type Aim = 'bajar' | 'mantener';
const GOAL_FOR: Record<Aim, 'grasa' | 'salud'> = { bajar: 'grasa', mantener: 'salud' };

// A section only for women: her own plan to lose or keep weight, built from
// where she trains (home first), her days and her aches.
export default function Women() {
    const profile = useStore(s => s.profile)!;
    const currentProgram = useStore(s => s.plan?.programId);
    const navigate = useNavigate();
    const [aim, setAim] = useState<Aim>(profile.goal === 'salud' ? 'mantener' : 'bajar');
    const [setup, setSetup] = useState<Setup>(profile.setup);
    const [days, setDays] = useState(Math.min(5, Math.max(2, profile.daysPerWeek)));
    const program = womenProgram(aim, setup);
    const plan = adaptDays(program, profile.limitations ?? []);
    const goal = GOAL_FOR[aim];
    const inUse = currentProgram === program.id && profile.goal === goal && profile.daysPerWeek === days;

    const start = async () => {
        const ok = await confirm({ title: t('women.confirm.title', { name: programName(program) }), message: t('women.confirm.message'), confirmLabel: t('women.confirm.ok') });
        if (!ok) return;
        actions.updateProfile({ goal, setup, daysPerWeek: days });
        actions.chooseProgram(program.id);
        toast(t('settings.planUpdated', { name: programName(program) }));
        navigate('/');
    };

    const tips = [
        { icon: <Salad size={18} />, text: t(aim === 'bajar' ? 'women.tip.eatLose' : 'women.tip.eatKeep') },
        { icon: <Footprints size={18} />, text: t(aim === 'bajar' ? 'women.tip.stepsLose' : 'women.tip.stepsKeep') },
        { icon: <Moon size={18} />, text: t('women.tip.sleep') },
        { icon: <HeartPulse size={18} />, text: t('women.tip.cycle') },
    ];

    return (
        <div className="space-y-5">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('women.title')}</h1>
                    <p className="text-sm text-white/55">{t('women.subtitle')}</p>
                </div>
            </header>

            <Section>
                <div className="space-y-4 rounded-2xl border border-pink-400/25 bg-gradient-to-br from-pink-500/15 via-brand-soft to-transparent p-4">
                    <div>
                        <p className="label mb-2">{t('women.aim')}</p>
                        <Chips<Aim> label={t('women.aim')} value={aim} onChange={setAim}
                            options={[{ value: 'bajar', label: t('women.aim.bajar') }, { value: 'mantener', label: t('women.aim.mantener') }]} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('women.where')}</p>
                        <Chips<Setup> label={t('women.where')} value={setup} onChange={setSetup} options={[
                            { value: 'casa', label: t('setup.casa.short') },
                            { value: 'mancuernas', label: t('setup.mancuernas.short') },
                            { value: 'gimnasio', label: t('setup.gimnasio.short') },
                        ]} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('settings.days')}</p>
                        <Chips<number> label={t('settings.days')} value={days} onChange={setDays} options={[2, 3, 4, 5].map(d => ({ value: d, label: String(d) }))} />
                    </div>
                </div>
            </Section>

            <Section title={t('women.yourPlan')}>
                <div className="card p-4">
                    <p className="text-lg font-bold">{programName(program)}</p>
                    <p className="mt-1 text-sm text-white/60">{programDescription(program)}</p>
                    <p className="mt-2 text-xs text-white/45">{t('women.rotation', { days: tp('programs.days', program.days.length), perWeek: days })}</p>
                </div>
                <ol className="mt-2 space-y-2">
                    {plan.map((day, i) => (
                        <li key={i} className="card p-3">
                            <p className="mb-1.5 font-semibold"><span className="text-brand">{t('onboarding.day', { n: i + 1 })}</span> · {l10n(day.name)}</p>
                            <ul className="space-y-1 text-sm">
                                {day.slots.map(slot => {
                                    const timed = getExercise(slot.exerciseId)?.timed;
                                    const p = prescribe(goal, profile.level, slot.role, timed);
                                    return (
                                        <li key={slot.exerciseId} className="flex justify-between gap-3">
                                            <span className="truncate text-white/80">{exerciseName(slot.exerciseId)}</span>
                                            <span className="shrink-0 tabular-nums text-white/45">{p.sets} × {fmtRange(p.repMin, p.repMax)}{timed ? ' s' : ''} · {fmtRest(p.restSec)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ol>
                {inUse ? (
                    <p className="mt-3 flex items-center justify-center gap-2 py-3 font-semibold text-good"><Check size={18} /> {t('programs.current')}</p>
                ) : (
                    <button onClick={start} className="btn-primary mt-3 w-full">{t('women.start')}</button>
                )}
                <Link to="/entrenador" className="btn-ghost mt-2 w-full"><Bot size={18} /> {t('women.ai')}</Link>
            </Section>

            <Section title={t('women.tips')}>
                <ul className="card divide-y divide-line">
                    {tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 p-3 text-sm text-white/80"><span className="mt-0.5 shrink-0 text-brand">{tip.icon}</span>{tip.text}</li>
                    ))}
                </ul>
                <p className="mt-2 flex items-start gap-2 text-xs text-white/45"><Info size={14} className="mt-0.5 shrink-0" /> {t('women.safety')}</p>
            </Section>
        </div>
    );
}
