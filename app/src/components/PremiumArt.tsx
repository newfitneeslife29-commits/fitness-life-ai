import { spark, useSvgId } from './PremiumIcons';

// Theme-aware paints (palette variables swap with light/dark mode).
const brand = (a = 1) => ({ fill: `rgb(var(--brand) / ${a})` });
const PAGE = 'rgb(var(--ink))';

/** Premium hero: an orange app-style badge with a dumbbell and an AI spark, orbited by training and nutrition chips. */
export default function PremiumArt({ className = '' }: { className?: string }) {
    const id = useSvgId('pa');
    const [glow, badge, gloss, sparkFill, blur, chipShadow] = ['glow', 'badge', 'gloss', 'spark', 'blur', 'chip'].map(n => `${id}-${n}`);
    return (
        <svg viewBox="0 0 320 150" className={className} aria-hidden="true" focusable="false">
            <defs>
                <radialGradient id={glow}>
                    <stop offset="0" style={{ stopColor: 'rgb(var(--brand))', stopOpacity: 0.42 }} />
                    <stop offset="0.55" style={{ stopColor: 'rgb(var(--brand))', stopOpacity: 0.12 }} />
                    <stop offset="1" style={{ stopColor: 'rgb(var(--brand))', stopOpacity: 0 }} />
                </radialGradient>
                <linearGradient id={badge} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFC261" />
                    <stop offset="0.45" stopColor="#FB8A2E" />
                    <stop offset="1" stopColor="#E4500C" />
                </linearGradient>
                <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
                    <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={sparkFill} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFE7A3" />
                    <stop offset="1" stopColor="#FFAA33" />
                </linearGradient>
                <filter id={blur} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
                <filter id={chipShadow} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.16" />
                </filter>
            </defs>

            {/* Soft glow and orbit */}
            <circle cx="160" cy="76" r="80" fill={`url(#${glow})`} />
            <circle cx="160" cy="76" r="60" fill="none" style={{ stroke: 'rgb(var(--brand) / 0.16)' }} strokeWidth="1" />
            <ellipse cx="160" cy="80" rx="128" ry="32" transform="rotate(-9 160 80)" fill="none"
                style={{ stroke: 'rgb(var(--brand) / 0.38)' }} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.5 7" />

            {/* Training chip (left) */}
            <g transform="translate(52 66) rotate(-8 22 22)" filter={`url(#${chipShadow})`}>
                <rect width="44" height="44" rx="13" style={{ fill: 'rgb(var(--ink-2))', stroke: 'rgb(var(--line))' }} />
                <path d="M10 23h6l3-7 6 13 3-6h6" fill="none" style={{ stroke: 'rgb(var(--brand))' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Nutrition chip (right) */}
            <g transform="translate(226 44) rotate(9 20 20)" filter={`url(#${chipShadow})`}>
                <rect width="40" height="40" rx="12" style={{ fill: 'rgb(var(--ink-2))', stroke: 'rgb(var(--line))' }} />
                <path d="M12 28c0-9 5.5-15 17-15 0 10.5-6 15-17 15zM12 28l8-8" fill="none" style={{ stroke: 'rgb(var(--good))' }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Badge */}
            <rect x="122" y="46" width="76" height="76" rx="24" fill="#E4500C" opacity="0.55" filter={`url(#${blur})`} />
            <rect x="118" y="34" width="84" height="84" rx="26" fill={`url(#${badge})`} />
            <rect x="118" y="34" width="84" height="84" rx="26" fill={`url(#${gloss})`} />
            <rect x="118.75" y="34.75" width="82.5" height="82.5" rx="25.25" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />

            {/* Dumbbell */}
            <g transform="rotate(-32 160 76)" fill="#fff">
                <rect x="140" y="72.5" width="40" height="7" rx="3.5" fillOpacity="0.92" />
                <rect x="134" y="58" width="11" height="36" rx="4.5" />
                <rect x="175" y="58" width="11" height="36" rx="4.5" />
                <rect x="126" y="65" width="9" height="22" rx="4" fillOpacity="0.9" />
                <rect x="185" y="65" width="9" height="22" rx="4" fillOpacity="0.9" />
            </g>

            {/* AI spark, cut out from the page colour */}
            <path d={spark(202, 36, 17)} fill={`url(#${sparkFill})`} style={{ stroke: PAGE, paintOrder: 'stroke' }} strokeWidth="6" strokeLinejoin="round" />
            <path d={spark(108, 30, 7)} style={{ fill: 'rgb(var(--brand-strong))' }} />
            <path d={spark(222, 108, 5)} style={{ fill: 'rgb(var(--spark))' }} />
            <circle cx="98" cy="122" r="2.5" style={brand(0.55)} />
            <circle cx="250" cy="22" r="2" style={brand(0.6)} />
            <circle cx="142" cy="138" r="1.8" style={brand(0.45)} />
            <circle cx="36" cy="54" r="1.6" style={brand(0.4)} />
            <circle cx="286" cy="106" r="2.2" style={brand(0.45)} />
        </svg>
    );
}
