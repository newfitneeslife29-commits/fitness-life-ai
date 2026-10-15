import { Bug, Heart, Lightbulb, MessageSquareHeart, MessageCircle, Send, Star } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { t } from '../i18n';
import { FEEDBACK_KINDS, FeedbackError, feedbackAvailable, sendFeedback, type FeedbackKind } from '../lib/feedbackApi';
import { useStore } from '../store/store';

const ICONS: Record<FeedbackKind, ReactNode> = {
    idea: <Lightbulb size={20} />, problem: <Bug size={20} />, praise: <Heart size={20} />, other: <MessageCircle size={20} />,
};

// Ajustes → "Enviar comentarios": an idea, a problem or a thank-you, straight to us.
export default function Feedback() {
    const navigate = useNavigate();
    const accountEmail = useStore(s => s.account?.email ?? '');
    const [kind, setKind] = useState<FeedbackKind>('idea');
    const [rating, setRating] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState(accountEmail);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tooShort = message.trim().length < 3;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (tooShort || busy) return;
        setBusy(true);
        setError(null);
        try {
            await sendFeedback({ kind, rating, message, email });
            toast(t('feedback.sent'), 3500);
            navigate(-1);
        } catch (err) {
            setError(t(`feedback.err.${err instanceof FeedbackError ? err.code : 'failed'}`));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('feedback.title')} subtitle={t('feedback.subtitle')} icon={<MessageSquareHeart size={20} />} />
            {!feedbackAvailable() ? (
                <Section><p className="card p-4 text-sm text-white/70">{t('feedback.unavailable')}</p></Section>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <Section title={t('feedback.kind')}>
                        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('feedback.kind')}>
                            {FEEDBACK_KINDS.map(k => (
                                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                                    className={`card flex items-center gap-2.5 p-3 text-left text-sm font-semibold transition ${kind === k ? 'border-brand bg-brand-soft text-brand-strong' : 'hover:bg-ink-3'}`}>
                                    <span className={kind === k ? 'text-brand' : 'text-white/50'}>{ICONS[k]}</span>
                                    {t(`feedback.kind.${k}`)}
                                </button>
                            ))}
                        </div>
                    </Section>

                    <Section title={t('feedback.rating')}>
                        <div className="card flex items-center justify-center gap-2 p-3" role="radiogroup" aria-label={t('feedback.rating')}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t('feedback.stars', { n })}
                                    onClick={() => setRating(r => (r === n ? null : n))} className="p-1 transition active:scale-90">
                                    <Star size={32} className={rating !== null && n <= rating ? 'fill-amber-400 text-amber-400' : 'text-white/25'} />
                                </button>
                            ))}
                        </div>
                    </Section>

                    <Section title={t('feedback.message')}>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={6} required aria-label={t('feedback.message')}
                            placeholder={t(`feedback.placeholder.${kind}`)}
                            className="w-full rounded-2xl border border-line bg-ink-2 p-4 text-[15px] outline-none focus:border-brand" />
                        <p className="mt-1 text-right text-xs text-white/40">{message.length}/2000</p>
                    </Section>

                    <Section title={t('feedback.email')}>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={200} autoComplete="email" aria-label={t('feedback.email')}
                            placeholder={t('feedback.emailPlaceholder')}
                            className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand" />
                        <p className="mt-1.5 text-xs text-white/50">{t('feedback.emailHint')}</p>
                    </Section>

                    <Section>
                        {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
                        <button type="submit" disabled={tooShort || busy} className="btn-primary w-full py-3.5">
                            <Send size={18} /> {busy ? t('feedback.sending') : t('feedback.send')}
                        </button>
                    </Section>
                </form>
            )}
        </div>
    );
}
