import { useEffect } from 'react';
import { locale, t } from '../i18n';
import { useStore } from '../store/store';
import { localDay } from './activity';
import { scheduleWaterAlerts } from './native';
import { autoTargets, waterTargetMl } from './nutrition';

// "Time for a glass of water": every 2 hours from 10 am to 8 pm while today's
// goal isn't reached, and one tomorrow morning (each change of the water, or
// opening the app, reschedules them).

export const WATER_HOURS = [10, 12, 14, 16, 18, 20];

const liters = (ml: number) => (ml / 1000).toLocaleString(locale(), { maximumFractionDigits: 2 });

export const waterAlerts = (drunkMl: number, targetMl: number, now = new Date()) => {
    const at = (dayOffset: number, hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0);
    const today = drunkMl >= targetMl ? [] : WATER_HOURS.map(h => at(0, h)).filter(d => d > now)
        .map(d => ({ at: d, title: t('water.alertTitle'), body: t('water.alertBody', { drunk: liters(drunkMl), target: liters(targetMl) }) }));
    // Tomorrow morning's; the rest of tomorrow's come when the app opens.
    const tomorrow = { at: at(1, WATER_HOURS[0]), title: t('water.alertTitle'), body: t('water.alertMorning', { target: liters(targetMl) }) };
    return [...today, tomorrow];
};

export const useWaterReminders = () => {
    const profile = useStore(s => s.profile);
    const on = profile?.waterReminders === true;
    const day = localDay(new Date());
    const drunk = useStore(s => s.water?.[day] ?? 0);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const custom = useStore(s => s.nutritionTargets);
    const trained = useStore(s => s.sessions.some(x => localDay(new Date(x.startedAt)) === day));
    const lang = useStore(s => s.lang);
    useEffect(() => {
        if (!profile) return;
        if (!on) {
            void scheduleWaterAlerts([]);
            return;
        }
        const targets = custom ?? (weightKg ? autoTargets(profile, weightKg) : null);
        const target = waterTargetMl(profile, weightKg, { trained, proteinG: targets?.protein });
        void scheduleWaterAlerts(waterAlerts(drunk, target));
    }, [on, drunk, weightKg, custom, trained, lang, day]);
};
