import { useEffect } from 'react';
import { t } from '../i18n';
import { localDay } from './activity';
import { reminderId, scheduleWeeklyReminders, type WeeklyReminder } from './native';
import { sumMacros } from './nutrition';
import { useStore } from '../store/store';
import type { Meal, MealPlan, PlannedMeal } from '../store/types';

// The meal plan the AI makes: 7 days, Monday first, each with its meals in
// order. The Nutrition page shows the day's menu; each meal can be logged
// with one tap, and a notification comes at its time.

// 0 = Monday … 6 = Sunday, like the plan's days.
export const planDayOf = (date: Date) => (date.getDay() + 6) % 7;

// The notification calendar counts from Sunday (1) to Saturday (7).
export const notificationWeekday = (planDay: number) => ((planDay + 1) % 7) + 1;

// Ties a logged meal to the plan meal it came from.
export const planKey = (plan: MealPlan, day: number, meal: number) => `${plan.id}:${day}:${meal}`;

// Plan meals already logged on that day.
export const loggedKeys = (meals: Meal[], date: Date) => {
    const day = localDay(date);
    return new Set(meals.filter(m => m.planKey && localDay(new Date(m.date)) === day).map(m => m.planKey!));
};

export const dayTotals = (meals: PlannedMeal[]) => sumMacros(meals);

// Logged at the plan's time on that day, so the day's list stays in order.
export const mealDate = (date: Date, time: string) => {
    const [h, m] = time.split(':').map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
};

// One weekly notification per meal of the plan.
export const mealReminders = (plan: MealPlan): WeeklyReminder[] =>
    plan.days.flatMap((day, d) => day.meals.map((meal, i) => {
        const [hour, minute] = meal.time.split(':').map(Number);
        return {
            id: reminderId('meals', d * 10 + i),
            weekday: notificationWeekday(d),
            hour, minute,
            title: t('mealPlan.notifyTitle', { meal: t(`mealPlan.slot.${meal.slot}`), time: meal.time }),
            body: meal.foods.length ? `${meal.name}: ${meal.foods.join(', ')}` : meal.name,
        };
    }));

// Keeps the phone's meal reminders in line with the plan.
export const useMealReminders = () => {
    const plan = useStore(s => s.mealPlan ?? null);
    const on = useStore(s => s.profile !== null && s.profile.mealReminders !== false);
    const lang = useStore(s => s.lang);
    useEffect(() => {
        void scheduleWeeklyReminders('meals', plan && on ? mealReminders(plan) : []);
    }, [plan, on, lang]);
};
