import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import type { Achievement } from '../lib/achievements';
import { fmtShortDate } from '../lib/format';
import { badgeStory, canvasBlob, ensureFonts, type CardBackground } from '../lib/shareCards';
import { ShareBar } from './ShareBar';
import { Sheet } from './ui';

// Each medal as a story image: achievements and streak milestones.

export const BADGE_EMOJI: Record<Achievement['icon'], string> = {
    dumbbell: '🏋️', flame: '🔥', trophy: '🏆', weight: '💪', sunrise: '🌅', moon: '🌙', target: '🎯', star: '⭐', timer: '⏱️', layers: '🧭', scale: '⚖️',
};

export interface Badge {
    id: string;
    emoji: string;
    title: string;
    description: string;
    date?: string; // when it was earned (ISO or Date)
}

type Background = 'gym' | 'plain';

export const BadgeShareSheet = ({ badge, onClose }: { badge: Badge | null; onClose: () => void }) => {
    const [background, setBackground] = useState<Background>('gym');
    const [preview, setPreview] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!badge) return;
        let cancelled = false;
        void ensureFonts().then(() => {
            if (cancelled) return;
            const bg: CardBackground = { kind: background };
            const canvas = badgeStory({
                bg, eyebrow: t('badge.eyebrow'), title: badge.title, description: badge.description, emoji: badge.emoji,
                date: badge.date ? t('badge.earned', { date: fmtShortDate(badge.date) }) : '', footer: t('wrapped.footer'),
            });
            canvasRef.current = canvas;
            setPreview(canvas.toDataURL('image/jpeg', 0.8));
        });
        return () => { cancelled = true; };
    }, [badge, background]);

    const blob = async () => (canvasRef.current ? canvasBlob(canvasRef.current) : null);

    return (
        <Sheet open={!!badge} onClose={onClose} title={badge?.title ?? ''}>
            <div className="flex gap-2" role="radiogroup" aria-label={t('wrapped.background')}>
                {(['gym', 'plain'] as const).map(b => (
                    <button key={b} role="radio" aria-checked={background === b} onClick={() => setBackground(b)}
                        className={`chip ${background === b ? 'chip-on' : 'hover:text-white'}`}>{t(`wrapped.bg.${b}`)}</button>
                ))}
            </div>
            <div className="mx-auto mt-3 aspect-[9/16] w-full max-w-[15rem] overflow-hidden rounded-3xl bg-ink-2 shadow-2xl shadow-black/50">
                {preview && <img src={preview} alt={t('badge.previewAlt', { name: badge?.title ?? '' })} className="h-full w-full object-cover" />}
            </div>
            <div className="mx-auto mt-4 w-full max-w-sm">
                <ShareBar getBlob={blob} story name={`fitness-life-${badge?.id ?? 'badge'}.png`} title={badge?.title ?? ''} />
            </div>
            <p className="mt-2 text-center text-xs text-white/45">{t('wrapped.hint')}</p>
        </Sheet>
    );
};
