import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { fmtNumber, parseDecimal, typedNumber } from '../lib/format';
import { ageOf, weeksToGoal } from '../lib/nutrition';
import { displayToKg, kgToDisplay } from '../lib/progression';
import { actions, getState } from '../store/store';
import type { Activity, Limitation, Profile, Sex, Unit, WeightGoal } from '../store/types';
import { toast } from './feedback';
import { Choice, Chips, Sheet } from './ui';

// The questions about the person (sex, age, height, weight, activity,
// injuries and weight goal), shared by the sign-up flow and the "Your
// details" sheet for people who signed up before they existed.

const CM_PER_IN = 2.54;

export interface AboutDraft {
    sex: Sex | null;
    age: string;
    heightCm: string;
    heightFt: string;
    heightIn: string;
    weight: string; // in the user's unit
}

export const emptyAbout = (): AboutDraft => ({ sex: null, age: '', heightCm: '', heightFt: '', heightIn: '', weight: '' });

export const aboutFromProfile = (p: Partial<Profile>, weightKg: number | undefined, unit: Unit): AboutDraft => {
    const inches = p.heightCm ? Math.round(p.heightCm / CM_PER_IN) : 0;
    return {
        sex: p.sex ?? null,
        age: p.birthYear ? String(ageOf(p.birthYear)) : '',
        heightCm: p.heightCm ? String(p.heightCm) : '',
        heightFt: inches ? String(Math.floor(inches / 12)) : '',
        heightIn: inches ? String(inches % 12) : '',
        weight: weightKg ? typedNumber(kgToDisplay(weightKg, unit)) : '',
    };
};

export interface About {
    sex: Sex;
    birthYear: number;
    heightCm: number;
    weightKg: number;
}

// Null while something is missing or not believable.
export const parseAbout = (d: AboutDraft, unit: Unit, now = new Date()): About | null => {
    const age = Math.round(parseDecimal(d.age));
    const heightCm = unit === 'lbs'
        ? Math.round((parseDecimal(d.heightFt || '0') * 12 + parseDecimal(d.heightIn || '0')) * CM_PER_IN)
        : Math.round(parseDecimal(d.heightCm));
    const weightKg = displayToKg(parseDecimal(d.weight), unit);
    if (!d.sex || !(age >= 13 && age <= 100) || !(heightCm >= 120 && heightCm <= 230) || !(weightKg >= 30 && weightKg <= 300)) return null;
    return { sex: d.sex, birthYear: now.getFullYear() - age, heightCm, weightKg: Math.round(weightKg * 10) / 10 };
};

const Field = ({ id, label, suffix, value, onChange, width = 'w-full' }: { id: string; label: string; suffix: string; value: string; onChange: (v: string) => void; width?: string }) => (
    <div className={width}>
        <label className="label mb-1 block" htmlFor={id}>{label}</label>
        <div className="flex items-center rounded-xl border border-line bg-ink-2 focus-within:border-brand">
            <input id={id} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg outline-none" />
            <span className="pr-4 text-sm text-white/50">{suffix}</span>
        </div>
    </div>
);

export const AboutFields = ({ value, onChange, unit, onUnit }: { value: AboutDraft; onChange: (d: AboutDraft) => void; unit: Unit; onUnit?: (u: Unit) => void }) => {
    const set = (patch: Partial<AboutDraft>) => onChange({ ...value, ...patch });
    return (
        <div className="space-y-5">
            <div>
                <p className="label mb-2">{t('about.sex')}</p>
                <div role="radiogroup" aria-label={t('about.sex')} className="grid grid-cols-2 gap-2">
                    {(['hombre', 'mujer'] as const).map(s => (
                        <button key={s} role="radio" aria-checked={value.sex === s} onClick={() => set({ sex: s })}
                            className={`card py-3 font-semibold ${value.sex === s ? 'border-brand bg-brand-soft text-brand-strong' : 'hover:bg-ink-3'}`}>
                            {t(`about.${s}`)}
                        </button>
                    ))}
                </div>
            </div>
            {onUnit && (
                <div>
                    <p className="label mb-2">{t('settings.units')}</p>
                    <Chips label={t('settings.units')} value={unit} onChange={onUnit} options={[{ value: 'kg', label: t('unit.kgLong') }, { value: 'lbs', label: t('unit.lbLong') }]} />
                </div>
            )}
            <div className="flex gap-3">
                <Field id="about-age" label={t('about.age')} suffix={t('about.years')} value={value.age} onChange={age => set({ age })} />
                <Field id="about-weight" label={t('about.weight')} suffix={unit} value={value.weight} onChange={weight => set({ weight })} />
            </div>
            {unit === 'lbs' ? (
                <div className="flex gap-3">
                    <Field id="about-ft" label={t('about.height')} suffix="ft" value={value.heightFt} onChange={heightFt => set({ heightFt })} />
                    <Field id="about-in" label="&nbsp;" suffix="in" value={value.heightIn} onChange={heightIn => set({ heightIn })} />
                </div>
            ) : (
                <Field id="about-height" label={t('about.height')} suffix="cm" value={value.heightCm} onChange={heightCm => set({ heightCm })} />
            )}
        </div>
    );
};

export const ActivityChoice = ({ value, onChange }: { value: Activity; onChange: (a: Activity) => void }) => (
    <Choice label={t('activity.question')} value={value} onChange={onChange} options={(['sedentario', 'ligero', 'moderado', 'alto'] as const).map(a => ({
        value: a, label: t(`activity.${a}`), hint: t(`activity.${a}.hint`),
    }))} />
);

const LIMITATIONS: Limitation[] = ['rodillas', 'espalda', 'hombros', 'munecas'];

// Several can be picked; "None" clears them.
export const LimitationChips = ({ value, onChange }: { value: Limitation[]; onChange: (l: Limitation[]) => void }) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('limits.question')}>
        <button role="checkbox" aria-checked={value.length === 0} onClick={() => onChange([])}
            className={`chip ${value.length === 0 ? 'chip-on' : 'hover:text-white'}`}>{t('limits.none')}</button>
        {LIMITATIONS.map(l => {
            const on = value.includes(l);
            return (
                <button key={l} role="checkbox" aria-checked={on} onClick={() => onChange(on ? value.filter(x => x !== l) : [...value, l])}
                    className={`chip ${on ? 'chip-on' : 'hover:text-white'}`}>{t(`limits.${l}`)}</button>
            );
        })}
    </div>
);

export type Direction = 'bajar' | 'mantener' | 'subir';

export interface GoalDraft {
    dir: Direction;
    target: string; // in the user's unit
}

export const goalFromProfile = (goal: WeightGoal | null | undefined, currentKg: number | undefined, unit: Unit, fallback: Direction): GoalDraft => {
    if (goal && currentKg !== undefined) {
        const diff = goal.targetKg - currentKg;
        return { dir: Math.abs(diff) < 0.5 ? 'mantener' : diff < 0 ? 'bajar' : 'subir', target: typedNumber(kgToDisplay(goal.targetKg, unit)) };
    }
    return { dir: fallback, target: '' };
};

// Null for "keep my weight"; undefined while the target doesn't make sense.
export const parseGoal = (d: GoalDraft, currentKg: number, unit: Unit, now = new Date()): WeightGoal | null | undefined => {
    if (d.dir === 'mantener') return null;
    const targetKg = Math.round(displayToKg(parseDecimal(d.target), unit) * 10) / 10;
    if (!(targetKg >= 30 && targetKg <= 300)) return undefined;
    if (d.dir === 'bajar' ? targetKg >= currentKg - 0.4 : targetKg <= currentKg + 0.4) return undefined;
    return { startKg: currentKg, targetKg, startedAt: now.toISOString() };
};

export const GoalFields = ({ value, onChange, currentKg, unit }: { value: GoalDraft; onChange: (d: GoalDraft) => void; currentKg: number | null; unit: Unit }) => {
    const goal = currentKg ? parseGoal(value, currentKg, unit) : undefined;
    const show = (kg: number) => `${fmtNumber(kgToDisplay(kg, unit))} ${unit}`;
    return (
        <div className="space-y-5">
            <div role="radiogroup" aria-label={t('weightGoal.question')} className="grid grid-cols-3 gap-2">
                {(['bajar', 'mantener', 'subir'] as const).map(d => (
                    <button key={d} role="radio" aria-checked={value.dir === d} onClick={() => onChange({ ...value, dir: d })}
                        className={`card py-3 font-semibold ${value.dir === d ? 'border-brand bg-brand-soft text-brand-strong' : 'hover:bg-ink-3'}`}>
                        {t(`weightGoal.${d}`)}
                    </button>
                ))}
            </div>
            {value.dir !== 'mantener' && (
                <Field id="goal-target" label={t('weightGoal.target')} suffix={unit} value={value.target} onChange={target => onChange({ ...value, target })} />
            )}
            {currentKg !== null && (
                <p className="text-sm text-white/60" role="status">
                    {value.dir === 'mantener'
                        ? t('weightGoal.keep', { weight: show(currentKg) })
                        : goal
                            ? t(`weightGoal.summary.${value.dir}`, { diff: show(Math.abs(goal.targetKg - currentKg)), weeks: weeksToGoal(currentKg, goal.targetKg) })
                            : value.target.trim() ? t(`weightGoal.invalid.${value.dir}`, { weight: show(currentKg) }) : t('weightGoal.enter')}
                </p>
            )}
        </div>
    );
};

// "Your details": everything above for an existing profile, in one sheet.
export const ProfileDetailsSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const state = getState();
    const profile = state.profile;
    const unit = profile?.unit ?? 'kg';
    const currentKg = state.bodyWeights[0]?.weightKg;
    const [about, setAbout] = useState(emptyAbout);
    const [activity, setActivity] = useState<Activity>('ligero');
    const [limits, setLimits] = useState<Limitation[]>([]);
    const [goal, setGoal] = useState<GoalDraft>({ dir: 'mantener', target: '' });

    useEffect(() => {
        if (!open || !profile) return;
        setAbout(aboutFromProfile(profile, currentKg, unit));
        setActivity(profile.activity ?? 'ligero');
        setLimits(profile.limitations ?? []);
        setGoal(goalFromProfile(profile.weightGoal, currentKg, unit, profile.goal === 'grasa' ? 'bajar' : 'mantener'));
    }, [open]);

    if (!profile) return null;
    const parsed = parseAbout(about, unit);
    const weightGoal = parsed ? parseGoal(goal, parsed.weightKg, unit) : undefined;
    const valid = parsed !== null && weightGoal !== undefined;

    const save = () => {
        if (!parsed || weightGoal === undefined) return;
        if (currentKg === undefined || Math.abs(currentKg - parsed.weightKg) >= 0.05) actions.logBodyWeight(parsed.weightKg);
        // Keep the original start when the goal itself didn't change.
        const keep = profile.weightGoal && weightGoal && Math.abs(profile.weightGoal.targetKg - weightGoal.targetKg) < 0.05;
        actions.updateProfile({
            sex: parsed.sex, birthYear: parsed.birthYear, heightCm: parsed.heightCm, activity, limitations: limits,
            weightGoal: keep ? profile.weightGoal : weightGoal,
        });
        // New aches: rebuild the plan so the exercises that load them are swapped.
        const before = [...(profile.limitations ?? [])].sort().join();
        if (before !== [...limits].sort().join() && getState().plan) {
            actions.regeneratePlan();
            toast(t('profileDetails.planAdapted'));
        } else {
            toast(t('profileDetails.saved'));
        }
        onClose();
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('profileDetails.title')}>
            <div className="space-y-7">
                <AboutFields value={about} onChange={setAbout} unit={unit} />
                <div>
                    <p className="label mb-2">{t('activity.question')}</p>
                    <ActivityChoice value={activity} onChange={setActivity} />
                </div>
                <div>
                    <p className="label mb-2">{t('limits.question')}</p>
                    <LimitationChips value={limits} onChange={setLimits} />
                </div>
                <div>
                    <p className="label mb-2">{t('weightGoal.question')}</p>
                    <GoalFields value={goal} onChange={setGoal} currentKg={parsed?.weightKg ?? null} unit={unit} />
                </div>
                {!parsed && <p className="text-sm text-white/50">{t('about.invalid')}</p>}
                <button className="btn-primary w-full" disabled={!valid} onClick={save}>{t('profileDetails.save')}</button>
            </div>
        </Sheet>
    );
};

// Whether the profile is missing the details asked at sign-up.
export const detailsMissing = (p: Profile | null) => !!p && (!p.sex || !p.birthYear || !p.heightCm);
