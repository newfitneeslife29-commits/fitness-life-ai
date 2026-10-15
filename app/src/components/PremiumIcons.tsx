import { useId, type CSSProperties, type ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

/** A gradient id that is safe inside url(#…) (React ids carry symbols). */
export const useSvgId = (prefix: string) => prefix + useId().replace(/[^\w-]/g, '');

/** A four-point "AI spark": the accent shared by every Premium icon. */
export const spark = (cx: number, cy: number, r: number) => {
    const k = r * 0.2;
    return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
};

// Theme-aware colours: the palette variables swap with light/dark mode.
const SOFT: CSSProperties = { fill: 'rgb(var(--brand) / 0.16)' };
const SPARK: CSSProperties = { fill: 'rgb(var(--spark))' };

/** Duotone line icon on a 24 grid: brand gradient stroke, soft brand fill, an amber spark. */
const Glyph = ({ size = 24, className, children }: IconProps & { children: (stroke: string) => ReactNode }) => {
    const id = useSvgId('pi');
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true" focusable="false" className={className}>
            <defs>
                <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop style={{ stopColor: 'rgb(var(--brand-strong))' }} />
                    <stop offset="1" style={{ stopColor: 'rgb(var(--brand))' }} />
                </linearGradient>
            </defs>
            {children(`url(#${id})`)}
        </svg>
    );
};

/** AI personal trainer: a dumbbell under the AI spark. */
export const AiTrainerIcon = (p: IconProps) => (
    <Glyph {...p}>{s => <>
        <rect x="5" y="9" width="3.75" height="11.5" rx="1.5" stroke={s} style={SOFT} />
        <rect x="15.25" y="9" width="3.75" height="11.5" rx="1.5" stroke={s} style={SOFT} />
        <path d="M8.75 14.75h6.5M2.5 12.5v4.5M21.5 12.5v4.5" stroke={s} />
        <path d={spark(12, 4.75, 3.25)} style={SPARK} />
    </>}</Glyph>
);

/** AI nutrition coach: a chat bubble holding a leaf. */
export const AiCoachIcon = (p: IconProps) => (
    <Glyph {...p}>{s => <>
        <path d="M5.5 7.5h10A2.5 2.5 0 0 1 18 10v5.5a2.5 2.5 0 0 1-2.5 2.5H11l-4 3v-3H5.5A2.5 2.5 0 0 1 3 15.5V10a2.5 2.5 0 0 1 2.5-2.5z" stroke={s} style={SOFT} />
        <path d="M7.5 15.5c0-3.2 2-5.25 5.75-5.25 0 3.5-2.1 5.25-5.75 5.25zM7.5 15.5l2.9-2.9" stroke={s} />
        <path d={spark(19.75, 4.25, 3)} style={SPARK} />
    </>}</Glyph>
);

/** AI meal plan: a calendar page with a plate. */
export const AiMealPlanIcon = (p: IconProps) => (
    <Glyph {...p}>{s => <>
        <rect x="3" y="6.5" width="14.5" height="14" rx="2.5" stroke={s} style={SOFT} />
        <path d="M7 4.5v3.5M13.5 4.5v3.5M3 11h14.5" stroke={s} />
        <circle cx="10.25" cy="15.75" r="2.25" stroke={s} />
        <path d={spark(19.75, 4.25, 3)} style={SPARK} />
    </>}</Glyph>
);

/** Meal estimate from a photo: a camera. */
export const MealPhotoIcon = (p: IconProps) => (
    <Glyph {...p}>{s => <>
        <path d="M3 11.5A2.5 2.5 0 0 1 5.5 9h1.8l1.4-2h4.6l1.4 2h1.8a2.5 2.5 0 0 1 2.5 2.5v6.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 3 18z" stroke={s} style={SOFT} />
        <circle cx="11" cy="14.5" r="3" stroke={s} />
        <path d={spark(20, 4.25, 3)} style={SPARK} />
    </>}</Glyph>
);

/** Premium crown. `tone="current"` draws it in the text colour (e.g. on the brand button). */
export const CrownIcon = ({ size = 24, className, tone = 'brand' }: IconProps & { tone?: 'brand' | 'current' }) => {
    const crown = (stroke: string, fill: CSSProperties) => <>
        <path d="M3.5 8.5l4.4 3.7L12 5.5l4.1 6.7 4.4-3.7-1.9 9H5.4z" stroke={stroke} style={fill} />
        <path d="M5.75 20.5h12.5" stroke={stroke} />
    </>;
    if (tone === 'current') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true" focusable="false" className={className}>
                {crown('currentColor', { fill: 'currentColor', fillOpacity: 0.18 })}
            </svg>
        );
    }
    return <Glyph size={size} className={className}>{s => crown(s, SOFT)}</Glyph>;
};
