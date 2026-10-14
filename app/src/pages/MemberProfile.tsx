import { Check, ChevronLeft, Lock, UserCheck, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { confirm, toast } from '../components/feedback';
import { displayName, PostList } from '../components/community/Posts';
import { Section } from '../components/ui';
import { t } from '../i18n';
import {
    answerFollowRequest, fetchFollowRequests, fetchMemberPosts, fetchMemberProfile, fetchMyPrivacy, follow, setPrivateProfile, unfollow,
    type FollowRequest, type MemberProfile as Profile, type Post,
} from '../lib/community';
import { fmtNumber } from '../lib/format';
import { useStore } from '../store/store';

// A person in the community: picture, counts, follow button and posts (only
// for followers when the profile is private). On your own profile: the
// private switch and the people asking to follow you.

export default function MemberProfile() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const me = useStore(s => s.account?.id ?? null);
    const mine = id === me;
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [requests, setRequests] = useState<FollowRequest[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [busy, setBusy] = useState(false);

    // The answer for another person (opened from this one) is dropped.
    const shown = useRef(id);
    const load = useCallback(async () => {
        shown.current = id;
        const current = () => shown.current === id;
        try {
            const p = await fetchMemberProfile(id);
            const list = p.canSee ? await fetchMemberPosts(id) : [];
            if (!current()) return;
            setProfile(p);
            setPosts(list);
            if (mine) {
                const [priv, reqs] = await Promise.all([fetchMyPrivacy(), fetchFollowRequests()]);
                if (!current()) return;
                setIsPrivate(priv);
                setRequests(reqs);
            }
        } catch {
            if (!current()) return;
            toast(t('community.failed'));
            setPosts([]);
        }
    }, [id, mine]);

    useEffect(() => {
        setProfile(null);
        setPosts(null);
        setRequests([]);
        void load();
    }, [load]);

    const toggleFollow = async () => {
        if (!me) {
            toast(t('community.joinToLike'));
            return;
        }
        if (!profile) return;
        if (profile.myFollow !== 'none' && !(await confirm({
            title: profile.myFollow === 'pending' ? t('profile.cancelRequest') : t('profile.unfollowTitle', { name: displayName(profile.author.name) }),
            confirmLabel: profile.myFollow === 'pending' ? t('profile.cancelRequest') : t('profile.unfollow'), danger: true,
        }))) return;
        setBusy(true);
        try {
            if (profile.myFollow === 'none') {
                await follow(id);
                toast(profile.isPrivate ? t('profile.requested') : t('profile.followingNow', { name: displayName(profile.author.name) }));
            } else await unfollow(id);
            await load();
        } catch {
            toast(t('community.failed'));
        } finally {
            setBusy(false);
        }
    };

    const togglePrivate = async () => {
        const next = !isPrivate;
        setIsPrivate(next);
        try {
            await setPrivateProfile(next);
            toast(next ? t('profile.nowPrivate') : t('profile.nowPublic'));
            await load();
        } catch {
            setIsPrivate(!next);
            toast(t('community.failed'));
        }
    };

    const answer = async (r: FollowRequest, accept: boolean) => {
        try {
            await answerFollowRequest(r.userId, accept);
            setRequests(list => list.filter(x => x.userId !== r.userId));
            if (accept) toast(t('profile.accepted', { name: displayName(r.author.name) }));
            await load();
        } catch {
            toast(t('community.failed'));
        }
    };

    const name = profile ? displayName(profile.author.name) : '';
    const followLabel = profile?.myFollow === 'accepted' ? t('profile.following') : profile?.myFollow === 'pending' ? t('profile.pending') : t('profile.follow');

    return (
        <div className="space-y-5 pb-4">
            <header className="bleed-top relative overflow-hidden bg-gradient-to-br from-brand via-rose-500 to-fuchsia-600 px-4 pb-14 pt-[calc(0.75rem+env(safe-area-inset-top))] text-snow">
                <div aria-hidden className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-snow/15 blur-2xl" />
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="relative -ml-2 rounded-lg p-2 text-snow/85 hover:bg-snow/10"><ChevronLeft size={22} /></button>
            </header>
            <div className="-mt-16 px-4 text-center">
                <span className="inline-block rounded-full bg-gradient-to-tr from-amber-400 via-brand to-fuchsia-500 p-1">
                    <span className="block rounded-full bg-ink p-1"><Avatar src={profile?.author.avatarUrl} name={name || ' '} size={96} /></span>
                </span>
                <h1 className="mt-2 flex items-center justify-center gap-1.5 text-2xl font-extrabold">
                    {name || '…'} {profile?.isPrivate && <Lock size={18} className="text-white/50" aria-label={t('profile.private')} />}
                </h1>
                {profile && (
                    <div className="mx-auto mt-3 grid max-w-xs grid-cols-3 gap-2">
                        {[
                            { n: profile.posts, label: t('profile.posts') },
                            { n: profile.followers, label: t('profile.followers') },
                            { n: profile.following, label: t('profile.followingCount') },
                        ].map(s => (
                            <div key={s.label}>
                                <p className="text-xl font-extrabold tabular-nums">{fmtNumber(s.n)}</p>
                                <p className="text-xs text-white/55">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
                {profile && !mine && (
                    <button onClick={() => void toggleFollow()} disabled={busy}
                        className={`mx-auto mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl py-2.5 font-semibold ${profile.myFollow === 'none' ? 'bg-gradient-to-r from-brand to-rose-500 text-snow shadow-lg shadow-brand/30' : 'bg-ink-3 text-white'}`}>
                        {profile.myFollow === 'accepted' ? <UserCheck size={18} /> : <UserPlus size={18} />} {followLabel}
                    </button>
                )}
            </div>

            {mine && (
                <Section>
                    <div className="card divide-y divide-line">
                        <div className="flex items-center gap-3 p-4">
                            <Lock size={20} className="shrink-0 text-brand" />
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{t('profile.privateTitle')}</p>
                                <p className="text-sm text-white/55">{t('profile.privateHint')}</p>
                            </div>
                            <button role="switch" aria-checked={isPrivate} aria-label={t('profile.privateTitle')} onClick={() => void togglePrivate()}
                                className={`relative h-7 w-12 shrink-0 rounded-full transition ${isPrivate ? 'bg-brand' : 'bg-ink-4'}`}>
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isPrivate ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        {requests.length > 0 && (
                            <div className="p-4">
                                <p className="label mb-2">{t('profile.requests', { n: requests.length })}</p>
                                <ul className="space-y-2">
                                    {requests.map(r => (
                                        <li key={r.userId} className="flex items-center gap-3">
                                            <Link to={`/comunidad/u/${r.userId}`} className="flex min-w-0 flex-1 items-center gap-2">
                                                <Avatar src={r.author.avatarUrl} name={displayName(r.author.name)} size={36} />
                                                <span className="truncate font-medium">{displayName(r.author.name)}</span>
                                            </Link>
                                            <button onClick={() => void answer(r, true)} aria-label={t('profile.accept', { name: displayName(r.author.name) })}
                                                className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-snow"><Check size={14} /> {t('profile.acceptShort')}</button>
                                            <button onClick={() => void answer(r, false)} aria-label={t('profile.decline', { name: displayName(r.author.name) })}
                                                className="rounded-full p-2 text-white/50 hover:bg-ink-3"><X size={16} /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Section>
            )}

            <Section>
                {posts === null ? (
                    <div className="card h-40 animate-pulse" role="status" aria-label={t('community.loading')} />
                ) : profile && !profile.canSee ? (
                    <div className="card p-8 text-center">
                        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30"><Lock size={24} /></span>
                        <p className="font-semibold">{t('profile.privateLocked')}</p>
                        <p className="mt-1 text-sm text-white/55">{t('profile.privateLockedHint')}</p>
                    </div>
                ) : posts.length === 0 ? (
                    <p className="card p-8 text-center text-sm text-white/55">{mine ? t('profile.noPostsMine') : t('profile.noPosts')}</p>
                ) : (
                    <PostList posts={posts} setPosts={setPosts} />
                )}
            </Section>
        </div>
    );
}
