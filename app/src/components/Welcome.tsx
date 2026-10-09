import { ArrowRight, Camera, Dumbbell, LogIn, Sparkles, Upload } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { exercisePhotos } from '../data/exercises';
import { getLang, LANGS, t, type Lang } from '../i18n';
import { LEGAL_URL } from '../lib/premium';
import { actions, useStore } from '../store/store';
import { toast } from './feedback';

// The brand mark (same shape as the app icon).
export const Logo = ({ size = 40 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden>
        <rect width="512" height="512" rx="112" className="fill-ink-3" />
        <g className="fill-brand">
            <rect x="96" y="196" width="40" height="120" rx="14" />
            <rect x="144" y="164" width="44" height="184" rx="16" />
            <rect x="324" y="164" width="44" height="184" rx="16" />
            <rect x="376" y="196" width="40" height="120" rx="14" />
            <rect x="188" y="236" width="136" height="40" rx="10" />
        </g>
    </svg>
);

const MOSAIC = ['sentadilla', 'press-banca', 'dominadas', 'peso-muerto', 'curl-mancuernas', 'hip-thrust', 'press-militar', 'remo-barra'];

const Feature = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
    <li className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</span>
        <span className="text-[15px] text-white/80">{children}</span>
    </li>
);

// First screen of a new install: what the app does, in one look.
export const Welcome = ({ onStart, onSignIn }: { onStart: () => void; onSignIn?: () => void }) => {
    useStore(s => s.lang); // re-render when the language changes
    const fileRef = useRef<HTMLInputElement>(null);

    const restore = async (file: File) => {
        try {
            actions.importData(await file.text());
            toast(t('settings.restored'));
        } catch (e) {
            toast(e instanceof Error ? e.message : t('backup.invalid'));
        }
    };

    return (
        <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink">
            {/* Photo mosaic, slowly drifting, fading into the page. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[62dvh] overflow-hidden">
                <div className="welcome-drift absolute -inset-x-1/4 -top-16 grid -rotate-6 grid-cols-4 gap-3">
                    {[...MOSAIC, ...MOSAIC].map((id, i) => {
                        const src = exercisePhotos(id)?.[i % 2];
                        return src && <img key={i} src={src} alt="" className="aspect-[3/4] w-full rounded-2xl bg-snow object-cover" />;
                    })}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(var(--ink)/0.25)_0%,rgb(var(--ink)/0.6)_40%,rgb(var(--ink)/0.92)_68%,rgb(var(--ink))_86%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(70%_38%_at_50%_62%,rgb(var(--brand)/0.22),transparent_70%)]" />
            </div>

            <header className="pt-safe relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2.5 rounded-full bg-ink/85 py-1.5 pl-1.5 pr-4">
                    <Logo size={32} />
                    <span className="font-bold tracking-tight">Fitness Life</span>
                </div>
                <div role="radiogroup" aria-label={t('settings.language')} className="flex rounded-full bg-ink/85 p-1">
                    {LANGS.map(l => (
                        <button key={l.code} role="radio" aria-checked={getLang() === l.code} aria-label={l.label}
                            onClick={() => actions.setLanguage(l.code as Lang)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getLang() === l.code ? 'bg-brand text-ink' : 'text-white/70'}`}>
                            {l.code}
                        </button>
                    ))}
                </div>
            </header>

            <div className="relative z-10 mx-auto mt-auto w-full max-w-lg px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <p className="welcome-in mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand" style={{ animationDelay: '60ms' }}>{t('welcome.eyebrow')}</p>
                <h1 className="welcome-in text-[2.5rem] font-extrabold leading-[1.05] tracking-tight" style={{ animationDelay: '120ms' }}>
                    {t('welcome.title1')}<br /><span className="text-brand">{t('welcome.title2')}</span>
                </h1>
                <p className="welcome-in mt-3 text-white/65" style={{ animationDelay: '180ms' }}>{t('welcome.subtitle')}</p>

                <ul className="welcome-in mt-6 space-y-3" style={{ animationDelay: '240ms' }}>
                    <Feature icon={<Dumbbell size={18} />}>{t('welcome.f1')}</Feature>
                    <Feature icon={<Camera size={18} />}>{t('welcome.f2')}</Feature>
                    <Feature icon={<Sparkles size={18} />}>{t('welcome.f3')}</Feature>
                </ul>

                <div className="welcome-in mt-8 space-y-2" style={{ animationDelay: '300ms' }}>
                    <button className="btn-primary w-full py-4 text-base shadow-lg shadow-brand/25" onClick={onStart}>
                        {t('welcome.start')} <ArrowRight size={18} />
                    </button>
                    {onSignIn && (
                        <button className="btn w-full font-semibold text-brand hover:text-brand-strong" onClick={onSignIn}>
                            <LogIn size={16} /> {t('welcome.signIn')}
                        </button>
                    )}
                    <button className="btn w-full text-white/60 hover:text-white" onClick={() => fileRef.current?.click()}>
                        <Upload size={16} /> {t('welcome.restore')}
                    </button>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ''; }} />
                </div>
                <p className="mt-3 text-center text-[11px] text-white/40">
                    {t('welcome.legal')} <a href={LEGAL_URL} target="_blank" rel="noopener noreferrer" className="underline">{t('premium.terms')}</a>
                </p>
            </div>
        </main>
    );
};

// Brief branded intro each time the app opens. Never blocks taps.
export const LaunchSplash = ({ onDone }: { onDone: () => void }) => (
    <div aria-hidden onAnimationEnd={e => e.target === e.currentTarget && onDone()}
        className="launch-out pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-ink">
        <div className="launch-logo"><Logo size={88} /></div>
        <p className="launch-word text-2xl font-extrabold tracking-tight">Fitness <span className="text-brand">Life</span></p>
    </div>
);
