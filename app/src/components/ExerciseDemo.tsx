import { useEffect, useState } from 'react';
import { exercisePhotos } from '../data/exercises';
import { t } from '../i18n';

// Start and end position photos, alternating like a slow animation so the
// movement is obvious at a glance. Photos: Free Exercise DB (public domain).
// Lists use still thumbnails (`animate` off) to keep scrolling light.
export const ExerciseDemo = ({ id, name, variant = 'full', animate = variant === 'full' }: { id: string; name: string; variant?: 'full' | 'thumb'; animate?: boolean }) => {
    const photos = exercisePhotos(id);
    const [frame, setFrame] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!animate) return;
        const timer = window.setInterval(() => setFrame(f => 1 - f), variant === 'thumb' ? 1400 : 1100);
        return () => window.clearInterval(timer);
    }, [variant, animate]);

    if (!photos || failed) return null;
    const thumb = variant === 'thumb';
    return (
        <div
            role="img"
            aria-label={t('demo.alt', { name })}
            className={`relative shrink-0 overflow-hidden bg-white ${thumb ? 'h-14 w-14 rounded-xl' : 'aspect-[3/2] w-full rounded-2xl'}`}
        >
            {photos.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${frame === i ? 'opacity-100' : 'opacity-0'}`}
                />
            ))}
            {!thumb && (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                    {frame === 0 ? t('demo.start') : t('demo.end')}
                </span>
            )}
        </div>
    );
};
