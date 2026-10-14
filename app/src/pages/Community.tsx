import { Camera, ImageIcon, RefreshCw, Send, ShieldAlert, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { toast } from '../components/feedback';
import { acceptRules, PostList } from '../components/community/Posts';
import { StoriesBar, StoryComposer, StoryViewer } from '../components/community/Stories';
import { Section, Sheet } from '../components/ui';
import { t } from '../i18n';
import { authAvailable } from '../lib/auth';
import { createPost, fetchFeed, fetchFollowingIds, fetchFollowRequests, fetchStories, PAGE_SIZE, type Post, type StoryGroup } from '../lib/community';
import { pickImage, resizeImage } from '../lib/image';
import { useStore } from '../store/store';
import { errorText } from '../lib/errorText';

// Community: stories at the top, then the feed (everyone, or the people you
// follow). Posting needs an account; private profiles are seen by followers.

type Tab = 'all' | 'following';

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

export default function Community() {
    const account = useStore(s => s.account);
    const profile = useStore(s => s.profile)!;
    const blocked = useStore(s => s.blockedUsers);
    const member = Boolean(account);
    const me = account?.id ?? null;
    const [tab, setTab] = useState<Tab>('all');
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [failed, setFailed] = useState<string | false>(false);
    const [more, setMore] = useState(false);
    const [composing, setComposing] = useState(false);
    const [stories, setStories] = useState<StoryGroup[] | null>(null);
    const [storyAt, setStoryAt] = useState<number | null>(null);
    const [addingStory, setAddingStory] = useState(false);
    const [requests, setRequests] = useState(0);
    const [following, setFollowing] = useState<string[] | undefined>(undefined);

    const loadStories = useCallback(() => {
        fetchStories().then(setStories).catch(() => setStories([]));
    }, []);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const only = tab === 'following' ? await fetchFollowingIds() : undefined;
            setFollowing(only);
            const page = await fetchFeed(undefined, { only });
            setPosts(page);
            setMore(page.length >= PAGE_SIZE);
        } catch (e) {
            // The reason is shown small under the message, to tell a network
            // problem from a server one.
            setFailed(errorText(e));
            setPosts(p => p ?? []);
        }
    }, [tab]);

    useEffect(() => {
        if (!authAvailable()) return;
        void load();
        loadStories();
        if (member) fetchFollowRequests().then(r => setRequests(r.length)).catch(() => {});
    }, [load, loadStories, me, blocked?.length]);

    const loadMore = async () => {
        const last = posts?.[posts.length - 1];
        if (!last) return;
        try {
            const page = await fetchFeed(last.createdAt, { only: following });
            setPosts(p => [...(p ?? []), ...page]);
            setMore(page.length >= PAGE_SIZE);
        } catch {
            toast(t('community.failed'));
        }
    };

    const header = (
        <header className="relative overflow-hidden bg-gradient-to-br from-brand via-rose-500 to-fuchsia-600 px-4 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] text-snow">
            <div aria-hidden className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div aria-hidden className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />
            <div className="relative flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-extrabold tracking-tight">{t('nav.community')}</h1>
                    <p className="text-sm text-snow/85">{t('community.subtitle')}</p>
                </div>
                {authAvailable() && (
                    <>
                        <button onClick={() => { setPosts(null); void load(); loadStories(); }} aria-label={t('community.refresh')} className="rounded-full bg-white/15 p-2.5 hover:bg-white/25"><RefreshCw size={18} /></button>
                        {member && (
                            <Link to={`/comunidad/u/${me}`} aria-label={t('profile.mine')} className="relative rounded-full ring-2 ring-white/70">
                                <Avatar src={profile.avatar} name={profile.name} size={40} />
                                {requests > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-ink">{requests}</span>}
                            </Link>
                        )}
                    </>
                )}
            </div>
        </header>
    );

    if (!authAvailable()) {
        return (
            <div className="space-y-6">
                {header}
                <Section><p className="card p-6 text-center text-sm text-white/60">{t('community.unavailable')}</p></Section>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {header}

            <Section>
                <StoriesBar groups={stories} member={member} myAvatar={profile.avatar} myName={profile.name}
                    onAdd={() => setAddingStory(true)} onOpen={setStoryAt} />
            </Section>

            {requests > 0 && (
                <Section>
                    <Link to={`/comunidad/u/${me}`} className="card flex items-center gap-3 border-amber-400/40 bg-amber-400/10 p-3">
                        <UserPlus size={20} className="text-amber-400" />
                        <span className="flex-1 text-sm font-semibold">{t('profile.requestsBanner', { n: requests })}</span>
                    </Link>
                </Section>
            )}

            <Section>
                {member ? (
                    <button onClick={() => setComposing(true)} className="card flex w-full items-center gap-3 p-3 text-left hover:bg-ink-3">
                        <Avatar src={profile.avatar} name={profile.name} size={42} />
                        <span className="min-w-0 flex-1 rounded-full bg-ink-3 px-4 py-2.5 text-sm text-white/50">{t('community.placeholder')}</span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-fuchsia-500 text-snow"><Camera size={18} /></span>
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

            {member && (
                <Section>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-2 p-1" role="tablist" aria-label={t('community.feeds')}>
                        {(['all', 'following'] as const).map(k => (
                            <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setPosts(null); }}
                                className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? 'bg-gradient-to-r from-brand to-rose-500 text-snow shadow' : 'text-white/55'}`}>
                                {t(`community.tab.${k}`)}
                            </button>
                        ))}
                    </div>
                </Section>
            )}

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
                        <p className="text-sm text-white/60">{failed ? t('community.loadFailed') : tab === 'following' ? t('community.followingEmpty') : t('community.empty')}</p>
                        {failed && <p className="mt-1 break-words text-xs text-white/35">{failed}</p>}
                        {failed && <button className="btn-ghost mt-3" onClick={() => void load()}><RefreshCw size={16} /> {t('community.retry')}</button>}
                    </div>
                ) : (
                    <>
                        <PostList posts={posts} setPosts={setPosts} />
                        {more && <button className="btn-ghost mt-3 w-full" onClick={() => void loadMore()}>{t('community.more')}</button>}
                    </>
                )}
            </Section>

            <Composer open={composing} onClose={() => setComposing(false)} onPosted={() => void load()} />
            <StoryComposer open={addingStory} onClose={() => setAddingStory(false)} onPosted={loadStories} />
            {storyAt !== null && stories && (
                <StoryViewer groups={stories} start={storyAt} onClose={() => { setStoryAt(null); setStories(s => (s ? [...s] : s)); }} onChanged={loadStories} />
            )}
        </div>
    );
}
