import { ChevronLeft, ImagePlus, Lock, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/feedback';
import { Chips, Section } from '../components/ui';
import { t } from '../i18n';
import { pickImage } from '../lib/image';
import { shareImage } from '../lib/native';
import { canvasBlob, compareImage, ensureFonts, type CompareLayout } from '../lib/shareCards';

type Photo = { image: ImageBitmap | HTMLImageElement; url: string };

const loadPhoto = async (file: File): Promise<Photo> => {
    const url = URL.createObjectURL(file);
    try {
        return { image: await createImageBitmap(file, { imageOrientation: 'from-image' }), url };
    } catch {
        const img = new Image();
        img.src = url;
        await img.decode();
        return { image: img, url };
    }
};

const PhotoSlot = ({ title, photo, onPick }: { title: string; photo: Photo | null; onPick: () => void }) => (
    <button onClick={onPick} className="card relative flex aspect-[3/4] flex-col items-center justify-center gap-2 overflow-hidden text-white/60 hover:bg-ink-3">
        {photo ? <img src={photo.url} alt={title} className="absolute inset-0 h-full w-full object-cover" /> : <ImagePlus size={28} />}
        <span className={`relative rounded-full px-3 py-1 text-sm font-bold ${photo ? 'bg-black/60 text-white' : ''}`}>{title}</span>
    </button>
);

// Before and after: put two progress photos together (side by side, one over
// the other, or overlapping with a slider) with the Fitness Life watermark.
// The photos never leave the phone unless the user shares the result.
export default function Compare() {
    const navigate = useNavigate();
    const [before, setBefore] = useState<Photo | null>(null);
    const [after, setAfter] = useState<Photo | null>(null);
    const [beforeNote, setBeforeNote] = useState('');
    const [afterNote, setAfterNote] = useState('');
    const [layout, setLayout] = useState<CompareLayout>('side');
    const [split, setSplit] = useState(50);
    const [preview, setPreview] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const pick = async (which: 'before' | 'after') => {
        const file = await pickImage();
        if (!file) return;
        try {
            const photo = await loadPhoto(file);
            (which === 'before' ? setBefore : setAfter)(photo);
        } catch {
            toast(t('compare.badPhoto'));
        }
    };

    useEffect(() => {
        if (!before || !after) {
            setPreview(null);
            return;
        }
        let cancelled = false;
        void ensureFonts().then(() => {
            if (cancelled) return;
            const canvas = compareImage(
                { image: before.image, label: t('compare.before'), note: beforeNote.trim() || undefined },
                { image: after.image, label: t('compare.after'), note: afterNote.trim() || undefined },
                layout, split / 100,
            );
            canvasRef.current = canvas;
            setPreview(canvas.toDataURL('image/jpeg', 0.85));
        });
        return () => { cancelled = true; };
    }, [before, after, beforeNote, afterNote, layout, split]);

    const share = async () => {
        if (!canvasRef.current) return;
        const result = await shareImage(await canvasBlob(canvasRef.current), 'fitness-life-antes-despues.png', t('compare.title'));
        if (result === 'saved') toast(t('wrapped.saved'));
        if (result === 'failed') toast(t('wrapped.failed'));
    };

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('compare.title')}</h1>
                    <p className="text-sm text-white/55">{t('compare.subtitle')}</p>
                </div>
            </header>

            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <PhotoSlot title={t('compare.before')} photo={before} onPick={() => pick('before')} />
                    <PhotoSlot title={t('compare.after')} photo={after} onPick={() => pick('after')} />
                    <input value={beforeNote} onChange={e => setBeforeNote(e.target.value)} maxLength={24} placeholder={t('compare.notePlaceholder')} aria-label={t('compare.beforeNote')}
                        className="rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-brand" />
                    <input value={afterNote} onChange={e => setAfterNote(e.target.value)} maxLength={24} placeholder={t('compare.notePlaceholder')} aria-label={t('compare.afterNote')}
                        className="rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-brand" />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45"><Lock size={12} /> {t('compare.private')}</p>
            </Section>

            <Section className="space-y-3">
                <Chips<CompareLayout> label={t('compare.layout')} value={layout} onChange={setLayout} options={[
                    { value: 'side', label: t('compare.side') },
                    { value: 'stack', label: t('compare.stack') },
                    { value: 'overlay', label: t('compare.overlay') },
                ]} />
                {layout === 'overlay' && (
                    <input type="range" min={5} max={95} value={split} onChange={e => setSplit(Number(e.target.value))} aria-label={t('compare.slider')} className="w-full accent-[rgb(var(--brand))]" />
                )}
                {preview ? (
                    <>
                        <img src={preview} alt={t('compare.previewAlt')} className={`mx-auto w-full rounded-2xl shadow-2xl shadow-black/50 ${layout === 'stack' ? 'max-w-[19rem]' : ''}`} />
                        <button onClick={share} className="btn-primary w-full"><Share2 size={18} /> {t('wrapped.share')}</button>
                    </>
                ) : (
                    <p className="card p-6 text-center text-sm text-white/50">{t('compare.empty')}</p>
                )}
            </Section>
        </div>
    );
}
