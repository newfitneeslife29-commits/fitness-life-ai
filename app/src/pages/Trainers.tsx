import { BadgeCheck, ChevronDown, CreditCard, Globe2, GraduationCap, Info, Languages, MessageCircle, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BackHeader, Section } from '../components/ui';
import { t, tp } from '../i18n';
import { errorText } from '../lib/errorText';
import { contactLink, fetchTrainers, isTrainerAdmin, trainerLanguages, trainersAvailable, type Trainer } from '../lib/trainers';

const TrainerCard = ({ trainer }: { trainer: Trainer }) => {
    const [open, setOpen] = useState(false);
    const link = contactLink(trainer.contact);
    const langs = trainerLanguages(trainer.languages);
    return (
        <article className="card overflow-hidden" aria-label={trainer.name}>
            <div className="flex gap-3 p-4">
                <span className="h-fit rounded-full bg-gradient-to-tr from-amber-400 via-brand to-fuchsia-500 p-[2px]">
                    <span className="block rounded-full bg-ink-2 p-[2px]"><Avatar src={trainer.avatarUrl} name={trainer.name} size={56} /></span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-bold">{trainer.name} <BadgeCheck size={16} className="shrink-0 text-sky-400" aria-label={t('trainers.verified')} /></p>
                    <p className="text-sm font-medium text-brand">{trainer.specialty}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/55">
                        {trainer.experienceYears > 0 && <span>{tp('trainers.years', trainer.experienceYears)}</span>}
                        {trainer.country && <span className="flex items-center gap-1"><Globe2 size={12} /> {trainer.country}</span>}
                    </p>
                </div>
                {trainer.appPrice && <span className="h-fit shrink-0 rounded-full bg-good/15 px-2.5 py-1 text-xs font-bold text-good">{trainer.appPrice}</span>}
            </div>
            {langs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3" aria-label={t('trainers.speaks')}>
                    <span className="flex items-center gap-1 text-xs font-semibold text-white/55"><Languages size={13} /> {t('trainers.speaks')}:</span>
                    {langs.map(l => (
                        <span key={l.code} className="inline-flex items-center gap-1 rounded-full bg-ink-3 px-2 py-0.5 text-xs text-white/80">
                            {l.flag && <span aria-hidden>{l.flag}</span>}{l.label}
                        </span>
                    ))}
                </div>
            )}
            <p className={`px-4 text-sm leading-relaxed text-white/75 ${open ? '' : 'line-clamp-3'}`}>{trainer.bio}</p>
            {open && trainer.certifications && (
                <p className="mt-2 flex gap-2 px-4 text-sm text-white/65"><GraduationCap size={16} className="mt-0.5 shrink-0 text-brand" /> {trainer.certifications}</p>
            )}
            <div className="flex gap-2 p-4 pt-3">
                <button onClick={() => setOpen(o => !o)} className="btn-ghost flex-1 py-2 text-sm">
                    <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} /> {t(open ? 'trainers.less' : 'trainers.more')}
                </button>
                {trainer.paymentUrl
                    ? <a href={trainer.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 py-2 text-sm"><CreditCard size={16} /> {t('trainers.hire')}</a>
                    : link
                        ? <a href={link} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 py-2 text-sm"><MessageCircle size={16} /> {t('trainers.contact')}</a>
                        : trainer.contact
                            ? <span className="flex-1 select-all rounded-xl bg-ink-3 px-3 py-2 text-center text-sm">{trainer.contact}</span>
                            : null}
            </div>
            {trainer.paymentUrl && <p className="-mt-1 px-4 pb-4 text-xs text-white/45">{t('trainers.hireHint')}</p>}
        </article>
    );
};

// Real trainers who coach online, reviewed by the Fitness Life team.
export default function Trainers() {
    const navigate = useNavigate();
    const [trainers, setTrainers] = useState<Trainer[] | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [admin, setAdmin] = useState(false);
    const [lang, setLang] = useState<string | null>(null);
    const load = () => {
        setFailed(null);
        setTrainers(null);
        fetchTrainers().then(setTrainers).catch(e => { setFailed(errorText(e)); setTrainers([]); });
    };
    useEffect(() => {
        if (!trainersAvailable()) return;
        load();
        void isTrainerAdmin().then(setAdmin, () => setAdmin(false));
    }, []);
    // Filter by the languages the listed trainers speak.
    const languages = [...new Map((trainers ?? []).flatMap(tr => trainerLanguages(tr.languages)).map(l => [l.code, l])).values()];
    const shown = lang ? (trainers ?? []).filter(tr => trainerLanguages(tr.languages).some(l => l.code === lang)) : trainers ?? [];

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('trainers.title')} subtitle={t('trainers.subtitle')} icon={<Users size={20} />} />
            <Section>
                <p className="flex gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-3 text-xs text-white/70">
                    <Info size={16} className="mt-0.5 shrink-0 text-sky-400" /> {t('trainers.note')}
                </p>
            </Section>
            <Section>
                {!trainersAvailable() ? (
                    <p className="card p-6 text-center text-sm text-white/60">{t('community.unavailable')}</p>
                ) : trainers === null ? (
                    <div className="space-y-3" role="status" aria-label={t('community.loading')}>
                        {[0, 1].map(i => <div key={i} className="card h-36 animate-pulse" />)}
                    </div>
                ) : trainers.length === 0 ? (
                    <div className="card p-6 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand"><Users size={22} /></span>
                        <p className="font-semibold">{t(failed ? 'community.loadFailed' : 'trainers.empty')}</p>
                        {failed ? (
                            <>
                                <p className="mt-1 break-words text-xs text-white/40">{failed}</p>
                                <button className="btn-ghost mt-3" onClick={load}><RefreshCw size={16} /> {t('community.retry')}</button>
                            </>
                        ) : <p className="mt-1 text-sm text-white/60">{t('trainers.emptyHint')}</p>}
                    </div>
                ) : (
                    <>
                        {languages.length > 1 && (
                            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="radiogroup" aria-label={t('trainers.filterLang')}>
                                <button role="radio" aria-checked={lang === null} onClick={() => setLang(null)} className={`chip shrink-0 ${lang === null ? 'chip-on' : ''}`}>{t('trainers.allLangs')}</button>
                                {languages.map(l => (
                                    <button key={l.code} role="radio" aria-checked={lang === l.code} onClick={() => setLang(l.code)} className={`chip shrink-0 ${lang === l.code ? 'chip-on' : ''}`}>
                                        {l.flag && <span aria-hidden>{l.flag} </span>}{l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="space-y-3">{shown.map(tr => <TrainerCard key={tr.id} trainer={tr} />)}</div>
                    </>
                )}
            </Section>
            {admin && (
                <Section>
                    <button onClick={() => navigate('/entrenadores/admin')} className="card flex w-full items-center gap-3 border-amber-400/40 p-4 text-left hover:bg-ink-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500"><ShieldCheck size={20} /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t('admin.title')}</span>
                            <span className="block text-sm text-white/55">{t('admin.hint')}</span>
                        </span>
                    </button>
                </Section>
            )}
            <Section>
                <button onClick={() => navigate('/entrenadores/aplicar')} className="card flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-500 text-snow"><UserPlus size={20} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t('trainers.applyTitle')}</span>
                        <span className="block text-sm text-white/55">{t('trainers.applyHint')}</span>
                    </span>
                </button>
                <Link to="/entrenador" className="mt-2 block text-center text-sm text-white/55 underline">{t('trainers.ai')}</Link>
            </Section>
        </div>
    );
}
