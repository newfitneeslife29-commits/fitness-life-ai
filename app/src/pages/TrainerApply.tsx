import { CheckCircle2, Clock, Send, Trash2, UserPlus, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { LANGS, t } from '../i18n';
import { contactLink, fetchMyApplication, saveApplication, trainerLanguages, trainersAvailable, withdrawApplication, type Trainer, type TrainerFields } from '../lib/trainers';
import { useStore } from '../store/store';

const EMPTY: TrainerFields = { name: '', specialty: '', bio: '', experienceYears: 0, certifications: '', languages: '', price: '', contact: '', country: '' };

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
    <label className="block min-w-0 flex-1">
        <span className="label mb-1 block">{label}</span>
        {children}
        {hint && <span className="mt-1 block text-xs text-white/45">{hint}</span>}
    </label>
);
const input = 'w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand';

const STATUS = {
    pending: { icon: <Clock size={20} />, tone: 'border-amber-400/30 bg-amber-400/10 text-amber-500' },
    approved: { icon: <CheckCircle2 size={20} />, tone: 'border-good/30 bg-good/10 text-good' },
    rejected: { icon: <XCircle size={20} />, tone: 'border-red-400/30 bg-red-500/10 text-red-400' },
} as const;

// Ajustes → "Become an online trainer": the application the team reviews.
export default function TrainerApply() {
    const account = useStore(s => s.account);
    const profileName = useStore(s => s.profile?.name ?? '');
    const [mine, setMine] = useState<Trainer | null | undefined>(undefined);
    const [f, setF] = useState<TrainerFields>({ ...EMPTY, name: profileName });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (patch: Partial<TrainerFields>) => setF(v => ({ ...v, ...patch }));

    useEffect(() => {
        if (!account || !trainersAvailable()) return;
        fetchMyApplication().then(a => {
            setMine(a);
            if (a) setF({ name: a.name, specialty: a.specialty, bio: a.bio, experienceYears: a.experienceYears, certifications: a.certifications, languages: a.languages, price: a.price, contact: a.contact, country: a.country });
        }).catch(() => setMine(null));
    }, [account?.id]);

    // Saved as codes ("es,en"); an older free-text answer is read as best it can.
    const langs = trainerLanguages(f.languages).map(l => l.code).filter(c => LANGS.some(l => l.code === c));
    const toggleLang = (code: string) => set({ languages: (langs.includes(code) ? langs.filter(c => c !== code) : [...langs, code]).join(',') });

    const problem = f.name.trim().length < 2 ? 'name' : f.specialty.trim().length < 2 ? 'specialty' : f.bio.trim().length < 20 ? 'bio'
        : langs.length === 0 ? 'languages'
        : !contactLink(f.contact) && f.contact.trim().length < 3 ? 'contact' : null;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (problem) { setError(t(`apply.err.${problem}`)); return; }
        setBusy(true);
        setError(null);
        try {
            await saveApplication(f);
            setMine(await fetchMyApplication());
            toast(t('apply.sent'), 4000);
        } catch {
            setError(t('apply.err.failed'));
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async () => {
        if (!(await confirm({ title: t('apply.withdrawTitle'), message: t('apply.withdrawMessage'), confirmLabel: t('apply.withdraw'), danger: true }))) return;
        try {
            await withdrawApplication();
            setMine(null);
            toast(t('apply.withdrawn'));
        } catch {
            toast(t('apply.err.failed'));
        }
    };

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('trainers.applyTitle')} subtitle={t('apply.subtitle')} icon={<UserPlus size={20} />} />
            {!trainersAvailable() ? (
                <Section><p className="card p-4 text-sm text-white/70">{t('community.unavailable')}</p></Section>
            ) : !account ? (
                <Section>
                    <div className="card p-5 text-center">
                        <p className="font-semibold">{t('apply.needAccount')}</p>
                        <Link to="/cuenta" className="btn-primary mt-4 w-full">{t('account.cta')}</Link>
                    </div>
                </Section>
            ) : mine === undefined ? (
                <Section><div className="card h-40 animate-pulse" role="status" aria-label={t('community.loading')} /></Section>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    {mine && (
                        <Section>
                            <div className={`flex items-start gap-3 rounded-2xl border p-4 ${STATUS[mine.status].tone}`}>
                                <span className="mt-0.5 shrink-0">{STATUS[mine.status].icon}</span>
                                <span className="text-sm">
                                    <span className="block font-bold">{t(`apply.status.${mine.status}`)}</span>
                                    <span className="block text-white/70">{t(`apply.status.${mine.status}.hint`)}</span>
                                    {mine.status === 'approved' && mine.appPrice && <span className="mt-1 block font-semibold text-white">{t('apply.appPrice', { price: mine.appPrice })}</span>}
                                </span>
                            </div>
                        </Section>
                    )}
                    <Section>
                        <div className="card space-y-4 p-4">
                            <Field label={t('apply.name')}><input className={input} value={f.name} maxLength={60} onChange={e => set({ name: e.target.value })} /></Field>
                            <Field label={t('apply.specialty')} hint={t('apply.specialtyHint')}><input className={input} value={f.specialty} maxLength={100} onChange={e => set({ specialty: e.target.value })} /></Field>
                            <Field label={t('apply.bio')} hint={t('apply.bioHint')}>
                                <textarea className={`${input} resize-none`} rows={5} value={f.bio} maxLength={800} onChange={e => set({ bio: e.target.value })} />
                            </Field>
                            <div className="flex gap-3">
                                <Field label={t('apply.years')}>
                                    <input className={input} inputMode="numeric" value={f.experienceYears || ''} onChange={e => set({ experienceYears: Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                                </Field>
                                <Field label={t('apply.country')}><input className={input} value={f.country} maxLength={60} onChange={e => set({ country: e.target.value })} /></Field>
                            </div>
                            <Field label={t('apply.certifications')} hint={t('apply.certificationsHint')}><input className={input} value={f.certifications} maxLength={300} onChange={e => set({ certifications: e.target.value })} /></Field>
                            <fieldset>
                                <legend className="label mb-2 block">{t('apply.languages')}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {LANGS.map(l => {
                                        const on = langs.includes(l.code);
                                        return (
                                            <button key={l.code} type="button" role="checkbox" aria-checked={on} onClick={() => toggleLang(l.code)}
                                                className={`chip flex items-center gap-1.5 ${on ? 'chip-on' : ''}`}>
                                                <span aria-hidden>{l.flag}</span> {l.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                            <Field label={t('apply.price')} hint={t('apply.priceHint')}><input className={input} value={f.price} maxLength={60} onChange={e => set({ price: e.target.value })} /></Field>
                            <Field label={t('apply.contact')} hint={t('apply.contactHint')}><input className={input} value={f.contact} maxLength={200} onChange={e => set({ contact: e.target.value })} /></Field>
                        </div>
                        <p className="mt-2 text-xs text-white/45">{t('apply.review')}</p>
                    </Section>
                    <Section>
                        {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
                        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5"><Send size={18} /> {t(mine ? 'apply.update' : 'apply.send')}</button>
                        {mine && <button type="button" onClick={withdraw} className="btn-ghost mt-2 w-full text-red-500"><Trash2 size={16} /> {t('apply.withdraw')}</button>}
                    </Section>
                </form>
            )}
        </div>
    );
}
