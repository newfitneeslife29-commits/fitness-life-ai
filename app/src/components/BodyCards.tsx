import { BatteryCharging, Check, ChevronRight, Target, UserRound, Weight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { detailsMissing, ProfileDetailsSheet } from './ProfileForm';
import { t } from '../i18n';
import { fmtWeight } from '../lib/format';
import { goalProgress, liveGoal } from '../lib/nutrition';
import { groupLabel, recoveryStatus } from '../lib/recovery';
import { useNow } from '../lib/useNow';
import { useStore } from '../store/store';
import type { Session } from '../store/types';

// The weight goal: how far along it is, or a nudge to set it (and the
// details the calorie targets need).
export const WeightGoalCard = () => {
    const { profile, bodyWeights } = useStore();
    const [editing, setEditing] = useState(false);
    if (!profile) return null;
    const unit = profile.unit;
    const current = bodyWeights[0]?.weightKg;
    const savedGoal = profile.weightGoal;
    const sheet = <ProfileDetailsSheet open={editing} onClose={() => setEditing(false)} />;

    const prompt = (title: string, hint: string, icon: ReactNode) => (
        <>
            <button onClick={() => setEditing(true)} className="card flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-white/55">{hint}</span>
                </span>
                <ChevronRight className="shrink-0 text-white/40" />
            </button>
            {sheet}
        </>
    );
    if (detailsMissing(profile)) return prompt(t('profileDetails.incomplete'), t('profileDetails.incompleteHint'), <UserRound size={20} />);
    if (!savedGoal) return prompt(t('weightGoal.set'), t('weightGoal.setHint'), <Target size={20} />);
    if (current === undefined) {
        return (
            <Link to="/progreso" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><Weight size={20} /></span>
                <p className="min-w-0 flex-1 text-sm text-white/70">{t('weightGoal.logWeight')}</p>
                <ChevronRight className="shrink-0 text-white/40" />
            </Link>
        );
    }

    const goal = liveGoal(savedGoal, current);
    const keep = Math.abs(goal.targetKg - goal.startKg) < 0.1;
    const progress = goalProgress(goal, current);
    const left = Math.abs(goal.targetKg - current);
    const reached = !keep && (progress >= 1 || left < 0.25);
    return (
        <>
            <button onClick={() => setEditing(true)} className="card block w-full p-4 text-left hover:bg-ink-3">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-2xl font-bold tabular-nums">{fmtWeight(current, unit)}</p>
                    <p className="flex items-center gap-1 text-sm text-white/55"><Target size={14} /> {fmtWeight(goal.targetKg, unit)}</p>
                </div>
                {keep ? (
                    <p className="mt-1 text-sm text-white/55">{t('weightGoal.keep', { weight: fmtWeight(goal.targetKg, unit) })}</p>
                ) : (
                    <>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-4">
                            <div className={`h-full rounded-full transition-[width] duration-700 ${reached ? 'bg-good' : 'bg-brand'}`} style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>
                        <p className={`mt-2 text-sm ${reached ? 'font-semibold text-good' : 'text-white/55'}`}>
                            {reached ? t('weightGoal.reached') : `${t('weightGoal.progress', {
                                done: fmtWeight(progress * Math.abs(goal.targetKg - goal.startKg), unit),
                                total: fmtWeight(Math.abs(goal.targetKg - goal.startKg), unit),
                            })} · ${t('weightGoal.left', { n: fmtWeight(left, unit) })}`}
                        </p>
                    </>
                )}
            </button>
            {sheet}
        </>
    );
};

// Which muscle groups are rested (green) and how long the others need.
export const RecoveryCard = ({ sessions }: { sessions: Session[] }) => {
    const now = useNow(true, 60_000);
    const status = recoveryStatus(sessions, now);
    if (!status.length) return null;
    return (
        <div className="card p-4">
            <div className="flex flex-wrap gap-2">
                {status.map(s => (
                    <span key={s.group} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${s.ready ? 'bg-good/15 text-good' : 'bg-amber-400/15 text-warn'}`}>
                        {s.ready ? <Check size={14} strokeWidth={3} /> : <BatteryCharging size={14} />}
                        <span className="capitalize">{groupLabel(s.group)}</span>
                        <span className="text-xs opacity-80">{s.ready ? t('recovery.ready') : t('recovery.left', { hours: Math.ceil((s.readyAt - now) / 3_600_000) })}</span>
                    </span>
                ))}
            </div>
            <p className="mt-2 text-xs text-white/45">{t('recovery.hint')}</p>
        </div>
    );
};

