import { Check, ChevronLeft, Crown, Minus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/feedback';
import { Section } from '../components/ui';
import { getLang, t } from '../i18n';
import { refreshUsage } from '../lib/ai';
import { fmtDate } from '../lib/format';
import { ANNUAL_SAVING, fallbackPlan, getOffer, LEGAL_URL, PREMIUM_AI_USES, premiumAvailable, refreshPremium, restorePremium, type Offer, type PlanId } from '../lib/premium';
import { useStore } from '../store/store';

// Section anchors of public/legal.html in each language.
const LEGAL_ANCHORS = { es: ['terminos', 'privacidad'], en: ['terms', 'privacy'], pt: ['termos', 'privacidade'] } as const;

type Cell = boolean | string;
const ROWS: [string, Cell, Cell][] = [
    ['premium.row.training', true, true],
    ['premium.row.extras', true, true],
    ['premium.row.nutrition', true, true],
    ['premium.row.coach', false, true],
    ['premium.row.estimate', false, true],
];
const PLAN_IDS: PlanId[] = ['annual', 'monthly'];

const Mark = ({ value }: { value: Cell }) =>
    typeof value === 'string' ? <span className="font-semibold">{value}</span>
        : value ? <Check size={18} className="mx-auto text-good" aria-label={t('premium.included')} />
            : <Minus size={18} className="mx-auto text-white/30" aria-label={t('premium.notIncluded')} />;

export default function Premium() {
    const navigate = useNavigate();
    const premium = useStore(s => s.premium);
    const usage = useStore(s => s.aiUsage);
    const [offer, setOffer] = useState<Offer | null>(null);
    const [planId, setPlanId] = useState<PlanId>('annual');
    const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
    const available = premiumAvailable();
    const active = premium?.active ?? false;
    // Store prices once loaded; until then (or if a plan is missing there) the USD defaults.
    const plans = offer?.length ? offer : PLAN_IDS.map(fallbackPlan);
    const plan = plans.find(p => p.id === planId) ?? plans[0];
    const [termsAnchor, privacyAnchor] = LEGAL_ANCHORS[getLang()];

    useEffect(() => {
        if (!available) return;
        getOffer().then(o => {
            setOffer(o);
            if (o.length && !o.some(p => p.id === 'annual')) setPlanId(o[0].id);
        }).catch(() => setOffer(null));
        refreshPremium().catch(() => {});
    }, [available]);

    const buy = async () => {
        setBusy('buy');
        try {
            const current = (offer ?? (await getOffer())).find(p => p.id === plan.id);
            if (!current) throw new Error('no offer');
            if (await current.buy()) {
                toast(t('premium.welcome'), 3500);
                await refreshUsage().catch(() => {});
            }
        } catch {
            toast(t('premium.buyFailed'), 4000);
        } finally {
            setBusy(null);
        }
    };

    const restore = async () => {
        setBusy('restore');
        try {
            const status = await restorePremium();
            toast(status.active ? t('premium.restored') : t('premium.nothingToRestore'), 3500);
            if (status.active) await refreshUsage().catch(() => {});
        } catch {
            toast(t('premium.buyFailed'), 4000);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-6 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
            </header>

            <Section>
                <div className="flex flex-col items-center text-center">
                    <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-amber-300 text-ink shadow-lg shadow-brand/30">
                        <Crown size={32} />
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight">Fitness Life Premium</h1>
                    <p className="mt-1 max-w-xs text-white/60">{t('premium.subtitle')}</p>
                </div>
            </Section>

            {active && (
                <Section>
                    <div className="card border-brand/40 bg-brand-soft p-4">
                        <p className="flex items-center gap-2 font-semibold text-brand-strong"><Sparkles size={18} /> {t('premium.active')}</p>
                        <p className="mt-1 text-sm text-white/70">
                            {premium?.expiresAt
                                ? t(premium.willRenew ? 'premium.renews' : 'premium.endsOn', { date: fmtDate(premium.expiresAt) })
                                : t('premium.noExpiry')}
                        </p>
                        {usage?.premium && <p className="mt-1 text-sm text-white/70">{t('premium.usage', { used: usage.used, limit: usage.limit })}</p>}
                        {premium?.manageUrl && (
                            <a href={premium.manageUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 w-full">{t('premium.manage')}</a>
                        )}
                    </div>
                </Section>
            )}

            {!active && (
                <Section>
                    {available ? (
                        <>
                            <div role="radiogroup" aria-label={t('premium.plans')} className="space-y-2">
                                {plans.map(p => {
                                    const selected = p.id === plan.id;
                                    return (
                                        <button key={p.id} role="radio" aria-checked={selected} onClick={() => setPlanId(p.id)}
                                            className={`card flex w-full items-center gap-3 p-4 text-left transition-colors ${selected ? 'border-brand bg-brand-soft' : 'hover:bg-ink-3'}`}>
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-brand' : 'border-white/30'}`}>
                                                {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2 font-semibold">
                                                    {t(`premium.${p.id}`)}
                                                    {p.id === 'annual' && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-snow">{t('premium.save', { n: ANNUAL_SAVING })}</span>}
                                                </span>
                                                {p.id === 'annual' && <span className="block text-sm text-white/60">{t('premium.equiv', { price: p.perMonth })}</span>}
                                            </span>
                                            <span className="shrink-0 text-right font-bold tabular-nums">
                                                {p.price}<span className="text-sm font-medium text-white/50"> / {t(p.id === 'annual' ? 'premium.year' : 'premium.month')}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mb-3 mt-2 text-center text-sm text-white/50">{t('premium.cancelAnytime')}</p>
                            <button className="btn-primary w-full py-4 text-base" disabled={busy !== null} onClick={buy}>
                                <Crown size={18} /> {busy === 'buy' ? t('premium.buying') : t('premium.subscribe')}
                            </button>
                        </>
                    ) : (
                        <p className="card p-4 text-center text-sm text-white/60">{t('premium.unavailable')}</p>
                    )}
                </Section>
            )}

            <Section>
                <table className="card w-full overflow-hidden text-sm">
                    <thead>
                        <tr className="border-b border-line text-xs text-white/50">
                            <th className="p-3 text-left font-medium"><span className="sr-only">{t('premium.feature')}</span></th>
                            <th className="w-20 p-3 font-medium">{t('premium.free')}</th>
                            <th className="w-24 p-3 font-semibold text-brand">Premium</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {ROWS.map(([key, free, paid]) => (
                            <tr key={key}>
                                <td className="p-3 text-white/85">{t(key as Parameters<typeof t>[0])}</td>
                                <td className="p-3 text-center"><Mark value={free} /></td>
                                <td className="p-3 text-center"><Mark value={paid} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-2 text-xs text-white/40">{t('premium.why', { n: PREMIUM_AI_USES })}</p>
            </Section>

            {available && (
                <Section>
                    <button className="btn-ghost w-full" disabled={busy !== null} onClick={restore}>
                        {busy === 'restore' ? t('premium.restoring') : t('premium.restore')}
                    </button>
                    <p className="mt-4 text-[11px] leading-relaxed text-white/40">{t(`premium.legal.${plan.id}`, { price: plan.price })}</p>
                    <p className="mt-2 flex gap-4 text-xs">
                        <a href={`${LEGAL_URL}#${termsAnchor}`} target="_blank" rel="noopener noreferrer" className="text-white/60 underline">{t('premium.terms')}</a>
                        <a href={`${LEGAL_URL}#${privacyAnchor}`} target="_blank" rel="noopener noreferrer" className="text-white/60 underline">{t('premium.privacy')}</a>
                    </p>
                </Section>
            )}
        </div>
    );
}
