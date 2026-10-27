import { Capacitor } from '@capacitor/core';
import { BadgeCheck, ChevronDown, ChevronRight, ClipboardList, CreditCard, Globe2, GraduationCap, Info, Languages, Loader2, MessageCircle, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/feedback';
import { ProgramsSheet } from '../components/Programs';
import { RatingLine, ReviewSheet, ReviewsSheet } from '../components/TrainerExtras';
import { fetchPrograms, receivePrograms, type Program } from '../lib/programs';
import { BackHeader, Section } from '../components/ui';
import { t, tp } from '../i18n';
import { errorText } from '../lib/errorText';
import { enablePush } from '../lib/push';
import { fetchHires, hireState, hireTrainer, PayError, STRIPE_RETURN_EVENT, syncHires, type Hire } from '../lib/trainerPay';
import { fetchRatings, receiveRoutines, type Rating } from '../lib/trainerTools';
import { contactLink, displayPrice, fetchMyApplication, fetchTrainers, isTrainerAdmin, trainerLanguages, trainersAvailable, type Trainer } from '../lib/trainers';
import { useStore } from '../store/store';

const TrainerCard = ({ trainer, hire, busy, onHire, rating, onReviews, programs, onPrograms }: {
    trainer: Trainer; hire?: Hire; busy: boolean; onHire: (tr: Trainer) => void; rating?: Rating; onReviews: (tr: Trainer) => void;
    programs: number; onPrograms: (tr: Trainer) => void;
}) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const link = contactLink(trainer.contact);
    const langs = trainerLanguages(trainer.languages);
    const price = displayPrice(trainer);
    return (
        <article className="card overflow-hidden" aria-label={trainer.name}>
            <div className="flex gap-3 p-4">
                <span className="h-fit rounded-full bg-gradient-to-tr from-amber-400 via-brand to-fuchsia-500 p-[2px]">
                    <span className="block rounded-full bg-ink-2 p-[2px]"><Avatar src={trainer.avatarUrl} name={trainer.name} size={56} /></span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-bold">{trainer.name} <BadgeCheck size={16} className="shrink-0 text-sky-400" aria-label={t('trainers.verified')} /></p>
                    <p className="text-sm font-medium text-brand">{trainer.specialty}</p>
                    <RatingLine rating={rating} onClick={() => onReviews(trainer)} />
                    {programs > 0 && (
                        <button onClick={() => onPrograms(trainer)} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                            <ClipboardList size={13} /> {tp('tprog.count', programs)}
                        </button>
                    )}
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/55">
                        {trainer.experienceYears > 0 && <span>{tp('trainers.years', trainer.experienceYears)}</span>}
                        {trainer.country && <span className="flex items-center gap-1"><Globe2 size={12} /> {trainer.country}</span>}
                    </p>
                </div>
                {price && <span className="h-fit shrink-0 rounded-full bg-good/15 px-2.5 py-1 text-xs font-bold text-good">{price}</span>}
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
                {hire
                    ? <button onClick={() => navigate(`/entrenadores/chat/${hire.id}`)} className="btn-primary flex-1 py-2 text-sm"><MessageCircle size={16} /> {t('trainers.openChat')}</button>
                    : trainer.hireInApp
                    ? <button disabled={busy} onClick={() => onHire(trainer)} className="btn-primary flex-1 py-2 text-sm">
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} {t('trainers.hire')}
                    </button>
                    : trainer.paymentUrl
                    ? <a href={trainer.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 py-2 text-sm"><CreditCard size={16} /> {t('trainers.hire')}</a>
                    : link
                        ? <a href={link} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 py-2 text-sm"><MessageCircle size={16} /> {t('trainers.contact')}</a>
                        : trainer.contact
                            ? <span className="flex-1 select-all rounded-xl bg-ink-3 px-3 py-2 text-center text-sm">{trainer.contact}</span>
                            : null}
            </div>
            {!hire && (trainer.hireInApp || trainer.paymentUrl) && (
                <p className="-mt-1 px-4 pb-4 text-xs text-white/45">{t(trainer.hireInApp ? 'trainers.hireInAppHint' : 'trainers.hireHint')}</p>
            )}
        </article>
    );
};

// Real trainers who coach online, reviewed by the Fitness Life team.
export default function Trainers() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const account = useStore(s => s.account);
    const profileName = useStore(s => s.profile?.name ?? '');
    const [trainers, setTrainers] = useState<Trainer[] | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [admin, setAdmin] = useState(false);
    const [coach, setCoach] = useState(false);
    const [hires, setHires] = useState<Hire[]>([]);
    const [hiring, setHiring] = useState<string | null>(null);
    const [lang, setLang] = useState<string | null>(null);
    const [ratings, setRatings] = useState<Record<string, Rating>>({});
    const [reviewsOf, setReviewsOf] = useState<Trainer | null>(null);
    const [rating, setRating] = useState<Trainer | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [programsOf, setProgramsOf] = useState<Trainer | null>(null);
    // Programs on sale; the ones bought go into Routines. The iPhone app
    // doesn't sell them: they are digital content, which App Review only
    // allows through in-app purchase (3.1.1). It only lists the ones already
    // bought. Hiring a trainer is a 1:1 service and stays (3.1.3(d)).
    const loadPrograms = async () => {
        const list = await fetchPrograms().catch(() => [] as Program[]);
        setPrograms(Capacitor.getPlatform() === 'ios' ? list.filter(p => p.owned) : list);
        if (account) for (const name of await receivePrograms(list).catch(() => [])) toast(t('tprog.received', { name }), 4500);
    };
    const load = () => {
        setFailed(null);
        setTrainers(null);
        fetchTrainers().then(setTrainers).catch(e => { setFailed(errorText(e)); setTrainers([]); });
        void fetchRatings().then(setRatings, () => {});
    };
    const loadHires = () => fetchHires().then(setHires, () => {});
    // Someone with a trainer hears about their messages.
    const hasHires = hires.length > 0;
    useEffect(() => {
        if (!hasHires) return;
        void enablePush();
        void receiveRoutines().then(names => names.forEach(name => toast(t('coachRoutine.received', { name }), 4500))).catch(() => {});
    }, [hasHires]);
    useEffect(() => {
        if (!trainersAvailable()) return;
        load();
        void isTrainerAdmin().then(setAdmin, () => setAdmin(false));
    }, []);
    useEffect(() => {
        if (trainersAvailable()) void loadPrograms();
    }, [account?.id]);
    useEffect(() => {
        if (!account || !trainersAvailable()) return;
        void loadHires();
        void fetchMyApplication().then(a => setCoach(!!a), () => {});
    }, [account?.id]);

    // Back from Stripe: save the hire and open its chat.
    const backFromStripe = async (to: string) => {
        if (to === 'canceled' || !account) return;
        if (to === 'hired' || to === 'bought') toast(t('trainers.checkingPayment'));
        try {
            const hired = await syncHires();
            await loadHires();
            if (to === 'bought') {
                await loadPrograms();
                return;
            }
            if (hired) {
                toast(t('trainers.hiredToast'), 4000);
                navigate(`/entrenadores/chat/${hired}`);
            } else if (to === 'hired') {
                toast(t('trainers.paymentPending'), 5000);
            }
        } catch {
            if (to === 'hired') toast(t('trainers.paymentPending'), 5000);
        }
    };
    useEffect(() => {
        // On the web the page reloads: wait for the account to be back.
        const to = params.get('stripe');
        if (to && account) {
            setParams({}, { replace: true });
            void backFromStripe(to);
        }
        const onReturn = (e: Event) => void backFromStripe((e as CustomEvent<string>).detail);
        window.addEventListener(STRIPE_RETURN_EVENT, onReturn);
        return () => window.removeEventListener(STRIPE_RETURN_EVENT, onReturn);
    }, [account?.id]);

    const hire = async (tr: Trainer) => {
        if (!account) {
            toast(t('trainers.needAccount'), 3500);
            navigate('/cuenta');
            return;
        }
        setHiring(tr.id);
        try {
            await hireTrainer(tr.id, profileName);
        } catch (e) {
            toast(t(`pay.err.${e instanceof PayError ? e.code : 'failed'}`), 4500);
        } finally {
            setHiring(null);
        }
    };
    const mine = hires.filter(h => h.role === 'client');
    const current = (trainerId: string) => mine.find(h => h.trainerId === trainerId && h.open);
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
            {mine.length > 0 && (
                <Section title={t('trainers.mine')}>
                    <div className="space-y-2">
                        {mine.map(h => (
                            <button key={h.id} onClick={() => navigate(`/entrenadores/chat/${h.id}`)} className="card flex w-full items-center gap-3 p-3 text-left hover:bg-ink-3">
                                <Avatar src={h.trainerAvatar} name={h.trainerName || '?'} size={44} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{h.trainerName}</span>
                                    <span className="block truncate text-xs text-white/55">{t(`hire.${hireState(h)}`)}</span>
                                </span>
                                {h.unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink" aria-label={t('chat.unread', { n: h.unread })}>{h.unread}</span>}
                                <MessageCircle size={18} className="shrink-0 text-white/40" />
                            </button>
                        ))}
                    </div>
                </Section>
            )}
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
                        <div className="space-y-3">{shown.map(tr => <TrainerCard key={tr.id} trainer={tr} hire={current(tr.id)} busy={hiring === tr.id} onHire={hire} rating={ratings[tr.id]} onReviews={setReviewsOf}
                            programs={programs.filter(p => p.trainerId === tr.id).length} onPrograms={setProgramsOf} />)}</div>
                    </>
                )}
            </Section>
            {coach && (
                <Section>
                    <button onClick={() => navigate('/entrenadores/panel')} className="card flex w-full items-center gap-3 border-brand/40 p-4 text-left hover:bg-ink-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><BadgeCheck size={20} /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t('trainers.panelTitle')}</span>
                            <span className="block text-sm text-white/55">{t('trainers.panelHint')}</span>
                        </span>
                        {hires.some(h => h.role === 'trainer' && h.unread > 0) && <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-label={t('chat.newMessages')} />}
                        <ChevronRight size={18} className="shrink-0 text-white/30" />
                    </button>
                </Section>
            )}
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
            {reviewsOf && (
                <ReviewsSheet open trainerId={reviewsOf.id} name={reviewsOf.name} onClose={() => setReviewsOf(null)}
                    onRate={hires.some(h => h.role === 'client' && h.trainerId === reviewsOf.id) ? () => { setRating(reviewsOf); setReviewsOf(null); } : undefined} />
            )}
            {programsOf && (
                <ProgramsSheet name={programsOf.name} programs={programs.filter(p => p.trainerId === programsOf.id)} onClose={() => setProgramsOf(null)} />
            )}
            {rating && (
                <ReviewSheet open trainerId={rating.id} name={rating.name} onClose={() => { setRating(null); void fetchRatings().then(setRatings, () => {}); }} />
            )}
        </div>
    );
}
