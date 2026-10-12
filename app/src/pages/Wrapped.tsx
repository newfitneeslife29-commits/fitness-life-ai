import { ChevronLeft, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../components/feedback';
import { Chips, Section } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { locale, t, tp } from '../i18n';
import { localDay, monthGrid } from '../lib/activity';
import { fmtNumber } from '../lib/format';
import { shareImage } from '../lib/native';
import { kgToDisplay } from '../lib/progression';
import { canvasBlob, ensureFonts, heatmapStory, recordsStory, volumeStory } from '../lib/shareCards';
import { equivalent, monthWrap } from '../lib/wrapped';
import { useStore } from '../store/store';

type Card = 'volume' | 'records' | 'heatmap';

// "Gym Wrapped": dark story cards (1080×1920) with the month in numbers, ready
// for Instagram Stories or TikTok.
export default function Wrapped() {
    const navigate = useNavigate();
    const sessions = useStore(s => s.sessions);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const name = useStore(s => s.profile?.name ?? '');
    const now = new Date();
    const [ago, setAgo] = useState(0);
    const [card, setCard] = useState<Card>('volume');
    const [preview, setPreview] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [sharing, setSharing] = useState(false);
    const first = new Date(now.getFullYear(), now.getMonth() - ago, 1);
    const year = first.getFullYear(), month = first.getMonth();
    const wrap = useMemo(() => monthWrap(sessions, year, month), [sessions, year, month]);
    const monthLabel = first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

    useEffect(() => {
        let cancelled = false;
        void ensureFonts().then(() => {
            if (cancelled) return;
            const eyebrow = monthLabel;
            const footerLine = t('wrapped.footer');
            const value = (kg: number) => fmtNumber(Math.round(kgToDisplay(kg, unit)));
            let canvas: HTMLCanvasElement;
            if (card === 'volume') {
                const eq = equivalent(wrap.volumeKg);
                canvas = volumeStory({
                    eyebrow, title: name ? t('wrapped.volumeTitleName', { name }) : t('wrapped.volumeTitle'),
                    big: value(wrap.volumeKg), bigLabel: t('wrapped.volumeLabel', { unit }),
                    emoji: eq?.emoji, equivalence: eq ? t('wrapped.equivalent', { thing: tp(`wrapped.thing.${eq.key}`, eq.count) }) : undefined,
                    stats: [
                        { value: String(wrap.sessions), label: t('wrapped.workouts') },
                        { value: fmtNumber(wrap.sets), label: t('wrapped.sets') },
                        { value: fmtNumber(Math.round(wrap.minutes / 60 * 10) / 10), label: t('wrapped.hours') },
                    ],
                    footer: footerLine,
                });
            } else if (card === 'records') {
                canvas = recordsStory({
                    eyebrow, title: t('wrapped.recordsTitle'),
                    rows: wrap.records.map(r => ({ name: exerciseName(r.exerciseId), value: `${value(r.weightKg)} ${unit} × ${r.reps}`, badge: r.isNew ? t('wrapped.newPr') : undefined })),
                    empty: t('wrapped.noRecords'), footer: footerLine,
                });
            } else {
                const grid = monthGrid(year, month, [], sessions);
                canvas = heatmapStory({
                    eyebrow, title: t('wrapped.heatmapTitle'),
                    weekdays: Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }).toUpperCase()),
                    days: grid.map(w => w.map(d => ({ day: d.date.getDate(), inMonth: d.inMonth, trained: wrap.trainedDays.has(localDay(d.date)) }))),
                    stats: [
                        { value: String(wrap.trainedDays.size), label: t('wrapped.daysTrained') },
                        { value: String(wrap.sessions), label: t('wrapped.workouts') },
                    ],
                    footer: footerLine,
                });
            }
            canvasRef.current = canvas;
            setPreview(canvas.toDataURL('image/jpeg', 0.85));
        });
        return () => { cancelled = true; };
    }, [card, wrap, unit, name, monthLabel, sessions, year, month]);

    const share = async () => {
        if (!canvasRef.current || sharing) return;
        setSharing(true);
        try {
            const result = await shareImage(await canvasBlob(canvasRef.current), `fitness-life-${card}-${localDay(first).slice(0, 7)}.png`, t('wrapped.title'));
            if (result === 'saved') toast(t('wrapped.saved'));
            if (result === 'failed') toast(t('wrapped.failed'));
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('wrapped.title')}</h1>
                    <p className="text-sm text-white/55">{t('wrapped.subtitle')}</p>
                </div>
            </header>
            <Section className="space-y-3">
                <Chips<number> label={t('wrapped.month')} value={ago} onChange={setAgo} options={[{ value: 0, label: t('wrapped.thisMonth') }, { value: 1, label: t('wrapped.lastMonth') }]} />
                <Chips<Card> label={t('wrapped.card')} value={card} onChange={setCard} options={[
                    { value: 'volume', label: t('wrapped.card.volume') },
                    { value: 'records', label: t('wrapped.card.records') },
                    { value: 'heatmap', label: t('wrapped.card.heatmap') },
                ]} />
            </Section>
            <Section>
                <div className="mx-auto aspect-[9/16] w-full max-w-[19rem] overflow-hidden rounded-3xl bg-ink-2 shadow-2xl shadow-black/50">
                    {preview && <img src={preview} alt={t('wrapped.previewAlt')} className="h-full w-full object-cover" />}
                </div>
                <button onClick={share} disabled={!preview || sharing} className="btn-primary mx-auto mt-4 flex w-full max-w-[19rem]"><Share2 size={18} /> {t('wrapped.share')}</button>
                <p className="mt-2 text-center text-xs text-white/45">{t('wrapped.hint')}</p>
            </Section>
            <Section>
                <Link to="/antes-despues" className="btn-ghost w-full">{t('compare.open')}</Link>
            </Section>
        </div>
    );
}
