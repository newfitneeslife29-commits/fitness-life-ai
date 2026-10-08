import { ChevronLeft, Cloud, Eye, EyeOff, Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from '../components/feedback';
import { Sheet } from '../components/ui';
import { Logo } from '../components/Welcome';
import { t } from '../i18n';
import { AuthFailure, enabledProviders, PASSWORD_RECOVERY_EVENT, sendPasswordReset, signInWithEmail, signInWithProvider, signUpWithEmail, updatePassword, type OAuthProvider, type Providers } from '../lib/auth';
import { waitForSync } from '../lib/cloud';
import { LEGAL_URL } from '../lib/premium';
import { useStore } from '../store/store';

// Create an account or sign in: Google, Apple or e-mail and password.

const GoogleMark = () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
);

const AppleMark = () => (
    <svg width="18" height="20" viewBox="0 0 17 20" aria-hidden fill="currentColor">
        <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.1zM11.6 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" />
    </svg>
);

interface Props {
    initialMode?: 'signUp' | 'signIn';
    onDone: () => void;
    onSkip?: () => void; // "continue without an account"
    onBack?: () => void;
}

export default function AuthScreen({ initialMode = 'signUp', onDone, onSkip, onBack }: Props) {
    const account = useStore(s => s.account);
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState<'email' | OAuthProvider | 'loading' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [providers, setProviders] = useState<Providers>({ google: false, apple: false });

    useEffect(() => {
        void enabledProviders().then(setProviders);
    }, []);

    // Signed in (here, or back from Google/Apple): wait for the account's data, then go on.
    useEffect(() => {
        if (!account) return;
        setBusy('loading');
        void waitForSync().then(onDone);
    }, [account?.id]);

    const fail = (e: unknown) => setError(t(`auth.err.${e instanceof AuthFailure ? e.code : 'failed'}`));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setNotice(null);
        setBusy('email');
        try {
            if (mode === 'signIn') await signInWithEmail(email, password);
            else if ((await signUpWithEmail(email, password)) === 'confirm') {
                setNotice(t('auth.confirmSent', { email: email.trim() }));
                setMode('signIn');
            }
        } catch (err) {
            fail(err);
        } finally {
            setBusy(b => (b === 'email' ? null : b));
        }
    };

    const oauth = async (provider: OAuthProvider) => {
        setError(null);
        setBusy(provider);
        try {
            await signInWithProvider(provider);
        } catch (err) {
            fail(err);
        } finally {
            setBusy(b => (b === provider ? null : b));
        }
    };

    const forgot = async () => {
        if (!email.trim()) {
            setError(t('auth.needEmail'));
            return;
        }
        setError(null);
        try {
            await sendPasswordReset(email);
            toast(t('auth.resetSent'), 4000);
        } catch (err) {
            fail(err);
        }
    };

    if (busy === 'loading') {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink" role="status">
                <div className="launch-logo"><Logo size={72} /></div>
                <p className="text-white/60">{t('auth.loading')}</p>
            </main>
        );
    }

    const title = mode === 'signUp' ? t('auth.titleSignUp') : t('auth.titleSignIn');
    return (
        <main className="relative min-h-dvh overflow-hidden bg-ink">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(70%_60%_at_50%_0%,rgb(var(--brand)/0.25),transparent_70%)]" />
            <div className="pt-safe relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="flex h-14 items-center">
                    {onBack && <button onClick={onBack} aria-label={t('common.back')} className="-ml-2 rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>}
                </div>

                <div className="welcome-in flex flex-col items-center text-center">
                    <Logo size={64} />
                    <h1 className="mt-4 text-[1.9rem] font-extrabold tracking-tight">{title}</h1>
                    <p className="mt-2 flex max-w-xs items-start gap-2 text-sm text-white/60"><Cloud size={16} className="mt-0.5 shrink-0 text-brand" /> {t('auth.subtitle')}</p>
                </div>

                <div className="welcome-in mt-7 space-y-2.5" style={{ animationDelay: '80ms' }}>
                    {providers.google && (
                        <button onClick={() => oauth('google')} disabled={busy !== null}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-snow py-3.5 font-semibold text-[#1f1f1f] shadow-sm transition active:scale-[0.99] disabled:opacity-60">
                            <GoogleMark /> {t('auth.google')}
                        </button>
                    )}
                    {providers.apple && (
                        <button onClick={() => oauth('apple')} disabled={busy !== null}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black py-3.5 font-semibold text-snow shadow-sm transition active:scale-[0.99] disabled:opacity-60">
                            <AppleMark /> {t('auth.apple')}
                        </button>
                    )}
                    {(providers.google || providers.apple) && (
                        <p className="flex items-center gap-3 py-2 text-xs uppercase tracking-wider text-white/40">
                            <span className="h-px flex-1 bg-line" /> {t('auth.or')} <span className="h-px flex-1 bg-line" />
                        </p>
                    )}
                </div>

                <form onSubmit={submit} className="welcome-in space-y-3" style={{ animationDelay: '140ms' }} noValidate>
                    <label className="block">
                        <span className="label mb-1 block">{t('auth.email')}</span>
                        <span className="relative block">
                            <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-10 pr-3 outline-none focus:border-brand" placeholder="tu@correo.com" />
                        </span>
                    </label>
                    <label className="block">
                        <span className="label mb-1 block">{t('auth.password')}</span>
                        <span className="relative block">
                            <input type={show ? 'text' : 'password'} autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} value={password}
                                onChange={e => setPassword(e.target.value)} required minLength={6}
                                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-3 pr-11 outline-none focus:border-brand" placeholder={t('auth.passwordHint')} />
                            <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:text-white">
                                {show ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </span>
                    </label>

                    {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
                    {notice && <p role="status" className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-strong">{notice}</p>}

                    <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={busy !== null || !email.trim() || password.length < 6}>
                        {mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')}
                    </button>
                    {mode === 'signIn' && (
                        <button type="button" onClick={forgot} className="block w-full text-center text-sm text-white/55 hover:text-white">{t('auth.forgot')}</button>
                    )}
                </form>

                <button onClick={() => { setMode(m => (m === 'signUp' ? 'signIn' : 'signUp')); setError(null); }}
                    className="mt-5 text-center text-sm font-semibold text-brand hover:text-brand-strong">
                    {mode === 'signUp' ? t('auth.toSignIn') : t('auth.toSignUp')}
                </button>

                <div className="mt-auto pt-8 text-center">
                    {onSkip && <button onClick={onSkip} className="btn w-full text-white/60 hover:text-white">{t('auth.skip')}</button>}
                    <p className="mt-2 text-[11px] text-white/40">
                        {t('welcome.legal')} <a href={LEGAL_URL} target="_blank" rel="noopener noreferrer" className="underline">{t('premium.terms')}</a>
                    </p>
                </div>
            </div>
        </main>
    );
}

// Opened from the "reset password" e-mail: choose a new password.
export const PasswordRecovery = () => {
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(PASSWORD_RECOVERY_EVENT, show);
        return () => window.removeEventListener(PASSWORD_RECOVERY_EVENT, show);
    }, []);
    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await updatePassword(password);
            toast(t('auth.passwordSaved'));
            setOpen(false);
        } catch (err) {
            setError(t(`auth.err.${err instanceof AuthFailure ? err.code : 'failed'}`));
        }
    };
    return (
        <Sheet open={open} onClose={() => setOpen(false)} title={t('auth.newPassword')}>
            <form onSubmit={save} className="space-y-3">
                <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                    aria-label={t('auth.newPassword')} placeholder={t('auth.passwordHint')}
                    className="w-full rounded-xl border border-line bg-ink px-3 py-3 outline-none focus:border-brand" />
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                <button className="btn-primary w-full" disabled={password.length < 6}>{t('auth.newPasswordSave')}</button>
            </form>
        </Sheet>
    );
};
