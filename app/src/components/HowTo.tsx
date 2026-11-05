import { Lightbulb } from 'lucide-react';
import { exerciseName, exerciseTip, getExercise, muscleLabel, equipmentLabel } from '../data/exercises';
import { howToSteps } from '../data/howto';
import { getLang, t } from '../i18n';
import { ExerciseDemo } from './ExerciseDemo';
import { Sheet } from './ui';

// How an exercise is done: the movement playing big, then numbered steps
// (get in position, do the movement) and the one thing to watch for.
export const HowToSteps = ({ id }: { id: string }) => {
    const info = getExercise(id);
    const steps = howToSteps(id, getLang());
    return (
        <div className="space-y-3">
            {steps.length > 0 && (
                <div>
                    <p className="label mb-2">{t('howto.steps')}</p>
                    <ol className="space-y-2.5">
                        {steps.map((step, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-ink">{i + 1}</span>
                                <p className="pt-0.5 text-[15px] leading-relaxed text-white/85">{step}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
            {info && (
                <div className="flex gap-3 rounded-2xl bg-brand-soft p-3.5">
                    <Lightbulb size={20} className="mt-0.5 shrink-0 text-brand" />
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('howto.key')}</p>
                        <p className="mt-0.5 text-[15px] leading-relaxed text-white/90">{exerciseTip(info)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export const HowToSheet = ({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) => {
    const info = getExercise(id);
    const name = exerciseName(id);
    return (
        <Sheet open={open} onClose={onClose} title={name}>
            <ExerciseDemo id={id} name={name} />
            {info && <p className="mt-2 text-center text-sm text-white/55">{muscleLabel(info.muscle)} · {equipmentLabel(info.equipment)}</p>}
            <div className="mt-4"><HowToSteps id={id} /></div>
        </Sheet>
    );
};
