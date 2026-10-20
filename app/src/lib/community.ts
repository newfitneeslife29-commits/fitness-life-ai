import { getState, subscribeStore } from '../store/store';
import { uid } from './id';
import { enablePush, notifyCommunity } from './push';
import { getSessionClient, getSupabase, SUPABASE_URL } from './supabase';

// Community: posts with text and an optional photo, likes and comments,
// 24-hour stories, followers and private profiles.
// Reading needs any session (the anonymous one is fine); posting, liking and
// commenting need an account. Tables: community_* (supabase/migrations);
// photos: the public "community" bucket, one folder per user.

const BUCKET = 'community';
const VIDEO_BUCKET = 'community-videos';
// Short videos only: the app checks the length before uploading.
export const VIDEO_MAX_SECONDS = 30;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const videoUrl = (path: string | null) => (path ? `${SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}/${path}` : null);
export const PAGE_SIZE = 20;

export interface Author {
    name: string;
    avatarUrl: string | null;
}

// What a post is about; the feed can show only one kind.
export type PostKind = 'general' | 'tip' | 'experience' | 'question' | 'achievement';
export const POST_KINDS: PostKind[] = ['tip', 'experience', 'question', 'achievement', 'general'];
const isKind = (v: unknown): v is PostKind => POST_KINDS.includes(v as PostKind);

export interface Post {
    id: string;
    userId: string;
    kind: PostKind;
    body: string;
    imageUrl: string | null;
    imagePath: string | null;
    videoUrl: string | null;
    videoPath: string | null;
    createdAt: string;
    author: Author;
    likes: number;
    comments: number;
    liked: boolean;
}

export interface Comment {
    id: string;
    userId: string;
    body: string;
    createdAt: string;
    author: Author;
}

export const publicUrl = (path: string | null, version?: string) =>
    path ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}${version ? `?v=${Date.parse(version) || version}` : ''}` : null;

type ProfileRow = { name: string; avatar_path: string | null; updated_at: string } | null;
const authorOf = (p: ProfileRow): Author => ({ name: p?.name?.trim() || '', avatarUrl: publicUrl(p?.avatar_path ?? null, p?.updated_at) });

const myId = async () => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    return user && !user.is_anonymous ? user.id : null;
};

// Any session will do for reading; without one, sign in anonymously first.
const reader = getSessionClient;

const POST_COLUMNS = 'id, body, image_path, created_at, user_id, author:community_profiles!community_posts_user_id_fkey(name, avatar_path, updated_at), community_likes(count), community_comments(count)';
// Until the server has post kinds (its database updated), ask without them.
let withKinds = true;
const noKindColumn = (e: { code?: string; message?: string } | null) =>
    Boolean(e && withKinds && (e.code === '42703' || e.code === 'PGRST204' || /\b(kind|video_path)\b/.test(e.message ?? '')));

// All posts, one person's (`user`), or (`following`) those of the people
// followed, matched on the server: their ids in the address would make it
// too long for many follows.
export const fetchFeed = async (before?: string, opts: { following?: boolean; user?: string; kind?: PostKind } = {}): Promise<Post[]> => {
    const supabase = await reader();
    const ask = () => {
        const columns = withKinds ? `kind, video_path, ${POST_COLUMNS}` : POST_COLUMNS;
        let query = (opts.following ? supabase.rpc('community_following_posts').select(columns) : supabase.from('community_posts').select(columns))
            .order('created_at', { ascending: false })
            .limit(PAGE_SIZE);
        if (before) query = query.lt('created_at', before);
        if (opts.user) query = query.eq('user_id', opts.user);
        if (opts.kind && withKinds) query = query.eq('kind', opts.kind);
        return query;
    };
    let { data, error } = await ask();
    if (noKindColumn(error)) {
        withKinds = false;
        if (opts.kind) return []; // no kinds on the server yet: nothing of this kind
        ({ data, error } = await ask());
    }
    if (error) throw error;
    const rows = (data ?? []) as unknown as {
        id: string; kind?: string; video_path?: string | null; body: string; image_path: string | null; created_at: string; user_id: string;
        author: ProfileRow; community_likes: { count: number }[]; community_comments: { count: number }[];
    }[];
    const me = await myId();
    let liked = new Set<string>();
    if (me && rows.length) {
        const { data: mine } = await supabase.from('community_likes').select('post_id').eq('user_id', me).in('post_id', rows.map(r => r.id));
        liked = new Set((mine ?? []).map(l => (l as { post_id: string }).post_id));
    }
    const blocked = new Set(getState().blockedUsers ?? []);
    return rows.filter(r => !blocked.has(r.user_id)).map(r => ({
        id: r.id, userId: r.user_id, kind: isKind(r.kind) ? r.kind : 'general', body: r.body, imagePath: r.image_path, imageUrl: publicUrl(r.image_path), videoPath: r.video_path ?? null, videoUrl: videoUrl(r.video_path ?? null), createdAt: r.created_at,
        author: authorOf(r.author), likes: r.community_likes[0]?.count ?? 0, comments: r.community_comments[0]?.count ?? 0, liked: liked.has(r.id),
    }));
};

const requireMember = async () => {
    const id = await myId();
    if (!id) throw new Error('account required');
    await syncCommunityProfile();
    return { supabase: await getSupabase(), id };
};

const VIDEO_EXT: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };

export const createPost = async (body: string, photo: Blob | null, kind: PostKind = 'general', video: Blob | null = null) => {
    const { supabase, id } = await requireMember();
    const postId = uid();
    let imagePath: string | null = null;
    let videoPath: string | null = null;
    if (photo) {
        imagePath = `${id}/posts/${postId}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(imagePath, photo, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
    }
    if (video) {
        const type = VIDEO_EXT[video.type] ? video.type : 'video/mp4';
        videoPath = `${id}/posts/${postId}.${VIDEO_EXT[type]}`;
        const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(videoPath, video, { contentType: type, upsert: false });
        if (error) throw error;
    }
    const row: { id: string; user_id: string; body: string; image_path: string | null; kind?: PostKind; video_path?: string } = { id: postId, user_id: id, body: body.trim(), image_path: imagePath };
    let { error } = await supabase.from('community_posts').insert(withKinds ? { ...row, kind, ...(videoPath ? { video_path: videoPath } : {}) } : row);
    if (noKindColumn(error) && !videoPath) {
        withKinds = false;
        ({ error } = await supabase.from('community_posts').insert(row));
    }
    if (error) {
        if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
        if (videoPath) await supabase.storage.from(VIDEO_BUCKET).remove([videoPath]);
        throw error;
    }
    // Now there's something to hear about: likes and comments on it.
    void enablePush();
};

export const deletePost = async (post: Post) => {
    const { supabase } = await requireMember();
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (error) throw error;
    if (post.imagePath) await supabase.storage.from(BUCKET).remove([post.imagePath]);
    if (post.videoPath) await supabase.storage.from(VIDEO_BUCKET).remove([post.videoPath]);
};

export const setLike = async (postId: string, like: boolean) => {
    const { supabase, id } = await requireMember();
    const { error } = like
        ? await supabase.from('community_likes').upsert({ post_id: postId, user_id: id }, { ignoreDuplicates: true })
        : await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', id);
    if (error) throw error;
    if (like) void notifyCommunity({ kind: 'like', postId }).catch(() => {});
};

export const fetchComments = async (postId: string): Promise<Comment[]> => {
    const supabase = await reader();
    const { data, error } = await supabase
        .from('community_comments')
        .select('id, body, created_at, user_id, author:community_profiles!community_comments_user_id_fkey(name, avatar_path, updated_at)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(200);
    if (error) throw error;
    const blocked = new Set(getState().blockedUsers ?? []);
    return ((data ?? []) as unknown as { id: string; body: string; created_at: string; user_id: string; author: ProfileRow }[])
        .filter(c => !blocked.has(c.user_id))
        .map(c => ({ id: c.id, userId: c.user_id, body: c.body, createdAt: c.created_at, author: authorOf(c.author) }));
};

export const addComment = async (postId: string, body: string) => {
    const { supabase, id } = await requireMember();
    const { data, error } = await supabase.from('community_comments').insert({ post_id: postId, user_id: id, body: body.trim() }).select('id').single();
    if (error) throw error;
    void notifyCommunity({ kind: 'comment', commentId: (data as { id: string }).id }).catch(() => {});
    void enablePush();
};

export const deleteComment = async (commentId: string) => {
    const { supabase } = await requireMember();
    const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
    if (error) throw error;
};

// Already reported by this person counts as done.
export const report = async (target: { postId?: string; commentId?: string; storyId?: string }, reason = '') => {
    const supabase = await reader();
    const { error } = await supabase.from('community_reports').insert({
        post_id: target.postId ?? null, comment_id: target.commentId ?? null, ...(target.storyId ? { story_id: target.storyId } : {}), reason,
    });
    if (error && error.code !== '23505') throw error;
};

export const currentMemberId = myId;

// ---------- Stories ----------

export interface Story {
    id: string;
    userId: string;
    imageUrl: string;
    imagePath: string;
    caption: string;
    createdAt: string;
}

export interface StoryGroup {
    userId: string;
    author: Author;
    stories: Story[]; // oldest first
}

// Live stories grouped by person: mine first, then the newest.
export const fetchStories = async (): Promise<StoryGroup[]> => {
    const supabase = await reader();
    const { data, error } = await supabase
        .from('community_stories')
        .select('id, user_id, image_path, caption, created_at, author:community_profiles!community_stories_user_id_fkey(name, avatar_path, updated_at)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(300);
    if (error) throw error;
    // The newest 300, shown oldest first within each person.
    data?.reverse();
    const blocked = new Set(getState().blockedUsers ?? []);
    const me = await myId();
    const groups = new Map<string, StoryGroup>();
    for (const r of (data ?? []) as unknown as { id: string; user_id: string; image_path: string; caption: string; created_at: string; author: ProfileRow }[]) {
        if (blocked.has(r.user_id)) continue;
        const g = groups.get(r.user_id) ?? { userId: r.user_id, author: authorOf(r.author), stories: [] };
        g.stories.push({ id: r.id, userId: r.user_id, imagePath: r.image_path, imageUrl: publicUrl(r.image_path)!, caption: r.caption, createdAt: r.created_at });
        groups.set(r.user_id, g);
    }
    const last = (g: StoryGroup) => g.stories[g.stories.length - 1].createdAt;
    return [...groups.values()].sort((a, b) => (a.userId === me ? -1 : b.userId === me ? 1 : last(b).localeCompare(last(a))));
};

export const createStory = async (photo: Blob, caption: string) => {
    const { supabase, id } = await requireMember();
    const storyId = uid();
    const imagePath = `${id}/stories/${storyId}.jpg`;
    const { error: upload } = await supabase.storage.from(BUCKET).upload(imagePath, photo, { contentType: 'image/jpeg', upsert: false });
    if (upload) throw upload;
    const { error } = await supabase.from('community_stories').insert({ id: storyId, user_id: id, image_path: imagePath, caption: caption.trim().slice(0, 200) });
    if (error) {
        await supabase.storage.from(BUCKET).remove([imagePath]);
        throw error;
    }
};

export const deleteStory = async (story: Story) => {
    const { supabase } = await requireMember();
    const { error } = await supabase.from('community_stories').delete().eq('id', story.id);
    if (error) throw error;
    await supabase.storage.from(BUCKET).remove([story.imagePath]);
};

// Stories this phone has already shown (their circle turns grey).
const SEEN_KEY = 'fitness-life:stories-seen';
export const seenStories = (): Set<string> => {
    try {
        return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
    } catch {
        return new Set();
    }
};
export const markStorySeen = (id: string) => {
    const seen = seenStories();
    if (seen.has(id)) return;
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-500)));
    } catch { /* private mode */ }
};

// ---------- Followers and private profiles ----------

export type FollowState = 'none' | 'pending' | 'accepted';

export interface MemberProfile {
    id: string;
    author: Author;
    isPrivate: boolean;
    followers: number;
    following: number;
    posts: number;
    myFollow: FollowState; // whether I follow them
    canSee: boolean;
}

export const fetchMemberProfile = async (userId: string): Promise<MemberProfile> => {
    const supabase = await reader();
    const me = await myId();
    const [{ data: row, error }, followers, following, mine] = await Promise.all([
        supabase.from('community_profiles').select('id, name, avatar_path, updated_at, is_private').eq('id', userId).maybeSingle(),
        supabase.from('community_follows').select('follower', { count: 'exact', head: true }).eq('following', userId).eq('status', 'accepted'),
        supabase.from('community_follows').select('following', { count: 'exact', head: true }).eq('follower', userId).eq('status', 'accepted'),
        me ? supabase.from('community_follows').select('status').eq('follower', me).eq('following', userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (error) throw error;
    const p = row as { name: string; avatar_path: string | null; updated_at: string; is_private: boolean } | null;
    const myFollow = ((mine.data as { status?: FollowState } | null)?.status ?? 'none') as FollowState;
    const isPrivate = p?.is_private ?? false;
    const canSee = userId === me || !isPrivate || myFollow === 'accepted';
    const { count: posts } = canSee
        ? await supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
        : { count: 0 };
    return {
        id: userId, author: authorOf(p), isPrivate, followers: followers.count ?? 0, following: following.count ?? 0,
        posts: posts ?? 0, myFollow, canSee,
    };
};

export const fetchMemberPosts = (userId: string) => fetchFeed(undefined, { user: userId });

export const follow = async (userId: string) => {
    const { supabase, id } = await requireMember();
    const { error } = await supabase.from('community_follows').insert({ follower: id, following: userId });
    if (error && error.code !== '23505') throw error;
    if (!error) void notifyCommunity({ kind: 'follow', userId }).catch(() => {});
    void enablePush();
};

export const unfollow = async (userId: string) => {
    const { supabase, id } = await requireMember();
    const { error } = await supabase.from('community_follows').delete().eq('follower', id).eq('following', userId);
    if (error) throw error;
};

// People I follow (accepted), for the "Following" feed.
export interface FollowRequest { userId: string; author: Author; createdAt: string }

export const fetchFollowRequests = async (): Promise<FollowRequest[]> => {
    const me = await myId();
    if (!me) return [];
    const supabase = await reader();
    const { data, error } = await supabase
        .from('community_follows')
        .select('follower, created_at, author:community_profiles!community_follows_follower_fkey(name, avatar_path, updated_at)')
        .eq('following', me).eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as { follower: string; created_at: string; author: ProfileRow }[])
        .map(r => ({ userId: r.follower, author: authorOf(r.author), createdAt: r.created_at }));
};

export const answerFollowRequest = async (userId: string, accept: boolean) => {
    const { supabase, id } = await requireMember();
    const { error } = accept
        ? await supabase.from('community_follows').update({ status: 'accepted' }).eq('follower', userId).eq('following', id)
        : await supabase.from('community_follows').delete().eq('follower', userId).eq('following', id);
    if (error) throw error;
};

export const fetchMyPrivacy = async (): Promise<boolean> => {
    const me = await myId();
    if (!me) return false;
    const supabase = await reader();
    const { data } = await supabase.from('community_profiles').select('is_private').eq('id', me).maybeSingle();
    return Boolean((data as { is_private?: boolean } | null)?.is_private);
};

export const setPrivateProfile = async (isPrivate: boolean) => {
    const { supabase, id } = await requireMember();
    const { data, error } = await supabase.from('community_profiles').update({ is_private: isPrivate }).eq('id', id).select('id');
    if (error) throw error;
    // No profile row yet (never published): publish it, then try again.
    if (!data?.length) {
        try { localStorage.removeItem(SYNCED_KEY); } catch { /* private mode */ }
        await syncCommunityProfile();
        const again = await supabase.from('community_profiles').update({ is_private: isPrivate }).eq('id', id).select('id');
        if (again.error || !again.data?.length) throw again.error ?? new Error('no profile');
    }
};

// ---------- The signed-in person's public profile (name and picture) ----------

const SYNCED_KEY = 'fitness-life:community-profile';
const fingerprint = (id: string, name: string, avatar?: string) => `${id}|${name}|${avatar ? `${avatar.length}:${avatar.slice(-32)}` : ''}`;

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

// Publishes the name and photo from Ajustes. Runs when they change while signed in.
export const syncCommunityProfile = async () => {
    const account = getState().account;
    const profile = getState().profile;
    if (!account || !profile) return;
    const key = fingerprint(account.id, profile.name.trim(), profile.avatar);
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(SYNCED_KEY);
    } catch { /* private mode */ }
    if (saved === key) return;
    const supabase = await getSupabase();
    let avatarPath: string | null = null;
    if (profile.avatar) {
        avatarPath = `${account.id}/avatar.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(avatarPath, await dataUrlToBlob(profile.avatar), { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
    } else {
        await supabase.storage.from(BUCKET).remove([`${account.id}/avatar.jpg`]);
    }
    const { error } = await supabase.from('community_profiles').upsert({
        id: account.id, name: profile.name.trim().slice(0, 40), avatar_path: avatarPath, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    try {
        localStorage.setItem(SYNCED_KEY, key);
    } catch { /* private mode */ }
};

let timer: number | undefined;
let started = false;
export const startCommunityProfileSync = () => {
    if (started) return;
    started = true;
    let last = '';
    subscribeStore(() => {
        const { account, profile } = getState();
        if (!account || !profile) return;
        const key = fingerprint(account.id, profile.name.trim(), profile.avatar);
        if (key === last) return;
        last = key;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void syncCommunityProfile().catch(e => console.warn('community profile sync failed', e)), 1500);
    });
};
