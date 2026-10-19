import { Check, ChevronDown, CreditCard, ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { t } from '../i18n';
import { errorText } from '../lib/errorText';
import { contactLink, fetchApplications, isTrainerAdmin, reviewApplication, trainerLanguages, type Trainer } from '../lib/trainers';

const input = 'w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand';
const STATUS_TONE = { pending: 'bg-amber-400/15 text-amber-500', approved: 'bg-good/15 text-good', rejected: 'bg-red-500/15 text-red-400' } as const;
const validLink = (url: string) => url.trim() === '' || /^https:\/\/\S+$/.test(url.trim());

const Application = ({ app, onSaved }: { app: Trainer; onSaved: () => void }) => {
    const [open, setOpen] = useState(app.status === 'pending');
    const [price, setPrice] = useState(app.appPrice);
    const [link, setLink] = useState(app.paymentUrl);
    const [busy, setBusy] = useState(false);
    const contact = contactLink(app.contact);
    const save = async (status: Trainer['status']) => {
        if (!validLink(link)) { toast(t('admin.badLink'), 3500); return; }
        setBusy(true);
        try {
            await reviewApplication(app.id, { status, appPrice: price, paymentUrl: link });
            toast(t(status === 'approved' ? 'admin.approved' : status === 'rejected' ? 'admin.rejected' : 'admin.saved'));
            onSaved();
        } catch (e) {
            toast(errorText(e), 4000);
        } finally {
            setBusy(false);
        }
    };
    return (
        <article className="card overflow-hidden" aria-label={app.name}>
            <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
                <Avatar src={app.avatarUrl} name={app.name} size={44} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{app.name}</span>
                    <span className="block truncate text-sm text-white/55">{app.specialty}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[app.status]}`}>{t(`admin.status.${app.status}`)}</span>
                <ChevronDown size={18} className={`shrink-0 text-white/40 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="space-y-4 border-t border-line p-4">
                    <dl className="space-y-2 text-sm">
                        <div><dt className="label">{t('apply.bio')}</dt><dd className="mt-0.5 text-white/80">{app.bio}</dd></div>
                        {app.certifications && <div><dt className="label">{t('apply.certifications')}</dt><dd className="mt-0.5 text-white/80">{app.certifications}</dd></div>}
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div><dt className="label">{t('apply.years')}</dt><dd className="mt-0.5">{app.experienceYears}</dd></div>
                            {app.country && <div><dt className="label">{t('apply.country')}</dt><dd className="mt-0.5">{app.country}</dd></div>}
                            <div><dt className="label">{t('admin.asks')}</dt><dd className="mt-0.5 font-semibold">{app.price || '—'}</dd></div>
                        </div>
                        <div><dt className="label">{t('apply.languages')}</dt><dd className="mt-0.5">{trainerLanguages(app.languages).map(l => `${l.flag} ${l.label}`.trim()).join(' · ') || '—'}</dd></div>
                        <div>
                            <dt className="label">{t('apply.contact')}</dt>
                            <dd className="mt-0.5">
                                {contact
                                    ? <a href={contact} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand underline">{app.contact} <ExternalLink size={13} /></a>
                                    : <span className="select-all">{app.contact}</span>}
                            </dd>
                        </div>
                    </dl>

                    <div className="space-y-3 rounded-2xl bg-ink-3/60 p-3">
                        <label className="block">
                            <span className="label mb-1 block">{t('admin.price')}</span>
                            <input className={input} value={price} maxLength={60} placeholder={t('admin.pricePlaceholder')} onChange={e => setPrice(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="label mb-1 block">{t('admin.link')}</span>
                            <input className={input} value={link} inputMode="url" placeholder="https://buy.stripe.com/…" onChange={e => setLink(e.target.value)} />
                            <span className="mt-1 block text-xs text-white/45">{t('admin.linkHint')}</span>
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {app.status !== 'approved' && (
                            <button disabled={busy} onClick={() => save('approved')} className="btn-primary flex-1"><Check size={16} /> {t('admin.approve')}</button>
                        )}
                        {app.status === 'approved' && (
                            <button disabled={busy} onClick={() => save('approved')} className="btn-primary flex-1"><CreditCard size={16} /> {t('admin.save')}</button>
                        )}
                        {app.status !== 'rejected' && (
                            <button disabled={busy} onClick={() => save('rejected')} className="btn-danger flex-1"><X size={16} /> {t(app.status === 'approved' ? 'admin.hide' : 'admin.reject')}</button>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

// The team's view: every application, to approve, reject and price.
export default function TrainerAdmin() {
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [apps, setApps] = useState<Trainer[] | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const load = () => {
        setFailed(null);
        fetchApplications().then(setApps).catch(e => { setFailed(errorText(e)); setApps([]); });
    };
    useEffect(() => {
        void isTrainerAdmin().then(ok => { setAllowed(ok); if (ok) load(); }, () => setAllowed(false));
    }, []);
    const groups = (['pending', 'approved', 'rejected'] as const).map(status => ({ status, items: (apps ?? []).filter(a => a.status === status) }));

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('admin.title')} subtitle={t('admin.subtitle')} icon={<ShieldCheck size={20} />} />
            {allowed === false ? (
                <Section><p className="card p-6 text-center text-sm text-white/60">{t('admin.notAllowed')}</p></Section>
            ) : allowed === null || apps === null ? (
                <Section><div className="card h-32 animate-pulse" role="status" aria-label={t('community.loading')} /></Section>
            ) : failed ? (
                <Section>
                    <div className="card p-6 text-center">
                        <p className="font-semibold">{t('community.loadFailed')}</p>
                        <p className="mt-1 break-words text-xs text-white/40">{failed}</p>
                        <button className="btn-ghost mt-3" onClick={load}><RefreshCw size={16} /> {t('community.retry')}</button>
                    </div>
                </Section>
            ) : (
                <>
                    <Section>
                        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-white/75">{t('admin.how')}</p>
                    </Section>
                    {groups.map(g => (
                        <Section key={g.status} title={`${t(`admin.group.${g.status}`)} (${g.items.length})`}>
                            {g.items.length === 0
                                ? <p className="text-sm text-white/45">{t('admin.none')}</p>
                                : <div className="space-y-2">{g.items.map(a => <Application key={a.id} app={a} onSaved={load} />)}</div>}
                        </Section>
                    ))}
                </>
            )}
        </div>
    );
}
