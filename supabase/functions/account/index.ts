// Account management that needs the service role: deleting an account.
//
// Deploy:  supabase functions deploy account
// Request: POST { action: 'delete' } with the signed-in user's session.
// Deletes the user's cloud copy, AI usage records, community photos and
// posts, and the account itself.
// Subscriptions are kept by the stores and RevenueCat; the app tells the
// user to cancel there.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user || user.is_anonymous) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  if (body.action !== 'delete') return json({ error: 'unknown action' }, 400);

  try {
    // Community photos (profile picture and posts) live in the user's folder.
    const bucket = admin.storage.from('community');
    for (const folder of [user.id, `${user.id}/posts`]) {
      const { data: files } = await bucket.list(folder, { limit: 1000 });
      const paths = (files ?? []).filter(f => f.id).map(f => `${folder}/${f.name}`);
      if (paths.length) await bucket.remove(paths);
    }
    // Posts, likes and comments go with the account (foreign keys cascade).
    for (const table of ['user_data', 'ai_usage']) {
      const { error } = await admin.from(table).delete().eq('user_id', user.id);
      if (error) throw error;
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error('account: delete failed', error);
    return json({ error: 'failed' }, 500);
  }
});
