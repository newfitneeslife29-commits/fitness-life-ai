import { Crown, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '../i18n';
import { AiError, type AiReport } from '../lib/ai';
import { fallbackPlan } from '../lib/premium';
import { useStore } from '../store/store';
import { toast } from './feedback';
import { ReportAiButton } from './ReportAi';

// Pieces shared by the AI screens: the nutrition coach and the personal trainer.

const aiErrorText = (e: unknown) => t(`ai.error.${e instanceof AiError ? e.code : 'failed'}`);

// AI is Premium-only: explain and open the Premium page.
export const useAiErrorHandler = () => {
    const navigate = useNavigate();
    return (e: unknown) => {
        toast(aiErrorText(e), 4000);
        if (e instanceof AiError && e.code === 'upgrade') navigate('/premium');
    };
};

// "Premium: 297 of 300 AI uses left this month"
export const AiUsageLine = () => {
    const usage = useStore(s => s.aiUsage);
    if (!usage?.premium) return null;
    const left = Math.max(usage.limit - usage.used, 0);
    return <p className="text-xs text-white/50">{t('ai.usage.premium', { left, limit: usage.limit })}</p>;
};

// What free users see where the AI would be: what it does and how to get it.
export const PremiumLock = ({ text, onOpen }: { text: string; onOpen?: () => void }) => (
    <div className="rounded-2xl border border-brand/30 bg-brand-soft p-4 text-center">
        <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-snow"><Lock size={18} /></span>
        <p className="text-sm text-white/80">{text}</p>
        <Link to="/premium" onClick={onOpen} className="btn-primary mt-3 w-full"><Crown size={18} /> {t('ai.locked.cta')}</Link>
        <p className="mt-2 text-xs text-white/55">{t('ai.locked.from', { price: fallbackPlan('annual').perMonth })}</p>
    </div>
);

// Answers from the AI can be reported (not the fixed welcome message).
export const ChatBubble = ({ role, text, report }: { role: 'user' | 'assistant'; text: string; report?: AiReport }) => (
    <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
        <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${role === 'user' ? 'rounded-br-md bg-brand text-ink' : 'rounded-bl-md bg-ink-3 text-white/90'}`}>
            {text}
        </p>
        {report && <ReportAiButton report={report} className="ml-1 mt-1" />}
    </div>
);
