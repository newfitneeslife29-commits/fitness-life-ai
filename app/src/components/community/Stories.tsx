import { Camera, Flag, ImageIcon, Plus, Send, Trash2, UserX, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../Avatar';
import { confirm, toast } from '../feedback';
import { Sheet } from '../ui';
import { t } from '../../i18n';
import { createStory, deleteStory, markStorySeen, report, seenStories, type Story, type StoryGroup } from '../../lib/community';
import { pickImage, resizeImage } from '../../lib/image';
import { actions, useStore } from '../../store/store';
import { acceptRules, displayName, timeAgo } from './Posts';

// Stories: photos that last 24 hours, shown in a row of circles at the top of
// the community, like Instagram. A coloured ring means there is something new.

const STORY_MS = 5000;

const Ring = ({ seen, children }: { seen: boolean; children: ReactNode }) => (
    <span className={`rounded-full p-[2.5px] ${seen ? 'bg-white/20' : 'bg-gradient-to-tr from-amber-400 via-brand to-fuchsia-500'}`}>
        <span className="block rounded-full bg-ink p-[2px]">{children}</span>
    </span>
);

export const StoryComposer = ({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) => {
    const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
    const [caption, setCaption] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (open) return;
        setCaption('');
        setPhoto(p => { if (p) URL.revokeObjectURL(p.url); return null; });
    }, [open]);

    const choose = async (camera: boolean) => {
        const file = await pickImage({ camera });
        if (!file) return;
        try {
            const blob = await resizeImage(file, 1440, { quality: 0.82 });
            setPhoto(p => { if (p) URL.revokeObjectURL(p.url); return { blob, url: URL.createObjectURL(blob) }; });
        } catch {
            toast(t('meal.photoFailed'));
        }
    };

    const publish = async () => {
        if (!photo || !(await acceptRules())) return;
        setBusy(true);
        try {
            await createStory(photo.blob, caption);
            toast(t('stories.posted'));
            onPosted();
            onClose();
        } catch {
            toast(t('community.failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('stories.new')}>
            {photo ? (
                <div className="relative mx-auto aspect-[9/16] max-h-[55vh] overflow-hidden rounded-2xl bg-black">
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    {caption && <p className="absolute inset-x-3 bottom-4 rounded-xl bg-black/50 px-3 py-2 text-center font-semibold text-white">{caption}</p>}
                    <button onClick={() => setPhoto(p => { if (p) URL.revokeObjectURL(p.url); return null; })} aria-label={t('meal.removePhoto')}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-snow"><X size={16} /></button>
                </div>
            ) : (
                <>
                    <p className="mb-3 text-sm text-white/60">{t('stories.hint')}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="btn-primary py-3" onClick={() => choose(true)}><Camera size={18} /> {t('meal.photo')}</button>
                        <button className="btn-ghost py-3" onClick={() => choose(false)}><ImageIcon size={18} /> {t('meal.gallery')}</button>
                    </div>
                </>
            )}
            <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder={t('stories.caption')} aria-label={t('stories.caption')}
                className="mt-3 w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
            <button className="btn-primary mt-3 w-full" disabled={!photo || busy} onClick={publish}>
                <Send size={16} /> {busy ? t('community.posting') : t('stories.share')}
            </button>
        </Sheet>
    );
};

export const StoryViewer = ({ groups, start, onClose, onChanged }: {
    groups: StoryGroup[]; start: number; onClose: () => void; onChanged: () => void;
}) => {
    const me = useStore(s => s.account?.id ?? null);
    const [g, setG] = useState(start);
    const [i, setI] = useState(0);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const elapsed = useRef(0);
    const group = groups[g];
    const story = group?.stories[i];

    const next = () => {
        if (!group) return onClose();
        if (i < group.stories.length - 1) setI(i + 1);
        else if (g < groups.length - 1) { setG(g + 1); setI(0); }
        else onClose();
    };
    const prev = () => {
        if (i > 0) setI(i - 1);
        else if (g > 0) { setG(g - 1); setI(groups[g - 1].stories.length - 1); }
    };

    useEffect(() => {
        elapsed.current = 0;
        setProgress(0);
        if (story) markStorySeen(story.id);
    }, [story?.id]);

    useEffect(() => {
        if (paused || !story) return;
        let last = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            elapsed.current += now - last;
            last = now;
            setProgress(Math.min(1, elapsed.current / STORY_MS));
            if (elapsed.current >= STORY_MS) next();
            else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [paused, story?.id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!group || !story) return null;
    const name = displayName(group.author.name);
    const mine = group.userId === me;

    const act = async (fn: () => Promise<void>) => {
        setPaused(true);
        await fn();
        setPaused(false);
    };
    const remove = (s: Story) => act(async () => {
        if (!(await confirm({ title: t('stories.deleteTitle'), confirmLabel: t('common.delete'), danger: true }))) return;
        try {
            await deleteStory(s);
            onChanged();
            onClose();
        } catch {
            toast(t('community.failed'));
        }
    });
    const reportIt = (s: Story) => act(async () => {
        if (!(await confirm({ title: t('community.reportTitle'), message: t('community.reportMessage'), confirmLabel: t('community.report'), danger: true }))) return;
        await report({ storyId: s.id }).then(() => toast(t('community.reported'))).catch(() => toast(t('community.failed')));
        onChanged();
        onClose();
    });
    const block = () => act(async () => {
        if (!(await confirm({ title: t('community.blockTitle', { name }), message: t('community.blockMessage'), confirmLabel: t('community.block'), danger: true }))) return;
        actions.blockUser(group.userId);
        toast(t('community.blocked', { name }));
        onChanged();
        onClose();
    });

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={t('stories.of', { name })}>
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                <div className="flex gap-1">
                    {group.stories.map((s, n) => (
                        <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                            <span className="block h-full bg-white" style={{ width: `${n < i ? 100 : n === i ? progress * 100 : 0}%` }} />
                        </span>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <Avatar src={group.author.avatarUrl} name={name} size={34} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name} <span className="font-normal text-white/60">· {timeAgo(story.createdAt)}</span></p>
                    {mine ? (
                        <button onClick={() => void remove(story)} aria-label={t('stories.deleteTitle')} className="rounded-full p-2 hover:bg-white/10"><Trash2 size={18} /></button>
                    ) : (
                        <>
                            <button onClick={() => void reportIt(story)} aria-label={t('community.report')} className="rounded-full p-2 hover:bg-white/10"><Flag size={18} /></button>
                            <button onClick={() => void block()} aria-label={`${t('community.block')} ${name}`} className="rounded-full p-2 hover:bg-white/10"><UserX size={18} /></button>
                        </>
                    )}
                    <button onClick={onClose} aria-label={t('common.close')} className="rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
                </div>
            </div>
            <div className="relative flex flex-1 items-center justify-center"
                onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
                <img src={story.imageUrl} alt={story.caption || t('stories.of', { name })} className="max-h-full w-full object-contain" draggable={false} />
                <button aria-label={t('stories.previous')} onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
                <button aria-label={t('stories.next')} onClick={next} className="absolute inset-y-0 right-0 w-2/3" />
                {story.caption && (
                    <p className="pointer-events-none absolute inset-x-4 bottom-[calc(2rem+env(safe-area-inset-bottom))] rounded-2xl bg-black/55 px-4 py-3 text-center text-lg font-semibold backdrop-blur">{story.caption}</p>
                )}
            </div>
        </div>
    );
};

export const StoriesBar = ({ groups, member, myAvatar, myName, onAdd, onOpen }: {
    groups: StoryGroup[] | null; member: boolean; myAvatar?: string; myName: string;
    onAdd: () => void; onOpen: (index: number) => void;
}) => {
    const me = useStore(s => s.account?.id ?? null);
    const seen = seenStories();
    const mineIndex = groups?.findIndex(g => g.userId === me) ?? -1;
    return (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1" role="list" aria-label={t('stories.title')}>
            {member && (
                <div role="listitem" className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1">
                    <div className="relative">
                        <button onClick={() => (mineIndex >= 0 ? onOpen(mineIndex) : onAdd())} aria-label={mineIndex >= 0 ? t('stories.yours') : t('stories.new')}>
                            <Ring seen={mineIndex < 0 || groups![mineIndex].stories.every(s => seen.has(s.id))}><Avatar src={myAvatar} name={myName} size={60} /></Ring>
                        </button>
                        {mineIndex >= 0 && (
                            <button onClick={onAdd} aria-label={t('stories.add')}
                                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-brand text-snow"><Plus size={14} strokeWidth={3} /></button>
                        )}
                        {mineIndex < 0 && <span aria-hidden className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink bg-brand text-snow"><Plus size={14} strokeWidth={3} /></span>}
                    </div>
                    <span className="w-full truncate text-center text-[11px] text-white/70">{t('stories.yours')}</span>
                </div>
            )}
            {groups === null
                ? [0, 1, 2, 3].map(n => <span key={n} className="h-[68px] w-[68px] shrink-0 animate-pulse rounded-full bg-ink-3" />)
                : groups.map((g, index) => g.userId === me ? null : (
                    <div key={g.userId} role="listitem" className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1">
                        <button onClick={() => onOpen(index)} aria-label={t('stories.of', { name: displayName(g.author.name) })}>
                            <Ring seen={g.stories.every(s => seen.has(s.id))}><Avatar src={g.author.avatarUrl} name={displayName(g.author.name)} size={60} /></Ring>
                        </button>
                        <span className="w-full truncate text-center text-[11px] text-white/70">{displayName(g.author.name)}</span>
                    </div>
                ))}
        </div>
    );
};
