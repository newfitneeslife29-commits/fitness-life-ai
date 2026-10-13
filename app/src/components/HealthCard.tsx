import { Footprints, Flame, HeartPulse, Settings2, Watch } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { fmtNumber } from '../lib/format';
import { connectHealth, disconnectHealth, openHealthSettings, useHealth } from '../lib/health';
import { isNative } from '../lib/native';
import { Capacitor } from '@capacitor/core';
import { toast } from './feedback';

const HEALTH_CONNECT_STORE = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

const Metric = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
    <div className="rounded-xl bg-ink-3 p-3">
        <span className="text-brand">{icon}</span>
        <p className="mt-1 text-lg font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] text-white/50">{label}</p>
    </div>
);

// Today's steps, active calories and heart rate from the phone's health app
// (and the watch that syncs to it). Only in the iOS/Android apps.
export const HealthCard = () => {
    const { state, refresh } = useHealth();
    const [busy, setBusy] = useState(false);
    if (!isNative() || !state || state.kind === 'unsupported') return null;
    const source = Capacitor.getPlatform() === 'ios' ? t('health.apple') : t('health.connect');

    const connect = async () => {
        setBusy(true);
        try {
            if (await connectHealth()) toast(t('health.connected', { source }));
            else toast(t('health.denied', { source }), 4500);
        } catch {
            toast(t('health.failed'), 4000);
        } finally {
            setBusy(false);
            refresh();
        }
    };

    if (state.kind !== 'connected') {
        return (
            <div className="card p-4">
                <p className="flex items-center gap-2 font-semibold"><Watch size={18} className="text-brand" /> {t('health.title')}</p>
                <p className="mt-1 text-sm text-white/60">{t('health.pitch', { source })}</p>
                {state.kind === 'install' ? (
                    <a href={HEALTH_CONNECT_STORE} target="_blank" rel="noopener noreferrer" className="btn-primary mt-3 w-full">{t('health.install')}</a>
                ) : (
                    <button onClick={connect} disabled={busy} className="btn-primary mt-3 w-full">{t('health.connectButton', { source })}</button>
                )}
                <p className="mt-2 text-[11px] text-white/40">{t('health.privacy')}</p>
            </div>
        );
    }

    const today = state.today;
    // Apple Health hides refused access: nothing at all may mean "not allowed".
    const ios = Capacitor.getPlatform() === 'ios';
    const nothing = ios && (!today || (!today.steps && !today.activeKcal && !today.heart));
    const shown = (n: number | null | undefined) => (n != null && !nothing ? fmtNumber(n) : '—');
    return (
        <div className="card p-4">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold"><Watch size={18} className="text-brand" /> {t('health.today')}</p>
                {Capacitor.getPlatform() === 'android' && (
                    <button onClick={() => void openHealthSettings()} aria-label={t('health.settings')}
                        className="rounded-full p-1.5 text-white/40 hover:bg-ink-3 hover:text-white"><Settings2 size={16} /></button>
                )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric icon={<Footprints size={18} />} value={shown(today?.steps)} label={t('health.steps')} />
                <Metric icon={<Flame size={18} />} value={shown(today?.activeKcal)} label={t('health.kcal')} />
                <Metric icon={<HeartPulse size={18} />} value={today?.heart ? String(today.heart.avg) : '—'} label={t('health.bpm')} />
            </div>
            {nothing && <p className="mt-2 text-xs text-white/50">{t('health.iosNoData')}</p>}
            {today?.heart && <p className="mt-2 text-xs text-white/50">{t('health.heartRange', { min: today.heart.min, max: today.heart.max, last: today.heart.last })}</p>}
            <p className="mt-2 text-[11px] text-white/40">{t('health.from', { source })} · <button className="underline" onClick={() => { disconnectHealth(); refresh(); }}>{t('health.disconnect')}</button></p>
        </div>
    );
};
