import { WifiOff } from 'lucide-react';
import { t } from '../i18n';
import { useOnline } from '../lib/useOnline';

// No signal (a gym in a basement): say that nothing is lost.
export const OfflineNotice = ({ className = '' }: { className?: string }) => {
    const online = useOnline();
    if (online) return null;
    return (
        <p role="status" className={`flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2 text-xs text-white/70 ${className}`}>
            <WifiOff size={14} className="shrink-0 text-brand" /> {t('offline.notice')}
        </p>
    );
};
