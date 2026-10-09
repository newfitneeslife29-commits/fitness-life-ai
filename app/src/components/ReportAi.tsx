import { Flag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { AI_REPORT_REASONS, reportAiAnswer, type AiReport, type AiReportReason } from '../lib/ai';
import { toast } from './feedback';
import { Sheet } from './ui';

// "Report" link under an AI answer, and the sheet that sends the report.
export const ReportAiButton = ({ report, className = '' }: { report: AiReport; className?: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)} aria-label={t(report.kind === 'meal' ? 'ai.reportEstimate' : 'ai.reportAnswer')}
                className={`inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/70 ${className}`}>
                <Flag size={11} aria-hidden /> {t('ai.report')}
            </button>
            <ReportAiSheet open={open} onClose={() => setOpen(false)} report={report} />
        </>
    );
};

const ReportAiSheet = ({ open, onClose, report }: { open: boolean; onClose: () => void; report: AiReport }) => {
    const [reason, setReason] = useState<AiReportReason | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setReason(null);
        setNote('');
    }, [open]);

    const send = async () => {
        if (!reason) return;
        setBusy(true);
        try {
            await reportAiAnswer(report, reason, note);
            toast(t('ai.reported'));
            onClose();
        } catch {
            toast(t('ai.reportFailed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('ai.reportTitle')}>
            <p className="mb-4 text-sm text-white/60">{t('ai.reportHint')}</p>
            <div role="radiogroup" aria-label={t('ai.reportTitle')} className="mb-4 grid gap-2">
                {AI_REPORT_REASONS.map(r => (
                    <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm ${reason === r ? 'border-brand bg-brand-soft text-white' : 'border-line bg-ink text-white/80'}`}>
                        {t(`ai.reportReason.${r}`)}
                    </button>
                ))}
            </div>
            <label className="label mb-1 block" htmlFor="ai-report-note">{t('ai.reportNote')}</label>
            <textarea id="ai-report-note" value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500}
                className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
            <button className="btn-primary mt-4 w-full" disabled={!reason || busy} onClick={send}>
                <Flag size={16} /> {t('ai.reportSend')}
            </button>
        </Sheet>
    );
};
