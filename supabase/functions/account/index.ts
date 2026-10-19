// Account management that needs the service role: deleting an account.
//
// Deploy:  supabase functions deploy account
// Request: POST { action: 'delete' } with the signed-in user's session.
// Deletes the user's cloud copy, AI usage records, community photos and
// posts, and the account itself.
// Subscriptions are kept by the stores and RevenueCat; the app tells the
// user to cancel there. Trainer hires (Stripe) end with the account.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { stripe, stripeConfigured } from '../_shared/stripe.ts';

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
    // Community photos and videos (profile picture and posts) live in the user's folder.
    for (const name of ['community', 'community-videos']) {
      const bucket = admin.storage.from(name);
      for (const folder of [user.id, `${user.id}/posts`, `${user.id}/stories`]) {
        const { data: files } = await bucket.list(folder, { limit: 1000 });
        const paths = (files ?? []).filter(f => f.id).map(f => `${folder}/${f.name}`);
        if (paths.length) await bucket.remove(paths);
      }
    }
    // Hires as client or as trainer: nobody keeps paying for them.
    const { data: hires } = await admin.from('trainer_clients').select('stripe_subscription_id')
      .or(`client_id.eq.${user.id},trainer_user_id.eq.${user.id}`).in('status', ['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);
    if (hires?.length && !stripeConfigured) throw new Error('stripe not configured');
    for (const hire of hires ?? []) {
      await stripe.subscriptions.cancel(hire.stripe_subscription_id).catch(e => {
        if (e?.code !== 'resource_missing') throw e;
      });
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
