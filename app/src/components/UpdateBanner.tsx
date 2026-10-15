import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n';
import { useUpdate } from '../lib/updates';
import { toast } from './feedback';

// Closed until the app opens again.
let closed = false;

// "New version available", on top of every tab until updated or closed.
export const UpdateBanner = ({ className = '' }: { className?: string }) => {
    const update = useUpdate();
    const [hidden, setHidden] = useState(closed);
    if (!update || hidden) return null;
    const apply = () => update.apply().catch(() => toast(t('update.failed'), 4000));
    return (
        <div role="status" className={`flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-amber-500 p-3 text-snow shadow-lg shadow-brand/25 ${className}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-snow/20"><Download size={18} /></span>
            <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-bold">{update.version ? t('update.titleVersion', { version: update.version }) : t('update.title')}</p>
                <p className="text-xs text-snow/85">{t('update.text')}</p>
            </div>
            <button onClick={() => void apply()} className="shrink-0 rounded-full bg-snow px-3.5 py-1.5 text-sm font-bold text-brand-strong active:scale-95">{t('update.now')}</button>
            <button onClick={() => { closed = true; setHidden(true); }} aria-label={t('common.close')} className="-mr-1 shrink-0 rounded-full p-1 text-snow/80 hover:text-snow"><X size={16} /></button>
        </div>
    );
};
