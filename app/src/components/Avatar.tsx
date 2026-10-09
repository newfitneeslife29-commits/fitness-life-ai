// A person's picture, or their initial on the brand color.
export const Avatar = ({ src, name, size = 40, className = '' }: { src?: string | null; name?: string | null; size?: number; className?: string }) => {
    const initial = (name ?? '').trim().slice(0, 1).toUpperCase() || '·';
    return src ? (
        <img src={src} alt="" width={size} height={size} loading="lazy"
            className={`shrink-0 rounded-full bg-ink-3 object-cover ${className}`} style={{ width: size, height: size }} />
    ) : (
        <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-amber-400 font-bold text-snow ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.42 }}>
            {initial}
        </span>
    );
};
