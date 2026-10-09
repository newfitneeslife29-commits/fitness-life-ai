import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

// If a screen fails to draw, show what happened and a way back instead of a
// blank screen. The message helps when someone sends a screenshot.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('screen failed', error, info.componentStack);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        const details = `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 4).join('\n')}\n${navigator.userAgent}`;
        return (
            <div className="px-4 pt-10 text-center" role="alert">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand"><AlertTriangle size={24} /></span>
                <h1 className="text-xl font-bold">{t('error.title')}</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">{t('error.text')}</p>
                <div className="mx-auto mt-5 flex max-w-xs flex-col gap-2">
                    <button className="btn-primary" onClick={() => { location.hash = '#/'; location.reload(); }}>{t('error.home')}</button>
                    <button className="btn-ghost" onClick={() => location.reload()}>{t('error.reload')}</button>
                </div>
                <pre className="mx-auto mt-6 max-w-sm select-text whitespace-pre-wrap break-words rounded-xl bg-ink-2 p-3 text-left text-[11px] leading-snug text-white/50">{details}</pre>
            </div>
        );
    }
}
