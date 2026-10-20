import { Gift, Share2, Ticket } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { t, tp } from '../i18n';
import { shareText } from '../lib/native';
import { refreshPremium } from '../lib/premium';
import { cleanCode, fetchMyCode, InviteFailure, redeemCode } from '../lib/referral';
import { SITE_URL } from '../lib/supabase';
import { useStore } from '../store/store';

// Invite a friend: share my code, or enter the code of who invited me.
export default function Invite() {
    const account = useStore(s => s.account);
    const [params] = useSearchParams();
    const [mine, setMine] = useState<{ code: string; friends: number } | null | undefined>(undefined);
    const [code, setCode] = useState(() => cleanCode(params.get('codigo') ?? ''));
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!account) return;
        void fetchMyCode().then(setMine, () => setMine(null));
    }, [account?.id]);

    const share = async () => {
        if (!mine) return;
        const url = `${SITE_URL}#/invitar?codigo=${mine.code}`;
        const result = await shareText(t('invite.title'), t('invite.shareText', { code: mine.code, url }));
        if (result === 'copied') toast(t('invite.copied'), 2500);
    };

    const redeem = async (e: FormEvent) => {
        e.preventDefault();
        if (code.length !== 6 || busy) return;
        setBusy(true);
        try {
            await redeemCode(code);
            toast(t('invite.redeemed'), 4000);
            setCode('');
            void refreshPremium().catch(() => {});
        } catch (err) {
            toast(t(`invite.err.${err instanceof InviteFailure ? err.code : 'failed'}`), 4500);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4 pb-4">
            <BackHeader title={t('invite.title')} subtitle={t('invite.subtitle')} icon={<Gift size={20} />} />
            <Section>
                <div className="card overflow-hidden">
                    <div className="bg-gradient-to-br from-brand to-fuchsia-500 p-5 text-snow">
                        <Gift size={32} />
                        <p className="mt-2 text-xl font-extrabold">{t('invite.subtitle')}</p>
                        <p className="mt-1 text-sm text-snow/85">{t('invite.how')}</p>
                    </div>
                    <div className="p-4">
                        {!account ? (
                            <>
                                <p className="mb-3 text-sm text-white/60">{t('invite.needAccount')}</p>
                                <Link to="/cuenta" className="btn-primary w-full">{t('account.cta')}</Link>
                            </>
                        ) : mine === undefined ? (
                            <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
                        ) : mine === null ? (
                            <p className="text-sm text-white/60">{t('invite.err.not_configured')}</p>
                        ) : (
                            <>
                                <p className="label">{t('invite.yourCode')}</p>
                                <p className="my-2 select-all text-center text-4xl font-black tracking-[0.3em] tabular-nums" aria-label={`${t('invite.yourCode')}: ${mine.code.split('').join(' ')}`}>{mine.code}</p>
                                {mine.friends > 0 && <p className="mb-2 text-center text-sm text-good">{tp('invite.friends', mine.friends)}</p>}
                                <button onClick={() => void share()} className="btn-primary w-full"><Share2 size={18} /> {t('invite.share')}</button>
                            </>
                        )}
                    </div>
                </div>
            </Section>

            {account && (
                <Section title={t('invite.enterTitle')}>
                    <form onSubmit={redeem} className="card p-4">
                        <p className="mb-3 text-sm text-white/60">{t('invite.enterHint')}</p>
                        <label htmlFor="invite-code" className="sr-only">{t('invite.code')}</label>
                        <div className="flex gap-2">
                            <input id="invite-code" value={code} onChange={e => setCode(cleanCode(e.target.value))} placeholder="ABC234" autoCapitalize="characters" autoComplete="off"
                                className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 text-lg font-bold uppercase tracking-[0.2em] outline-none focus:border-brand" />
                            <button type="submit" disabled={code.length !== 6 || busy} className="btn-primary px-4"><Ticket size={18} /> {t('invite.redeem')}</button>
                        </div>
                    </form>
                </Section>
            )}
        </div>
    );
}
