// Community notifications: someone liked or commented a post, or started
// following (or asked to follow) someone. The app calls it right after the
// like, comment or follow; the function checks it really happened, just now,
// and announces each one only once.
//
// Deploy:  supabase functions deploy community-push
// Secrets: the push ones (see _shared/push.ts)
//
// Request body (JSON), with a signed-in session:
//   { kind: 'like', postId } | { kind: 'comment', commentId } | { kind: 'follow', userId }  → { sent }
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { preview, pushConfigured, pushToUser } from '../_shared/push.ts';
import { communityText } from '../_shared/push_texts.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const UUID = /^[0-9a-f-]{36}$/;
const recent = () => new Date(Date.now() - 10 * 60_000).toISOString();

// True the first time a key is seen.
const firstTime = async (key: string) => {
  const { error } = await admin.from('push_sent').insert({ key });
  if (error && error.code !== '23505') throw error;
  return !error;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!pushConfigured.android && !pushConfigured.ios) return json({ sent: 0 });

  try {
    let to: string | null = null;
    let key = '';
    let kind: 'like' | 'comment' | 'follow' | 'request' = 'like';
    let text = '';
    let link = '/comunidad';

    if (body.kind === 'like' && UUID.test(String(body.postId))) {
      const { data: like } = await admin.from('community_likes').select('post_id, post:community_posts(user_id)')
        .eq('post_id', body.postId).eq('user_id', user.id).gt('created_at', recent()).maybeSingle();
      to = (like?.post as { user_id?: string } | null)?.user_id ?? null;
      key = `like:${body.postId}:${user.id}`;
    } else if (body.kind === 'comment' && UUID.test(String(body.commentId))) {
      const { data: comment } = await admin.from('community_comments').select('body, post:community_posts(user_id)')
        .eq('id', body.commentId).eq('user_id', user.id).eq('hidden', false).gt('created_at', recent()).maybeSingle();
      to = (comment?.post as { user_id?: string } | null)?.user_id ?? null;
      kind = 'comment';
      text = preview(comment?.body ?? '', 120);
      key = `comment:${body.commentId}`;
    } else if (body.kind === 'follow' && UUID.test(String(body.userId))) {
      const { data: follow } = await admin.from('community_follows').select('status')
        .eq('follower', user.id).eq('following', body.userId).gt('created_at', recent()).maybeSingle();
      to = follow ? String(body.userId) : null;
      kind = follow?.status === 'pending' ? 'request' : 'follow';
      key = `follow:${user.id}:${body.userId}`;
    } else {
      return json({ error: 'bad_request' }, 400);
    }

    if (!to || to === user.id || !(await firstTime(key))) return json({ sent: 0 });
    if (kind === 'like' || kind === 'comment') link = `/comunidad/u/${to}`;
    if (kind === 'follow') link = `/comunidad/u/${user.id}`;

    const { data: profile } = await admin.from('community_profiles').select('name').eq('id', user.id).maybeSingle();
    const name = profile?.name || 'Fitness Life';
    const sent = await pushToUser(admin, to, lang => ({ body: communityText(lang, kind, { name, text }), link, thread: 'community' }));

    // Old keys are no longer needed (likes and follows only count recent ones).
    if (Math.random() < 0.02) await admin.from('push_sent').delete().lt('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString());
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: 'failed' }, 500);
  }
});
