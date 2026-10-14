import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { t } from '../i18n';

// Each main tab has its own colour: a gradient header with soft light blobs.
const TONES = {
    orange: 'from-brand via-orange-500 to-amber-500 shadow-brand/25',
    violet: 'from-violet-600 via-indigo-600 to-fuchsia-600 shadow-violet-600/25',
    sky: 'from-sky-500 via-blue-600 to-indigo-600 shadow-sky-500/25',
    emerald: 'from-emerald-500 via-green-600 to-teal-600 shadow-emerald-500/25',
    amber: 'from-amber-500 via-orange-500 to-rose-500 shadow-amber-500/25',
    rose: 'from-rose-500 via-pink-600 to-fuchsia-600 shadow-rose-500/25',
} as const;
export type Tone = keyof typeof TONES;

export const PageHeader = ({ title, subtitle, action, tone, children }: {
    title: string; subtitle?: string; action?: ReactNode; tone?: Tone; children?: ReactNode;
}) => tone ? (
    <header className={`relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] text-snow shadow-lg ${TONES[tone]}`}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-snow/15 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-black/10 blur-2xl" />
        <div className="relative flex items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="truncate text-3xl font-extrabold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-snow/85">{subtitle}</p>}
            </div>
            {action}
        </div>
        {children && <div className="relative mt-4">{children}</div>}
    </header>
) : (
    <header className="flex items-end justify-between gap-4 px-4 pb-4 pt-6">
        <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-white/55">{subtitle}</p>}
        </div>
        {action}
    </header>
);

// A small figure on a coloured header: big number, short label.
export const HeroStat = ({ value, label }: { value: ReactNode; label: string }) => (
    <div className="rounded-2xl bg-snow/15 px-3 py-2.5 backdrop-blur">
        <p className="text-xl font-extrabold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-snow/80">{label}</p>
    </div>
);

export const Section = ({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
    <section className={`px-4 ${className}`}>
        {(title || action) && (
            <div className="mb-2 flex items-center justify-between">
                {title && <h2 className="label">{title}</h2>}
                {action}
            </div>
        )}
        {children}
    </section>
);

export function Choice<T extends string | number>({ options, value, onChange, label }: {
    options: { value: T; label: string; hint?: string }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div role="radiogroup" aria-label={label} className="grid gap-2">
            {options.map(o => (
                <button
                    key={String(o.value)}
                    role="radio"
                    aria-checked={o.value === value}
                    onClick={() => onChange(o.value)}
                    className={`card flex flex-col items-start px-4 py-3 text-left transition ${o.value === value ? 'border-brand bg-brand-soft' : 'hover:bg-ink-3'}`}
                >
                    <span className="font-semibold">{o.label}</span>
                    {o.hint && <span className="text-sm text-white/55">{o.hint}</span>}
                </button>
            ))}
        </div>
    );
}

export function Chips<T extends string | number>({ options, value, onChange, label }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
            {options.map(o => (
                <button key={String(o.value)} role="radio" aria-checked={o.value === value}
                    onClick={() => onChange(o.value)} className={`chip ${o.value === value ? 'chip-on' : 'hover:text-white'}`}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export const Stat = ({ value, label }: { value: ReactNode; label: string }) => (
    <div className="card px-4 py-3">
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-white/50">{label}</div>
    </div>
);

export const Empty = ({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) => (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-3 text-brand">{icon}</div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-white/55">{children}</div>}
    </div>
);

// Bottom sheet on phones, centred dialog on wider screens.
export const Sheet = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
            <div aria-hidden className="absolute inset-0 animate-fade bg-black/70" onClick={onClose} />
            <div className="relative flex max-h-[85dvh] w-full max-w-lg animate-rise flex-col rounded-t-3xl border border-line bg-ink-2 sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} aria-label={t('common.close')} className="rounded-full p-1.5 text-white/60 hover:bg-ink-3 hover:text-white"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
            </div>
        </div>
    );
};

