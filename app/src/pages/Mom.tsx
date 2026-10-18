import { AlertTriangle, Baby, Check, ChevronDown, ChevronLeft, Crown, HeartHandshake, Lock, Salad, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Chips, Photo, Section } from '../components/ui';
import { namedCover } from '../data/covers';
import { exerciseName, getExercise } from '../data/exercises';
import { prescribe, programDescription, programName, PROGRAMS, type Program } from '../data/programs';
import { l10n, t, tp, type Key } from '../i18n';
import { fmtRange, fmtRest } from '../lib/format';
import { usePremiumActive } from '../lib/premium';
import { actions, useStore } from '../store/store';

type Stage = 'embarazo' | 'posparto' | 'diastasis';

// Tips per stage: the first three are free, the rest come with Premium.
const NUTRITION: Record<Stage, number> = { embarazo: 9, posparto: 9, diastasis: 7 };
const FREE_TIPS = 3;

const ProgramCard = ({ program, premium }: { program: Program; premium: boolean }) => {
    const navigate = useNavigate();
    const current = useStore(s => s.plan?.programId === program.id);
    const level = useStore(s => s.profile!.level);
    const [open, setOpen] = useState(false);
    const locked = program.premium && !premium;
    const start = async () => {
        const ok = await confirm({ title: t('mom.confirm.title', { name: programName(program) }), message: t('mom.confirm.message'), confirmLabel: t('women.confirm.ok') });
        if (!ok) return;
        actions.updateProfile({ goal: 'salud', setup: program.setup, daysPerWeek: Math.max(2, program.days.length) });
        actions.chooseProgram(program.id);
        toast(t('settings.planUpdated', { name: programName(program) }));
        navigate('/');
    };
    return (
        <article className="card overflow-hidden">
            <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{programName(program)}</span>
                        {program.premium
                            ? <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-500"><Crown size={12} /> Premium</span>
                            : <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-bold text-good">{t('mom.free')}</span>}
                    </span>
                    <span className="mt-1 block text-sm text-white/60">{programDescription(program)}</span>
                    <span className="mt-1 block text-xs text-white/45">{tp('programs.days', program.days.length)} · {t(program.setup === 'casa' ? 'setup.casa.short' : 'setup.gimnasio.short')}</span>
                </span>
                <ChevronDown size={20} className={`mt-1 shrink-0 text-white/40 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="border-t border-line p-4 pt-3">
                    {locked ? (
                        <div className="text-center">
                            <p className="mb-3 flex items-center justify-center gap-2 text-sm text-white/60"><Lock size={16} /> {t('mom.locked')}</p>
                            <Link to="/premium" className="btn-primary w-full"><Crown size={18} /> {t('programs.unlock')}</Link>
                        </div>
                    ) : (
                        <>
                            <ol className="space-y-3">
                                {program.days.map((day, i) => (
                                    <li key={i}>
                                        <p className="mb-1 text-sm font-semibold"><span className="text-brand">{t('onboarding.day', { n: i + 1 })}</span> · {l10n(day.name)}</p>
                                        <ul className="space-y-1 text-sm">
                                            {day.slots.map(slot => {
                                                const timed = getExercise(slot.exerciseId)?.timed;
                                                const p = prescribe('salud', level, slot.role, timed);
                                                return (
                                                    <li key={slot.exerciseId}>
                                                        <Link to={`/ejercicios/${slot.exerciseId}`} className="flex justify-between gap-3 hover:text-brand">
                                                            <span className="truncate text-white/80">{exerciseName(slot.exerciseId)}</span>
                                                            <span className="shrink-0 tabular-nums text-white/45">{p.sets} × {fmtRange(p.repMin, p.repMax)}{timed ? ' s' : ''} · {fmtRest(p.restSec)}</span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </li>
                                ))}
                            </ol>
                            {current
                                ? <p className="mt-3 flex items-center justify-center gap-2 py-2 font-semibold text-good"><Check size={18} /> {t('programs.current')}</p>
                                : <button onClick={start} className="btn-primary mt-3 w-full">{t('mom.start')}</button>}
                        </>
                    )}
                </div>
            )}
        </article>
    );
};

// Pregnancy and after giving birth: gentle programs (home and gym), the deep
// core for diastasis, and what to eat at each stage. Part free, all with Premium.
export default function Mom() {
    const navigate = useNavigate();
    const premium = usePremiumActive();
    const [stage, setStage] = useState<Stage>('embarazo');
    const programs = PROGRAMS.filter(p => p.mom === stage);
    const tips = Array.from({ length: NUTRITION[stage] }, (_, i) => t(`mom.food.${stage}.${i + 1}` as Key));

    return (
        <div className="space-y-5 pb-4">
            <header className="bleed-top relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-rose-400 via-pink-500 to-violet-600 px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] text-snow shadow-lg shadow-pink-500/25">
                <Photo photo={{ ...namedCover('mujer-disco'), position: '52% 20%' }} className="opacity-40" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-rose-400/70 via-pink-500/60 to-violet-600/70" />
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="relative -ml-2 rounded-lg p-2 text-snow/85 hover:bg-snow/10"><ChevronLeft size={22} /></button>
                <span className="relative mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-snow/20 backdrop-blur"><Baby size={26} /></span>
                <h1 className="relative mt-3 text-3xl font-extrabold tracking-tight drop-shadow">{t('mom.title')}</h1>
                <p className="relative text-sm text-snow/90">{t('mom.subtitle')}</p>
            </header>

            <Section>
                <Chips<Stage> label={t('mom.stage')} value={stage} onChange={setStage} options={[
                    { value: 'embarazo', label: t('mom.stage.embarazo') },
                    { value: 'posparto', label: t('mom.stage.posparto') },
                    { value: 'diastasis', label: t('mom.stage.diastasis') },
                ]} />
                <p className="mt-3 text-sm text-white/65">{t(`mom.intro.${stage}`)}</p>
            </Section>

            <Section title={t('mom.programs')}>
                <div className="space-y-2">
                    {programs.map(p => <ProgramCard key={p.id} program={p} premium={premium} />)}
                </div>
            </Section>

            <Section title={t(stage === 'diastasis' ? 'mom.habits' : 'mom.nutrition')}>
                <ul className="card divide-y divide-line">
                    {tips.slice(0, FREE_TIPS).map((tip, i) => (
                        <li key={i} className="flex gap-3 p-3 text-sm text-white/80"><Salad size={18} className="mt-0.5 shrink-0 text-good" />{tip}</li>
                    ))}
                    {premium ? tips.slice(FREE_TIPS).map((tip, i) => (
                        <li key={i} className="flex gap-3 p-3 text-sm text-white/80"><Salad size={18} className="mt-0.5 shrink-0 text-good" />{tip}</li>
                    )) : (
                        <li className="relative p-3">
                            <p aria-hidden className="select-none text-sm text-white/80 blur-[5px]">{tips[FREE_TIPS]}</p>
                            <Link to="/premium" className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-brand">
                                <Crown size={16} /> {t('mom.moreTips', { n: tips.length - FREE_TIPS })}
                            </Link>
                        </li>
                    )}
                </ul>
            </Section>

            <Section>
                <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
                    <p className="flex gap-2 font-semibold text-amber-500"><Stethoscope size={18} className="shrink-0" /> {t('mom.safety.title')}</p>
                    <p className="text-white/75">{t('mom.safety.text')}</p>
                    <p className="flex gap-2 text-white/75"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" /> {t('mom.safety.stop')}</p>
                    <p className="flex gap-2 text-white/75"><HeartHandshake size={16} className="mt-0.5 shrink-0 text-brand" /> {t('mom.safety.physio')}</p>
                </div>
            </Section>
        </div>
    );
}
