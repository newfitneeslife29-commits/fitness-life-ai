import { BadgeCheck, Check, ChevronDown, CircleAlert, CreditCard, ExternalLink, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { t } from '../i18n';
import { errorText } from '../lib/errorText';
import {
    contactLink, CURRENCIES, fetchApplications, fetchClientCounts, formatMoney, isTrainerAdmin, reviewApplication, trainerLanguages, trainerShareCents, type Trainer,
} from '../lib/trainers';

const input = 'w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand';
const STATUS_TONE = { pending: 'bg-amber-400/15 text-amber-500', approved: 'bg-good/15 text-good', rejected: 'bg-red-500/15 text-red-400' } as const;
const validLink = (url: string) => url.trim() === '' || /^https:\/\/\S+$/.test(url.trim());
// "49", "49.5" or "49,50" → cents.
const toCents = (v: string) => {
    const n = Number(v.replace(',', '.').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? Math.min(Math.round(n * 100), 1_000_000) : 0;
};

const Application = ({ app, clients, onSaved }: { app: Trainer; clients: number; onSaved: () => void }) => {
    const [open, setOpen] = useState(app.status === 'pending');
    const [amount, setAmount] = useState(app.priceCents > 0 ? String(app.priceCents / 100) : '');
    const [currency, setCurrency] = useState(app.currency || 'usd');
    const [fee, setFee] = useState(String(app.feePercent));
    const [link, setLink] = useState(app.paymentUrl);
    const [busy, setBusy] = useState(false);
    const contact = contactLink(app.contact);
    const cents = toCents(amount);
    const feePercent = Math.min(90, Math.max(0, Math.round(Number(fee) || 0)));
    const save = async (status: Trainer['status']) => {
        if (!validLink(link)) { toast(t('admin.badLink'), 3500); return; }
        if (status === 'approved' && amount.trim() !== '' && cents < 100) { toast(t('admin.badPrice'), 3500); return; }
        setBusy(true);
        try {
            await reviewApplication(app.id, { status, priceCents: cents, currency, feePercent, paymentUrl: link });
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
                        <p className={`flex items-start gap-2 text-sm ${app.payoutsReady ? 'text-good' : 'text-amber-500'}`}>
                            {app.payoutsReady ? <BadgeCheck size={16} className="mt-0.5 shrink-0" /> : <CircleAlert size={16} className="mt-0.5 shrink-0" />}
                            {t(app.payoutsReady ? 'admin.payoutsReady' : 'admin.payoutsMissing')}
                        </p>
                        {clients > 0 && <p className="flex items-center gap-2 text-sm text-white/70"><Users size={16} className="shrink-0" /> {t('admin.clients', { n: clients })}</p>}
                        <div className="flex gap-2">
                            <label className="block min-w-0 flex-1">
                                <span className="label mb-1 block">{t('admin.amount')}</span>
                                <input className={input} value={amount} inputMode="decimal" placeholder="49" onChange={e => setAmount(e.target.value)} />
                            </label>
                            <label className="block w-28">
                                <span className="label mb-1 block">{t('admin.currency')}</span>
                                <select className={input} value={currency} onChange={e => setCurrency(e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                </select>
                            </label>
                            <label className="block w-24">
                                <span className="label mb-1 block">{t('admin.fee')}</span>
                                <input className={input} value={fee} inputMode="numeric" onChange={e => setFee(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                            </label>
                        </div>
                        {cents > 0 && (
                            <p className="text-xs text-white/60">
                                {t('admin.split', { share: formatMoney(trainerShareCents(cents, feePercent), currency), fee: formatMoney(cents - trainerShareCents(cents, feePercent), currency) })}
                            </p>
                        )}
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
    const [counts, setCounts] = useState<Record<string, number>>({});
    const load = () => {
        setFailed(null);
        fetchApplications().then(setApps).catch(e => { setFailed(errorText(e)); setApps([]); });
        void fetchClientCounts().then(setCounts);
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
                                : <div className="space-y-2">{g.items.map(a => <Application key={a.id} app={a} clients={counts[a.id] ?? 0} onSaved={load} />)}</div>}
                        </Section>
                    ))}
                </>
            )}
        </div>
    );
}
