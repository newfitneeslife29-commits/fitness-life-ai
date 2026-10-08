import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { t } from '../i18n';

// App-wide confirm dialogs and toasts. Native `window.confirm` looks foreign
// inside the iOS/Android shells, so everything goes through here instead.

interface ConfirmRequest {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    resolve: (ok: boolean) => void;
}

interface Toast { id: number; text: string }

let dialog: ConfirmRequest | null = null;
let toasts: Toast[] = [];
let snapshot: { dialog: ConfirmRequest | null; toasts: Toast[] } = { dialog, toasts };
const listeners = new Set<() => void>();
const emit = () => {
    snapshot = { dialog, toasts };
    listeners.forEach(l => l());
};

export const confirm = (opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> =>
    new Promise(resolve => {
        dialog?.resolve(false); // a new dialog cancels a pending one
        dialog = { ...opts, resolve };
        emit();
    });

let nextToast = 1;
export const toast = (text: string, ms = 2600) => {
    const id = nextToast++;
    toasts = [...toasts, { id, text }];
    emit();
    window.setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        emit();
    }, ms);
};

const close = (ok: boolean) => {
    const d = dialog;
    dialog = null;
    emit();
    d?.resolve(ok);
};

export const FeedbackHost = () => {
    const state = useSyncExternalStore(
        l => { listeners.add(l); return () => listeners.delete(l); },
        () => snapshot,
    );
    const confirmRef = useRef<HTMLButtonElement>(null);
    const d = state.dialog;

    useEffect(() => {
        if (!d) return;
        confirmRef.current?.focus();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [d]);

    return (
        <>
            {d && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center" role="alertdialog" aria-modal="true" aria-label={d.title}>
                    <div aria-hidden className="absolute inset-0 animate-fade bg-black/70" onClick={() => close(false)} />
                    <div className="relative w-full max-w-sm animate-rise rounded-3xl border border-line bg-ink-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
                        <h2 className="text-lg font-semibold">{d.title}</h2>
                        {d.message && <p className="mt-1 text-sm text-white/65">{d.message}</p>}
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button className="btn-ghost" onClick={() => close(false)}>{d.cancelLabel ?? t('common.cancel')}</button>
                            <button ref={confirmRef} className={d.danger ? 'btn bg-red-500 text-white hover:bg-red-400' : 'btn-primary'} onClick={() => close(true)}>
                                {d.confirmLabel ?? t('common.ok')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4">
                {state.toasts.map(t => (
                    <div key={t.id} role="status" className="flex animate-rise items-center gap-2 rounded-full border border-line bg-ink-3/95 px-4 py-2 text-sm shadow-lg shadow-black/40 backdrop-blur">
                        <CheckCircle2 size={16} className="text-good" /> {t.text}
                    </div>
                ))}
            </div>
        </>
    );
};
