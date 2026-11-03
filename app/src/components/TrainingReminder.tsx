import { AlarmClock, Moon } from 'lucide-react';
import { locale, t } from '../i18n';
import { isNative } from '../lib/native';
import { DEFAULT_TRAINING_TIME, defaultTrainingDays } from '../lib/reminders';
import { actions, useStore } from '../store/store';

// "Remind me to train": a switch, the time and the days of the week.

const dayShort = (day: number) => new Date(2024, 0, 1 + day).toLocaleDateString(locale(), { weekday: 'narrow' });
const dayLong = (day: number) => new Date(2024, 0, 1 + day).toLocaleDateString(locale(), { weekday: 'long' });

export const TrainingReminder = () => {
    const reminder = useStore(s => s.profile?.trainingReminder ?? null);
    const daysPerWeek = useStore(s => s.profile?.daysPerWeek ?? 3);
    const on = reminder !== null;

    const toggle = () => actions.updateProfile({
        trainingReminder: on ? null : { time: DEFAULT_TRAINING_TIME, days: defaultTrainingDays(daysPerWeek) },
    });
    const setTime = (time: string) => { if (reminder && /^\d{2}:\d{2}$/.test(time)) actions.updateProfile({ trainingReminder: { ...reminder, time } }); };
    const evening = reminder?.evening !== false;
    const toggleEvening = () => { if (reminder) actions.updateProfile({ trainingReminder: { ...reminder, evening: !evening } }); };
    const toggleDay = (day: number) => {
        if (!reminder) return;
        const days = reminder.days.includes(day) ? reminder.days.filter(d => d !== day) : [...reminder.days, day].sort();
        if (days.length) actions.updateProfile({ trainingReminder: { ...reminder, days } });
    };

    return (
        <div className="p-4">
            <div className="flex items-center gap-3">
                <span className="shrink-0 text-brand"><AlarmClock size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-medium">{t('reminder.train')}</p>
                    <p className="text-sm text-white/55">{isNative() ? t('reminder.trainHint') : t('mealPlan.remindersWeb')}</p>
                </div>
                <button role="switch" aria-checked={on} aria-label={t('reminder.train')} onClick={toggle}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-ink-4'}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
                </button>
            </div>
            {reminder && (
                <div className="mt-3 space-y-3 pl-8">
                    <label className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/70">{t('reminder.time')}</span>
                        <input type="time" value={reminder.time} onChange={e => setTime(e.target.value)} aria-label={t('reminder.time')}
                            className="rounded-xl border border-line bg-ink px-3 py-2 text-lg font-semibold tabular-nums outline-none focus:border-brand" />
                    </label>
                    <div className="flex gap-1.5" role="group" aria-label={t('reminder.days')}>
                        {Array.from({ length: 7 }, (_, day) => {
                            const picked = reminder.days.includes(day);
                            return (
                                <button key={day} onClick={() => toggleDay(day)} aria-pressed={picked} aria-label={dayLong(day)}
                                    className={`h-9 flex-1 rounded-full text-sm font-semibold uppercase ${picked ? 'bg-brand text-snow' : 'bg-ink-3 text-white/50'}`}>
                                    {dayShort(day)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="shrink-0 text-violet-400"><Moon size={18} /></span>
                        <p className="min-w-0 flex-1 text-sm text-white/70">{t('reminder.evening')}</p>
                        <button role="switch" aria-checked={evening} aria-label={t('reminder.evening')} onClick={toggleEvening}
                            className={`relative h-6 w-10 shrink-0 rounded-full transition ${evening ? 'bg-brand' : 'bg-ink-4'}`}>
                            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${evening ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
