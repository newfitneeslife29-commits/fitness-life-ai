import { Share2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { shareImage, shareImageTo, type ShareTarget } from '../lib/native';
import { toast } from './feedback';

const InstagramMark = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <defs>
            <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#feda75" /><stop offset="0.35" stopColor="#fa7e1e" /><stop offset="0.65" stopColor="#d62976" /><stop offset="1" stopColor="#4f5bd5" />
            </linearGradient>
        </defs>
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#ig)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.3" cy="7.7" r="1" fill="#fff" />
    </svg>
);
const FacebookMark = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path fill="#fff" d="M15.1 12.6l.4-2.7h-2.6V8.2c0-.7.4-1.5 1.5-1.5h1.2V4.4s-1.1-.2-2.1-.2c-2.2 0-3.6 1.3-3.6 3.7v2H7.5v2.7h2.4V19c.5.1 1 .1 1.5.1s1 0 1.5-.1v-6.4h2.2z" />
    </svg>
);
const TikTokMark = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#000" />
        <g transform="translate(5 4) scale(0.6)">
            <path fill="#25F4EE" transform="translate(-0.8 -0.6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            <path fill="#FE2C55" transform="translate(0.8 0.6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            <path fill="#fff" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </g>
    </svg>
);

// One-tap sharing to Instagram, Facebook and TikTok, plus the phone's share
// sheet. Story-shaped images (9:16) go to Instagram/Facebook Stories; others
// to a normal post.
export const ShareBar = ({ getBlob, name, title, story }: { getBlob: () => Promise<Blob | null>; name: string; title: string; story: boolean }) => {
    const [busy, setBusy] = useState(false);
    const run = async (target: ShareTarget | 'more') => {
        if (busy) return;
        setBusy(true);
        try {
            const blob = await getBlob();
            if (!blob) return;
            const result = target === 'more' ? await shareImage(blob, name, title) : await shareImageTo(target, blob, name, title);
            if (result === 'saved') toast(t('wrapped.saved'));
            if (result === 'failed') toast(t('wrapped.failed'));
        } finally {
            setBusy(false);
        }
    };
    const buttons: { target: ShareTarget | 'more'; label: string; icon: ReactNode }[] = [
        { target: story ? 'instagram-story' : 'instagram', label: 'Instagram', icon: <InstagramMark /> },
        { target: story ? 'facebook-story' : 'facebook', label: 'Facebook', icon: <FacebookMark /> },
        { target: 'tiktok', label: 'TikTok', icon: <TikTokMark /> },
        { target: 'more', label: t('share.more'), icon: <Share2 size={20} /> },
    ];
    return (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('wrapped.share')}>
            {buttons.map(b => (
                <button key={b.label} onClick={() => run(b.target)} disabled={busy} aria-label={t('share.to', { app: b.label })}
                    className="card flex flex-col items-center gap-1.5 py-3 text-xs font-medium hover:bg-ink-3 disabled:opacity-50">
                    {b.icon}
                    {b.label}
                </button>
            ))}
        </div>
    );
};
