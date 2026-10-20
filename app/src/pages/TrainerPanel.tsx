import { BadgeCheck, Banknote, ChevronRight, ExternalLink, Landmark, MessageCircle, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { locale, t } from '../i18n';
import { enableChatPush } from '../lib/push';
import { displayPrice, fetchMyApplication, formatMoney, trainerShareCents, type Trainer } from '../lib/trainers';
import {
    connectPayouts, fetchHires, guessCountry, hireState, openPayoutDashboard, PAYOUT_COUNTRIES, PayError, payoutStatus, STRIPE_RETURN_EVENT, type Hire, type PayoutStatus,
} from '../lib/trainerPay';
import { useStore } from '../store/store';

const regionName = (code: string) => {
    try {
        return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) ?? code;
    } catch {
        return code;
    }
};

const payError = (e: unknown) => toast(t(`pay.err.${e instanceof PayError ? e.code : 'failed'}`), 4500);

// What an approved trainer manages: getting paid and their clients' chats.
export default function TrainerPanel() {
    const navigate = useNavigate();
    const account = useStore(s => s.account);
    const [mine, setMine] = useState<Trainer | null | undefined>(undefined);
    const [payouts, setPayouts] = useState<PayoutStatus | null | 'error'>(null);
    const [clients, setClients] = useState<Hire[] | null>(null);
    const [country, setCountry] = useState(guessCountry);
    const [busy, setBusy] = useState(false);

    const load = () => {
        fetchMyApplication().then(setMine, () => setMine(null));
        payoutStatus().then(setPayouts, e => setPayouts(e instanceof PayError && e.code === 'not_trainer' ? null : 'error'));
        fetchHires().then(h => setClients(h.filter(x => x.role === 'trainer')), () => setClients([]));
    };
    useEffect(() => {
        if (!account) return;
        load();
        // Back from Stripe's set-up pages.
        const back = () => load();
        window.addEventListener(STRIPE_RETURN_EVENT, back);
        return () => window.removeEventListener(STRIPE_RETURN_EVENT, back);
    }, [account?.id]);

    // Approved trainers hear about their clients' messages.
    useEffect(() => {
        if (mine?.status === 'approved') void enableChatPush();
    }, [mine?.status]);

    const run = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } catch (e) {
            payError(e);
        } finally {
            setBusy(false);
        }
    };

    const share = mine && mine.priceCents > 0 ? trainerShareCents(mine.priceCents, mine.feePercent) : 0;
    const active = (clients ?? []).filter(c => hireState(c) !== 'ended');
    const past = (clients ?? []).filter(c => hireState(c) === 'ended');

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('panel.title')} subtitle={t('panel.subtitle')} icon={<BadgeCheck size={20} />} />
            {!account ? (
                <Section>
                    <div className="card p-5 text-center">
                        <p className="font-semibold">{t('apply.needAccount')}</p>
                        <Link to="/cuenta" className="btn-primary mt-4 w-full">{t('account.cta')}</Link>
                    </div>
                </Section>
            ) : mine === undefined ? (
                <Section><div className="card h-40 animate-pulse" role="status" aria-label={t('community.loading')} /></Section>
            ) : !mine ? (
                <Section>
                    <div className="card p-5 text-center">
                        <p className="text-sm text-white/70">{t('pay.err.not_trainer')}</p>
                        <Link to="/entrenadores/aplicar" className="btn-primary mt-4 w-full">{t('trainers.applyTitle')}</Link>
                    </div>
                </Section>
            ) : (
                <>
                    {mine.status !== 'approved' && (
                        <Section><p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-white/75">{t('panel.notApproved')}</p></Section>
                    )}

                    <Section title={t('panel.price')}>
                        <div className="card p-4">
                            {mine.priceCents > 0 ? (
                                <>
                                    <p className="text-2xl font-extrabold">{displayPrice(mine)}</p>
                                    <p className="mt-1 text-sm text-white/65">
                                        {t('panel.share', { share: formatMoney(share, mine.currency), percent: 100 - mine.feePercent, fee: mine.feePercent })}
                                    </p>
                                </>
                            ) : <p className="text-sm text-white/65">{t('panel.priceNotSet')}</p>}
                        </div>
                    </Section>

                    <Section title={t('panel.payouts')}>
                        <div className="card space-y-3 p-4">
                            {payouts === null ? (
                                <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
                            ) : payouts === 'error' ? (
                                <div className="text-center">
                                    <p className="text-sm text-white/65">{t('pay.err.stripe_not_configured')}</p>
                                    <button className="btn-ghost mt-3" onClick={load}><RefreshCw size={16} /> {t('community.retry')}</button>
                                </div>
                            ) : payouts.ready ? (
                                <>
                                    <p className="flex items-start gap-2 text-sm text-good"><BadgeCheck size={18} className="mt-0.5 shrink-0" /> {t('panel.ready')}</p>
                                    <button disabled={busy} onClick={() => void run(openPayoutDashboard)} className="btn-ghost w-full"><Banknote size={16} /> {t('panel.dashboard')} <ExternalLink size={14} /></button>
                                </>
                            ) : payouts.connected ? (
                                <>
                                    <p className="text-sm text-white/70">{t(payouts.detailsSubmitted ? 'panel.pendingCheck' : 'panel.unfinished')}</p>
                                    <div className="flex gap-2">
                                        <button disabled={busy} onClick={() => void run(() => connectPayouts(country))} className="btn-primary flex-1"><Landmark size={16} /> {t('panel.continue')}</button>
                                        <button disabled={busy} onClick={load} aria-label={t('community.retry')} className="btn-ghost px-3"><RefreshCw size={16} /></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-white/70">{t('panel.payoutsNone')}</p>
                                    <label className="block">
                                        <span className="label mb-1 block">{t('panel.country')}</span>
                                        <select value={country} onChange={e => setCountry(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand">
                                            {[...PAYOUT_COUNTRIES].sort((a, b) => regionName(a).localeCompare(regionName(b), locale())).map(c => <option key={c} value={c}>{regionName(c)}</option>)}
                                        </select>
                                    </label>
                                    <button disabled={busy} onClick={() => void run(() => connectPayouts(country))} className="btn-primary w-full"><Landmark size={16} /> {t('panel.connect')}</button>
                                </>
                            )}
                            <p className="text-xs text-white/45">{t('panel.stripeNote')}</p>
                        </div>
                    </Section>

                    <Section title={`${t('panel.clients')} (${active.length})`}>
                        {clients === null ? (
                            <div className="card h-20 animate-pulse" role="status" aria-label={t('community.loading')} />
                        ) : clients.length === 0 ? (
                            <p className="card flex items-center gap-3 p-4 text-sm text-white/60"><Users size={20} className="shrink-0 text-brand" /> {t('panel.noClients')}</p>
                        ) : (
                            <div className="space-y-2">
                                {[...active, ...past].map(c => (
                                    <button key={c.id} onClick={() => navigate(`/entrenadores/chat/${c.id}`)} className="card flex w-full items-center gap-3 p-3 text-left hover:bg-ink-3">
                                        <Avatar src={c.clientAvatar} name={c.clientName || '?'} size={44} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold">{c.clientName || t('panel.client')}</span>
                                            <span className="block truncate text-xs text-white/55">
                                                {t(`hire.${hireState(c)}`)} · {t('panel.since', { date: new Date(c.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) })}
                                            </span>
                                        </span>
                                        {c.unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink" aria-label={t('chat.unread', { n: c.unread })}>{c.unread}</span>}
                                        <MessageCircle size={18} className="shrink-0 text-white/40" />
                                        <ChevronRight size={16} className="shrink-0 text-white/30" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </Section>
                </>
            )}
        </div>
    );
}
