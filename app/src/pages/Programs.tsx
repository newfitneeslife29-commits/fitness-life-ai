import { Check, ChevronLeft, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Chips, Section, Sheet } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { adaptDays, pickProgram, programDescription, programName, PROGRAMS, type Program } from '../data/programs';
import { l10n, t, tp } from '../i18n';
import { usePremiumActive } from '../lib/premium';
import { actions, useStore } from '../store/store';
import type { Setup } from '../store/types';

type Filter = Setup | 'todos';

const ProgramSheet = ({ program, onClose }: { program: Program; onClose: () => void }) => {
    const profile = useStore(s => s.profile)!;
    const current = useStore(s => s.plan?.programId === program.id);
    const premium = usePremiumActive();
    const navigate = useNavigate();
    const limitations = profile.limitations ?? [];
    const days = adaptDays(program, limitations);
    const adapted = days.some((d, i) => d.slots.some((s, j) => s.exerciseId !== program.days[i].slots[j].exerciseId));
    const locked = program.premium && !premium;

    const use = async () => {
        const name = programName(program);
        const ok = await confirm({ title: t('settings.newPlan.title', { name }), message: t('settings.newPlan.message'), confirmLabel: t('settings.newPlan.confirm') });
        if (!ok) return;
        // The program the app would pick anyway is not pinned, so it can follow later profile changes.
        actions.chooseProgram(program.id === pickProgram(profile).id ? null : program.id);
        toast(t('settings.planUpdated', { name }));
        navigate('/rutinas');
    };

    return (
        <Sheet open onClose={onClose} title={programName(program)}>
            <p className="mb-4 text-white/70">{programDescription(program)}</p>
            {adapted && <p className="mb-4 rounded-xl bg-brand-soft p-3 text-sm text-brand-strong">{t('programs.adapted')}</p>}
            <ol className="space-y-2">
                {days.map((day, i) => (
                    <li key={i} className="card p-3">
                        <p className="mb-0.5 font-semibold"><span className="text-brand">{t('onboarding.day', { n: i + 1 })}</span> · {l10n(day.name)}</p>
                        <p className="text-sm text-white/55">{day.slots.map(s => exerciseName(s.exerciseId)).join(' · ')}</p>
                    </li>
                ))}
            </ol>
            <div className="mt-5">
                {current ? (
                    <p className="flex items-center justify-center gap-2 py-3 font-semibold text-good"><Check size={18} /> {t('programs.current')}</p>
                ) : locked ? (
                    <Link to="/premium" className="btn-primary w-full"><Crown size={18} /> {t('programs.unlock')}</Link>
                ) : (
                    <button onClick={use} className="btn-primary w-full">{t('programs.use')}</button>
                )}
            </div>
        </Sheet>
    );
};

const ProgramCard = ({ program, badge, onOpen }: { program: Program; badge?: string; onOpen: () => void }) => {
    const current = useStore(s => s.plan?.programId === program.id);
    return (
        <button onClick={onOpen} className={`card block w-full p-4 text-left hover:bg-ink-3 ${current ? 'border-brand' : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{programName(program)}</p>
                {program.premium && <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-400"><Crown size={12} /> Premium</span>}
                {current && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-snow">{t('programs.currentBadge')}</span>}
                {!current && badge && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-strong">{badge}</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-white/55">{programDescription(program)}</p>
            <p className="mt-2 text-xs text-white/40">{tp('programs.days', program.days.length)} · {t(`setup.${program.setup}.short`)}</p>
        </button>
    );
};

export default function Programs() {
    const profile = useStore(s => s.profile)!;
    const navigate = useNavigate();
    const [filter, setFilter] = useState<Filter>(profile.setup);
    const [open, setOpen] = useState<Program | null>(null);
    const recommended = pickProgram(profile);
    const shown = PROGRAMS.filter(p => filter === 'todos' || p.setup === filter);
    const groups: [string, Program[]][] = [
        [t('programs.beginner'), shown.filter(p => p.beginner)],
        [t('programs.free'), shown.filter(p => !p.beginner && !p.premium)],
        [t('programs.premium'), shown.filter(p => p.premium)],
    ];

    return (
        <div className="space-y-5">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('programs.title')}</h1>
                    <p className="text-sm text-white/55">{t('programs.subtitle')}</p>
                </div>
            </header>
            <Section>
                <Chips<Filter> label={t('settings.setup')} value={filter} onChange={setFilter} options={[
                    { value: 'gimnasio', label: t('setup.gimnasio.short') },
                    { value: 'mancuernas', label: t('setup.mancuernas.short') },
                    { value: 'casa', label: t('setup.casa.short') },
                    { value: 'todos', label: t('programs.all') },
                ]} />
            </Section>
            {groups.filter(([, list]) => list.length).map(([title, list]) => (
                <Section key={title} title={title}>
                    <div className="space-y-2">
                        {list.map(p => (
                            <ProgramCard key={p.id} program={p} badge={p.id === recommended.id ? t('programs.recommended') : undefined} onOpen={() => setOpen(p)} />
                        ))}
                    </div>
                </Section>
            ))}
            <Section>
                <p className="flex items-start gap-2 text-xs text-white/45"><Sparkles size={14} className="mt-0.5 shrink-0" /> {t('programs.note')}</p>
            </Section>
            {open && <ProgramSheet program={open} onClose={() => setOpen(null)} />}
        </div>
    );
}
