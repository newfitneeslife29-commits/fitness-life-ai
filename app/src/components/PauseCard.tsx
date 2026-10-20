import { Bandage, BedDouble, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { t, tp } from '../i18n';
import { fmtShortDate } from '../lib/format';
import { currentPause, daysLeft, injuryPause, REST_DAYS, restPause } from '../lib/pause';
import { actions, useStore } from '../store/store';
import type { ActiveWorkout, Limitation, Pause } from '../store/types';
import { toast } from './feedback';
import { Sheet } from './ui';

const ZONES: Limitation[] = ['rodillas', 'espalda', 'hombros', 'munecas'];

const dayDate = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const zonesText = (p: Pause) => p.zones.map(z => t(`limits.${z}`)).join(', ');

// One line for the pause in force: what it is and what it does.
export const pauseLine = (p: Pause) => {
    if (p.kind === 'injury') return t('pause.injuryLine', { zones: zonesText(p) });
    const left = daysLeft(p) ?? 1;
    return tp('pause.restLine', left);
};

// Start or end rest / injury mode.
export const PauseSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const profile = useStore(s => s.profile);
    const pause = currentPause(profile);
    const [kind, setKind] = useState<Pause['kind']>('rest');
    const [days, setDays] = useState<number>(7);
    const [zones, setZones] = useState<Limitation[]>([]);

    const start = () => {
        if (kind === 'injury' && !zones.length) return;
        actions.setPause(kind === 'rest' ? restPause(days) : injuryPause(zones));
        toast(t(kind === 'rest' ? 'pause.restStarted' : 'pause.injuryStarted'), 3500);
        onClose();
    };
    const end = () => {
        actions.setPause(null);
        toast(t('pause.ended'), 3000);
        onClose();
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('pause.title')}>
            {pause ? (
                <div className="space-y-4">
                    <div className="card flex items-start gap-3 p-4">
                        <span className="mt-0.5 shrink-0 text-brand">{pause.kind === 'rest' ? <BedDouble size={22} /> : <Bandage size={22} />}</span>
                        <div>
                            <p className="font-semibold">{t(pause.kind === 'rest' ? 'pause.rest' : 'pause.injury')}</p>
                            <p className="text-sm text-white/65">{pauseLine(pause)}</p>
                            <p className="mt-1 text-xs text-white/45">{t('pause.since', { date: fmtShortDate(dayDate(pause.from)) })}</p>
                        </div>
                    </div>
                    <p className="text-sm text-white/65">{t('pause.streakSafe')}</p>
                    <button onClick={end} className="btn-primary w-full">{t('pause.end')}</button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-white/65">{t('pause.intro')}</p>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('pause.title')}>
                        {(['rest', 'injury'] as const).map(k => (
                            <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                                className={`card flex flex-col items-center gap-1.5 p-3 text-sm font-semibold ${kind === k ? 'border-brand bg-brand-soft text-white' : 'text-white/70 hover:bg-ink-3'}`}>
                                {k === 'rest' ? <BedDouble size={22} /> : <Bandage size={22} />}
                                {t(k === 'rest' ? 'pause.rest' : 'pause.injury')}
                            </button>
                        ))}
                    </div>
                    {kind === 'rest' ? (
                        <div>
                            <p className="label mb-2">{t('pause.howLong')}</p>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('pause.howLong')}>
                                {REST_DAYS.map(n => (
                                    <button key={n} role="radio" aria-checked={days === n} onClick={() => setDays(n)}
                                        className={`chip ${days === n ? 'chip-on' : 'hover:text-white'}`}>{tp('pause.days', n)}</button>
                                ))}
                            </div>
                            <p className="mt-3 text-sm text-white/55">{t('pause.restHint')}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="label mb-2">{t('pause.where')}</p>
                            <div className="flex flex-wrap gap-2" role="group" aria-label={t('pause.where')}>
                                {ZONES.map(z => {
                                    const on = zones.includes(z);
                                    return (
                                        <button key={z} role="checkbox" aria-checked={on} onClick={() => setZones(on ? zones.filter(x => x !== z) : [...zones, z])}
                                            className={`chip ${on ? 'chip-on' : 'hover:text-white'}`}>{t(`limits.${z}`)}</button>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-sm text-white/55">{t('pause.injuryHint')}</p>
                            <p className="mt-2 text-xs text-white/45">{t('limits.doctor')}</p>
                        </div>
                    )}
                    <button onClick={start} disabled={kind === 'injury' && !zones.length} className="btn-primary w-full disabled:opacity-50">
                        {t(kind === 'rest' ? 'pause.startRest' : 'pause.startInjury')}
                    </button>
                </div>
            )}
        </Sheet>
    );
};

// A row in Ajustes that opens the sheet.
export const PauseRow = () => {
    const profile = useStore(s => s.profile);
    const pause = currentPause(profile);
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                <span className="shrink-0 text-brand">{pause?.kind === 'injury' ? <Bandage size={20} /> : <BedDouble size={20} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t('pause.title')}</span>
                    <span className="block text-sm text-white/55">{pause ? pauseLine(pause) : t('pause.rowHint')}</span>
                </span>
                <ChevronRight className="shrink-0 text-white/40" />
            </button>
            <PauseSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};

// On the home screen while it lasts.
export const PauseBanner = () => {
    const profile = useStore(s => s.profile);
    const pause = currentPause(profile);
    const [open, setOpen] = useState(false);
    if (!pause) return null;
    return (
        <>
            <button onClick={() => setOpen(true)} data-testid="pause-banner"
                className="card flex w-full items-center gap-3 border-sky-400/30 bg-sky-400/10 p-3 text-left hover:bg-sky-400/15">
                <span className="shrink-0 text-sky-300">{pause.kind === 'rest' ? <BedDouble size={22} /> : <Bandage size={22} />}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(pause.kind === 'rest' ? 'pause.rest' : 'pause.injury')} · {pauseLine(pause)}</span>
                    <span className="block text-xs text-white/60">{t('pause.streakSafe')}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-white/40" />
            </button>
            <PauseSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};

// In the workout: what injury mode did to it.
export const InjuryNote = ({ injury, className = '' }: { injury: NonNullable<ActiveWorkout['injury']>; className?: string }) => {
    const zones = injury.zones.map(z => t(`limits.${z}`)).join(', ');
    return (
        <p className={`flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-white/80 ${className}`}>
            <Bandage size={15} className="mt-px shrink-0 text-sky-300" />
            {t(injury.swapped + injury.removed > 0 ? 'pause.workoutAdapted' : 'pause.workoutSafe', { zones })}
        </p>
    );
};
