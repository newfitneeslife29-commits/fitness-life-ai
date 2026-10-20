import { ClipboardList, Dumbbell, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { locale, t, tp } from '../i18n';
import { routineName } from '../lib/names';
import { fmtNumber, fmtVolume, fmtWeight } from '../lib/format';
import {
    fetchClientWorkouts, fetchMyReview, fetchReviews, photoUrl, saveReview, sendRoutine, type ClientWorkout, type Rating, type Review,
} from '../lib/trainerTools';
import type { ChatMessage } from '../lib/trainerPay';
import { useStore } from '../store/store';
import { Avatar } from './Avatar';
import { toast } from './feedback';
import { Sheet } from './ui';

// Pieces of the trainer screens: stars, reviews, routines to send, the
// client's workouts and chat photos.

const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

export const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
    <span className="inline-flex" aria-label={t('review.star', { n: fmtNumber(value) })}>
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={size} aria-hidden className={i <= Math.round(value) ? 'fill-amber-300 text-amber-300' : 'text-white/25'} />
        ))}
    </span>
);

export const RatingLine = ({ rating, onClick }: { rating?: Rating; onClick: () => void }) => (
    <button onClick={onClick} className="mt-1 flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
        {rating ? (
            <>
                <Star size={13} className="fill-amber-300 text-amber-300" aria-hidden />
                <b className="text-white">{fmtNumber(rating.stars)}</b> · {tp('review.count', rating.reviews)}
            </>
        ) : t('review.none')}
    </button>
);

// The client rates their trainer (one review each, can be changed).
export const ReviewSheet = ({ open, trainerId, name, onClose }: { open: boolean; trainerId: string; name: string; onClose: () => void }) => {
    const [stars, setStars] = useState(0);
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!open) return;
        void fetchMyReview(trainerId).then(r => {
            if (r) {
                setStars(r.stars);
                setBody(r.body);
            }
        }).catch(() => {});
    }, [open, trainerId]);
    const save = async () => {
        setBusy(true);
        try {
            await saveReview(trainerId, stars, body);
            toast(t('review.saved'), 3000);
            onClose();
        } catch {
            toast(t('review.failed'), 4000);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Sheet open={open} onClose={onClose} title={t('review.rate', { name })}>
            <div role="radiogroup" aria-label={t('review.rate', { name })} className="mb-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} role="radio" aria-checked={stars === i} aria-label={t('review.star', { n: i })} onClick={() => setStars(i)} className="p-1">
                        <Star size={36} className={i <= stars ? 'fill-amber-300 text-amber-300' : 'text-white/25'} />
                    </button>
                ))}
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={500} rows={3} placeholder={t('review.placeholder')} aria-label={t('review.placeholder')}
                className="mb-4 w-full resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
            <button onClick={() => void save()} disabled={!stars || busy} className="btn-primary w-full">{t('review.save')}</button>
        </Sheet>
    );
};

export const ReviewsSheet = ({ open, trainerId, name, onClose, onRate }: { open: boolean; trainerId: string; name: string; onClose: () => void; onRate?: () => void }) => {
    const [reviews, setReviews] = useState<Review[] | null>(null);
    useEffect(() => {
        if (!open) return;
        setReviews(null);
        void fetchReviews(trainerId).then(setReviews, () => setReviews([]));
    }, [open, trainerId]);
    return (
        <Sheet open={open} onClose={onClose} title={t('review.list', { name })}>
            {onRate && <button onClick={onRate} className="btn-primary mb-4 w-full"><Star size={16} /> {t('review.rate', { name })}</button>}
            {reviews === null ? (
                <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
            ) : reviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/55">{t('review.none')}</p>
            ) : (
                <ul className="space-y-3">
                    {reviews.map(r => (
                        <li key={r.clientId} className="flex gap-3">
                            <Avatar src={r.avatar} name={r.name} size={36} />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center justify-between gap-2 text-sm font-semibold">{r.name || '—'} <span className="text-xs font-normal text-white/40">{day(r.updatedAt)}</span></p>
                                <Stars value={r.stars} />
                                {r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{r.body}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Sheet>
    );
};

// The trainer picks one of their routines to send to a client.
export const SendRoutineSheet = ({ open, linkId, name, onClose, onSent }: {
    open: boolean; linkId: string; name: string; onClose: () => void; onSent: (message: ChatMessage) => void;
}) => {
    const routines = useStore(s => s.routines);
    const [busy, setBusy] = useState<string | null>(null);
    const send = async (id: string) => {
        const r = routines.find(x => x.id === id);
        if (!r) return;
        setBusy(id);
        try {
            const message = await sendRoutine(linkId, { name: routineName(r), exercises: r.exercises });
            if (message) onSent(message);
            toast(t('coachRoutine.sent'), 3000);
            onClose();
        } catch {
            toast(t('coachRoutine.failed'), 4000);
        } finally {
            setBusy(null);
        }
    };
    return (
        <Sheet open={open} onClose={onClose} title={t('coachRoutine.send')}>
            <p className="mb-3 text-sm text-white/60">{routines.length ? t('coachRoutine.pick', { name }) : t('coachRoutine.none')}</p>
            <ul className="space-y-2">
                {routines.filter(r => r.exercises.length > 0).map(r => (
                    <li key={r.id}>
                        <button disabled={busy !== null} onClick={() => void send(r.id)} className="card flex w-full items-center gap-3 p-3 text-left hover:bg-ink-3 disabled:opacity-60">
                            <ClipboardList size={20} className="shrink-0 text-brand" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{routineName(r)}</span>
                                <span className="text-xs text-white/50">{tp('common.exercises', r.exercises.length)}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );
};

// The client's finished workouts, for their trainer.
export const ClientWorkoutsSheet = ({ open, linkId, name, onClose }: { open: boolean; linkId: string; name: string; onClose: () => void }) => {
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const [list, setList] = useState<ClientWorkout[] | null>(null);
    const [shown, setShown] = useState<string | null>(null);
    useEffect(() => {
        if (!open) return;
        setList(null);
        void fetchClientWorkouts(linkId).then(setList, () => setList([]));
    }, [open, linkId]);
    return (
        <Sheet open={open} onClose={onClose} title={t('clientWorkouts.title', { name })}>
            {list === null ? (
                <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
            ) : list.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/55">{t('clientWorkouts.none')}</p>
            ) : (
                <ul className="space-y-2">
                    {list.map(w => (
                        <li key={w.id} className="card overflow-hidden">
                            <button onClick={() => setShown(s => (s === w.id ? null : w.id))} aria-expanded={shown === w.id} className="flex w-full items-center gap-3 p-3 text-left">
                                <Dumbbell size={20} className="shrink-0 text-brand" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{w.name}</span>
                                    <span className="text-xs text-white/50">{day(w.startedAt)} · {t('clientWorkouts.summary', { min: w.durationMin, sets: w.sets, volume: fmtVolume(w.volumeKg, unit) })}</span>
                                </span>
                            </button>
                            {shown === w.id && (
                                <ul className="space-y-1.5 border-t border-line px-3 py-2 text-sm">
                                    {w.exercises.map(e => (
                                        <li key={e.id}>
                                            <span className="font-medium">{e.name}</span>
                                            <span className="block text-xs text-white/55">{e.sets.map(s => `${fmtWeight(s.kg, unit)} × ${s.reps}`).join(' · ')}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Sheet>
    );
};

// A private photo of the chat; tapping it shows it full screen.
export const ChatPhoto = ({ path }: { path: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [big, setBig] = useState(false);
    useEffect(() => {
        let alive = true;
        void photoUrl(path).then(u => alive && setUrl(u));
        return () => { alive = false; };
    }, [path]);
    if (!url) return <span className="block h-48 w-48 animate-pulse rounded-xl bg-black/20" aria-label={t('chat.photoAlt')} role="img" />;
    return (
        <>
            <button onClick={() => setBig(true)} className="block">
                <img src={url} alt={t('chat.photoAlt')} className="max-h-72 max-w-full rounded-xl object-cover" />
            </button>
            {big && (
                <button onClick={() => setBig(false)} aria-label={t('common.close')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <img src={url} alt={t('chat.photoAlt')} className="max-h-full max-w-full object-contain" />
                </button>
            )}
        </>
    );
};
