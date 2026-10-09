import { Camera, Flag, Heart, ImageIcon, MessageCircle, MoreHorizontal, RefreshCw, Send, ShieldAlert, Trash2, UserX, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { confirm, toast } from '../components/feedback';
import { PageHeader, Section, Sheet } from '../components/ui';
import { locale, t } from '../i18n';
import { authAvailable } from '../lib/auth';
import { addComment, createPost, deleteComment, deletePost, fetchComments, fetchFeed, PAGE_SIZE, report, setLike, type Comment, type Post } from '../lib/community';
import { pickImage, resizeImage } from '../lib/image';
import { actions, getState, useStore } from '../store/store';

// Community: share progress, like and comment. Posting needs an account.

const timeAgo = (iso: string) => {
    const s = Math.round((Date.parse(iso) - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto', style: 'short' });
    const abs = Math.abs(s);
    if (abs < 60) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
    return new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
};

const displayName = (name: string) => name || t('community.athlete');

// Zero tolerance for abuse, accepted once before the first post or comment (app store rule).
const acceptRules = async () => {
    if (getState().communityRulesAccepted) return true;
    const ok = await confirm({ title: t('community.rulesTitle'), message: t('community.rules'), confirmLabel: t('community.rulesAccept') });
    if (ok) actions.acceptCommunityRules();
    return ok;
};

const Composer = ({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) => {
    const profile = useStore(s => s.profile)!;
    const [body, setBody] = useState('');
    const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) return;
        setBody('');
        setPhoto(p => {
            if (p) URL.revokeObjectURL(p.url);
            return null;
        });
    }, [open]);

    const choose = async (camera: boolean) => {
        const file = await pickImage({ camera });
        if (!file) return;
        try {
            const blob = await resizeImage(file, 1440, { quality: 0.82 });
            setPhoto(p => {
                if (p) URL.revokeObjectURL(p.url);
                return { blob, url: URL.createObjectURL(blob) };
            });
        } catch {
            toast(t('meal.photoFailed'));
        }
    };

    const publish = async () => {
        if (!(await acceptRules())) return;
        setBusy(true);
        try {
            await createPost(body, photo?.blob ?? null);
            toast(t('community.posted'));
            onPosted();
            onClose();
        } catch {
            toast(t('community.failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('community.newPost')}>
            <div className="flex gap-3">
                <Avatar src={profile.avatar} name={profile.name} size={40} />
                <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} rows={4} autoFocus
                    aria-label={t('community.placeholder')} placeholder={t('community.placeholder')}
                    className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
            </div>
            {photo ? (
                <div className="relative mt-3 overflow-hidden rounded-2xl bg-ink">
                    <img src={photo.url} alt="" className="max-h-72 w-full object-cover" />
                    <button onClick={() => setPhoto(p => { if (p) URL.revokeObjectURL(p.url); return null; })} aria-label={t('meal.removePhoto')}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-snow"><X size={16} /></button>
                </div>
            ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="btn-ghost" onClick={() => choose(true)}><Camera size={18} /> {t('meal.photo')}</button>
                    <button className="btn-ghost" onClick={() => choose(false)}><ImageIcon size={18} /> {t('meal.gallery')}</button>
                </div>
            )}
            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs tabular-nums text-white/40">{body.length}/1000</span>
                <button className="btn-primary px-6" disabled={busy || (!body.trim() && !photo)} onClick={publish}>
                    <Send size={16} /> {busy ? t('community.posting') : t('community.publish')}
                </button>
            </div>
        </Sheet>
    );
};

const CommentsSheet = ({ post, member, onClose, onCount }: { post: Post | null; member: boolean; onClose: () => void; onCount: (n: number) => void }) => {
    const me = useStore(s => s.account?.id);
    const [comments, setComments] = useState<Comment[] | null>(null);
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const listRef = useRef<HTMLUListElement>(null);

    const load = useCallback(async () => {
        if (!post) return;
        try {
            const list = await fetchComments(post.id);
            setComments(list);
            onCount(list.length);
        } catch {
            setComments([]);
        }
    }, [post?.id]);

    useEffect(() => {
        setComments(null);
        setBody('');
        void load();
    }, [load]);

    const send = async () => {
        if (!post || !body.trim()) return;
        if (!(await acceptRules())) return;
        setBusy(true);
        try {
            await addComment(post.id, body);
            setBody('');
            await load();
            listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
        } catch {
            toast(t('community.failed'));
        } finally {
            setBusy(false);
        }
    };

    const menu = async (c: Comment) => {
        if (c.userId === me) {
            if (await confirm({ title: t('community.deleteCommentTitle'), confirmLabel: t('common.delete'), danger: true })) {
                await deleteComment(c.id).catch(() => toast(t('community.failed')));
                await load();
            }
        } else if (await confirm({ title: t('community.reportTitle'), message: t('community.reportMessage'), confirmLabel: t('community.report'), danger: true })) {
            await report({ commentId: c.id }).then(() => toast(t('community.reported'))).catch(() => toast(t('community.failed')));
        }
    };

    return (
        <Sheet open={post !== null} onClose={onClose} title={t('community.comments')}>
            {comments === null ? (
                <p className="py-6 text-center text-sm text-white/50" role="status">{t('community.loading')}</p>
            ) : comments.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/50">{t('community.noComments')}</p>
            ) : (
                <ul ref={listRef} className="space-y-3">
                    {comments.map(c => (
                        <li key={c.id} className="flex gap-2.5">
                            <Avatar src={c.author.avatarUrl} name={displayName(c.author.name)} size={34} />
                            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-ink-3 px-3 py-2">
                                <p className="flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate font-semibold">{displayName(c.author.name)}</span>
                                    <span className="shrink-0 text-[11px] text-white/40">{timeAgo(c.createdAt)}</span>
                                </p>
                                <p className="whitespace-pre-wrap break-words text-sm text-white/85">{c.body}</p>
                            </div>
                            <button onClick={() => menu(c)} aria-label={c.userId === me ? t('common.delete') : t('community.report')}
                                className="self-start rounded-full p-1.5 text-white/35 hover:text-white">
                                {c.userId === me ? <Trash2 size={14} /> : <Flag size={14} />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {member ? (
                <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); void send(); }}>
                    <input value={body} onChange={e => setBody(e.target.value)} maxLength={500} placeholder={t('community.commentPlaceholder')} aria-label={t('community.commentPlaceholder')}
                        className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    <button className="btn-primary px-3.5" disabled={busy || !body.trim()} aria-label={t('community.send')}><Send size={18} /></button>
                </form>
            ) : (
                <Link to="/cuenta" className="btn-ghost mt-4 w-full">{t('community.joinToComment')}</Link>
            )}
        </Sheet>
    );
};

const PostCard = ({ post, me, member, onLike, onComments, onMenu }: {
    post: Post; me: string | null; member: boolean;
    onLike: () => void; onComments: () => void; onMenu: () => void;
}) => (
    <article className="card overflow-hidden" aria-label={displayName(post.author.name)}>
        <header className="flex items-center gap-3 px-4 pt-4">
            <Avatar src={post.author.avatarUrl} name={displayName(post.author.name)} size={42} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayName(post.author.name)}{post.userId === me && <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-strong">{t('community.you')}</span>}</p>
                <p className="text-xs text-white/45">{timeAgo(post.createdAt)}</p>
            </div>
            <button onClick={onMenu} aria-label={t('community.options')} className="rounded-full p-2 text-white/50 hover:bg-ink-3 hover:text-white"><MoreHorizontal size={18} /></button>
        </header>
        {post.body && <p className="whitespace-pre-wrap break-words px-4 pt-3 text-[15px] leading-relaxed text-white/90">{post.body}</p>}
        {post.imageUrl && (
            <div className="mt-3 bg-ink">
                <img src={post.imageUrl} alt={t('community.photoAlt', { name: displayName(post.author.name) })} loading="lazy" onDoubleClick={() => member && !post.liked && onLike()}
                    className="max-h-[32rem] w-full object-cover" />
            </div>
        )}
        <footer className="flex items-center gap-1 px-2 py-2">
            <button onClick={onLike} aria-pressed={post.liked} aria-label={t('community.like')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition active:scale-95 ${post.liked ? 'text-red-500' : 'text-white/60 hover:text-white'}`}>
                <Heart size={20} className={post.liked ? 'animate-pop fill-red-500' : ''} /> <span className="tabular-nums">{post.likes}</span>
            </button>
            <button onClick={onComments} aria-label={t('community.comments')}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-white/60 hover:text-white">
                <MessageCircle size={20} /> <span className="tabular-nums">{post.comments}</span>
            </button>
        </footer>
    </article>
);

export default function Community() {
    const account = useStore(s => s.account);
    const profile = useStore(s => s.profile)!;
    const blocked = useStore(s => s.blockedUsers);
    const member = Boolean(account);
    const me = account?.id ?? null;
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [more, setMore] = useState(false);
    const [composing, setComposing] = useState(false);
    const [commentsFor, setCommentsFor] = useState<Post | null>(null);
    const [menuFor, setMenuFor] = useState<Post | null>(null);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const page = await fetchFeed();
            setPosts(page);
            setMore(page.length >= PAGE_SIZE);
        } catch {
            setFailed(true);
            setPosts(p => p ?? []);
        }
    }, []);

    useEffect(() => {
        if (authAvailable()) void load();
    }, [load, me, blocked?.length]);

    const loadMore = async () => {
        const last = posts?.[posts.length - 1];
        if (!last) return;
        try {
            const page = await fetchFeed(last.createdAt);
            setPosts(p => [...(p ?? []), ...page]);
            setMore(page.length >= PAGE_SIZE);
        } catch {
            toast(t('community.failed'));
        }
    };

    const patch = (id: string, change: Partial<Post>) => setPosts(p => p?.map(x => (x.id === id ? { ...x, ...change } : x)) ?? p);

    const like = async (post: Post) => {
        if (!member) {
            toast(t('community.joinToLike'));
            return;
        }
        const liked = !post.liked;
        patch(post.id, { liked, likes: post.likes + (liked ? 1 : -1) });
        try {
            await setLike(post.id, liked);
        } catch {
            patch(post.id, { liked: post.liked, likes: post.likes });
            toast(t('community.failed'));
        }
    };

    const removePost = async (post: Post) => {
        setMenuFor(null);
        if (!(await confirm({ title: t('community.deletePostTitle'), message: t('community.deletePostMessage'), confirmLabel: t('common.delete'), danger: true }))) return;
        try {
            await deletePost(post);
            setPosts(p => p?.filter(x => x.id !== post.id) ?? p);
            toast(t('community.deleted'));
        } catch {
            toast(t('community.failed'));
        }
    };

    const reportPost = async (post: Post) => {
        setMenuFor(null);
        if (!(await confirm({ title: t('community.reportTitle'), message: t('community.reportMessage'), confirmLabel: t('community.report'), danger: true }))) return;
        try {
            await report({ postId: post.id });
            setPosts(p => p?.filter(x => x.id !== post.id) ?? p);
            toast(t('community.reported'));
        } catch {
            toast(t('community.failed'));
        }
    };

    const block = async (post: Post) => {
        setMenuFor(null);
        const name = displayName(post.author.name);
        if (!(await confirm({ title: t('community.blockTitle', { name }), message: t('community.blockMessage'), confirmLabel: t('community.block'), danger: true }))) return;
        actions.blockUser(post.userId);
        setPosts(p => p?.filter(x => x.userId !== post.userId) ?? p);
        toast(t('community.blocked', { name }));
    };

    if (!authAvailable()) {
        return (
            <div className="space-y-6">
                <PageHeader title={t('nav.community')} subtitle={t('community.subtitle')} />
                <Section><p className="card p-6 text-center text-sm text-white/60">{t('community.unavailable')}</p></Section>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            <PageHeader title={t('nav.community')} subtitle={t('community.subtitle')}
                action={<button onClick={() => { setPosts(null); void load(); }} aria-label={t('community.refresh')} className="rounded-full p-2 text-white/60 hover:bg-ink-3 hover:text-white"><RefreshCw size={18} /></button>} />

            <Section>
                {member ? (
                    <button onClick={() => setComposing(true)} className="card flex w-full items-center gap-3 p-3 text-left hover:bg-ink-3">
                        <Avatar src={profile.avatar} name={profile.name} size={42} />
                        <span className="min-w-0 flex-1 rounded-full bg-ink-3 px-4 py-2.5 text-sm text-white/50">{t('community.placeholder')}</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-snow"><Camera size={18} /></span>
                    </button>
                ) : (
                    <div className="card relative overflow-hidden p-5 text-center">
                        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(80%_100%_at_50%_0%,rgb(var(--brand)/0.22),transparent_75%)]" />
                        <span className="relative mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-snow"><Users size={22} /></span>
                        <p className="relative font-semibold">{t('community.joinTitle')}</p>
                        <p className="relative mt-1 text-sm text-white/60">{t('community.joinText')}</p>
                        <Link to="/cuenta" className="btn-primary relative mt-4 w-full">{t('account.cta')}</Link>
                    </div>
                )}
            </Section>

            <Section>
                {posts === null ? (
                    <div className="space-y-3" role="status" aria-label={t('community.loading')}>
                        {[0, 1].map(i => (
                            <div key={i} className="card animate-pulse p-4">
                                <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full bg-ink-3" /><span className="h-3 w-32 rounded bg-ink-3" /></div>
                                <div className="mt-4 h-40 rounded-xl bg-ink-3" />
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="card p-8 text-center">
                        <ShieldAlert size={28} className="mx-auto mb-2 text-white/30" />
                        <p className="text-sm text-white/60">{failed ? t('community.loadFailed') : t('community.empty')}</p>
                        {failed && <button className="btn-ghost mt-3" onClick={() => void load()}><RefreshCw size={16} /> {t('community.retry')}</button>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} me={me} member={member}
                                onLike={() => void like(post)} onComments={() => setCommentsFor(post)} onMenu={() => setMenuFor(post)} />
                        ))}
                        {more && <button className="btn-ghost w-full" onClick={() => void loadMore()}>{t('community.more')}</button>}
                    </div>
                )}
            </Section>

            <Composer open={composing} onClose={() => setComposing(false)} onPosted={() => void load()} />
            <CommentsSheet post={commentsFor} member={member} onClose={() => setCommentsFor(null)}
                onCount={n => commentsFor && patch(commentsFor.id, { comments: n })} />
            <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={t('community.options')}>
                {menuFor && (menuFor.userId === me ? (
                    <button className="btn-ghost w-full text-red-500" onClick={() => void removePost(menuFor)}><Trash2 size={18} /> {t('community.deletePost')}</button>
                ) : (
                    <div className="space-y-2">
                        <button className="btn-ghost w-full" onClick={() => void reportPost(menuFor)}><Flag size={18} /> {t('community.reportPost')}</button>
                        <button className="btn-ghost w-full text-red-500" onClick={() => void block(menuFor)}><UserX size={18} /> {t('community.block')} {displayName(menuFor.author.name)}</button>
                    </div>
                ))}
            </Sheet>
        </div>
    );
}
