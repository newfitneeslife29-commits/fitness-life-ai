import { getState, subscribeStore } from '../store/store';
import { getSupabase, SUPABASE_URL } from './supabase';

// Community: posts with text and an optional photo, likes and comments.
// Reading needs any session (the anonymous one is fine); posting, liking and
// commenting need an account. Tables: community_* (supabase/migrations);
// photos: the public "community" bucket, one folder per user.

const BUCKET = 'community';
export const PAGE_SIZE = 20;

export interface Author {
    name: string;
    avatarUrl: string | null;
}

export interface Post {
    id: string;
    userId: string;
    body: string;
    imageUrl: string | null;
    imagePath: string | null;
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
const reader = async () => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
    }
    return supabase;
};

export const fetchFeed = async (before?: string): Promise<Post[]> => {
    const supabase = await reader();
    let query = supabase
        .from('community_posts')
        .select('id, body, image_path, created_at, user_id, author:community_profiles(name, avatar_path, updated_at), community_likes(count), community_comments(count)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
    if (before) query = query.lt('created_at', before);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as {
        id: string; body: string; image_path: string | null; created_at: string; user_id: string;
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
        id: r.id, userId: r.user_id, body: r.body, imagePath: r.image_path, imageUrl: publicUrl(r.image_path), createdAt: r.created_at,
        author: authorOf(r.author), likes: r.community_likes[0]?.count ?? 0, comments: r.community_comments[0]?.count ?? 0, liked: liked.has(r.id),
    }));
};

const requireMember = async () => {
    const id = await myId();
    if (!id) throw new Error('account required');
    await syncCommunityProfile();
    return { supabase: await getSupabase(), id };
};

export const createPost = async (body: string, photo: Blob | null) => {
    const { supabase, id } = await requireMember();
    const postId = crypto.randomUUID();
    let imagePath: string | null = null;
    if (photo) {
        imagePath = `${id}/posts/${postId}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(imagePath, photo, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
    }
    const { error } = await supabase.from('community_posts').insert({ id: postId, user_id: id, body: body.trim(), image_path: imagePath });
    if (error) {
        if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
        throw error;
    }
};

export const deletePost = async (post: Post) => {
    const { supabase } = await requireMember();
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (error) throw error;
    if (post.imagePath) await supabase.storage.from(BUCKET).remove([post.imagePath]);
};

export const setLike = async (postId: string, like: boolean) => {
    const { supabase, id } = await requireMember();
    const { error } = like
        ? await supabase.from('community_likes').upsert({ post_id: postId, user_id: id }, { ignoreDuplicates: true })
        : await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', id);
    if (error) throw error;
};

export const fetchComments = async (postId: string): Promise<Comment[]> => {
    const supabase = await reader();
    const { data, error } = await supabase
        .from('community_comments')
        .select('id, body, created_at, user_id, author:community_profiles(name, avatar_path, updated_at)')
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
    const { error } = await supabase.from('community_comments').insert({ post_id: postId, user_id: id, body: body.trim() });
    if (error) throw error;
};

export const deleteComment = async (commentId: string) => {
    const { supabase } = await requireMember();
    const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
    if (error) throw error;
};

// Already reported by this person counts as done.
export const report = async (target: { postId?: string; commentId?: string }, reason = '') => {
    const supabase = await reader();
    const { error } = await supabase.from('community_reports').insert({ post_id: target.postId ?? null, comment_id: target.commentId ?? null, reason });
    if (error && error.code !== '23505') throw error;
};

export const currentMemberId = myId;

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
