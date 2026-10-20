// Tells the other person in a trainer chat that a message arrived, with a
// notification on their phones. The app calls it right after sending.
//
// Deploy:  supabase functions deploy chat-push
// Secrets: FIREBASE_SERVICE_ACCOUNT, APNS_KEY, APNS_KEY_ID, APPLE_TEAM_ID (see _shared/push.ts)
//
// Request body (JSON), with a signed-in session:
//   { messageId }  → { sent }  how many phones were notified
// A message is announced once, only by its sender and only right after it
// was sent.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { preview, pushConfigured, sendPush } from '../_shared/push.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const messageId = Number(body.messageId);
  if (!Number.isSafeInteger(messageId) || messageId <= 0) return json({ error: 'bad_request' }, 400);
  if (!pushConfigured.android && !pushConfigured.ios) return json({ sent: 0 });

  try {
    const { data: message, error } = await admin.from('trainer_messages').update({ pushed_at: new Date().toISOString() })
      .eq('id', messageId).eq('sender_id', user.id).is('pushed_at', null)
      .gt('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
      .select('link_id, body').maybeSingle();
    if (error) throw error;
    if (!message) return json({ sent: 0 });

    const { data: link } = await admin.from('trainer_clients').select('client_id, trainer_user_id, trainer_id, client_name')
      .eq('id', message.link_id).maybeSingle();
    if (!link?.trainer_user_id) return json({ sent: 0 });
    const fromClient = link.client_id === user.id;
    const to = fromClient ? link.trainer_user_id : link.client_id;

    let name = fromClient ? link.client_name : '';
    if (!fromClient && link.trainer_id) {
      const { data: trainer } = await admin.from('trainer_applications').select('name').eq('id', link.trainer_id).maybeSingle();
      name = trainer?.name ?? '';
    }
    if (!name) {
      const { data: profile } = await admin.from('community_profiles').select('name').eq('id', user.id).maybeSingle();
      name = profile?.name || 'Fitness Life';
    }

    const { data: tokens } = await admin.from('push_tokens').select('token, platform').eq('user_id', to).limit(20);
    const push = { title: name, body: preview(message.body), link: `/entrenadores/chat/${message.link_id}`, thread: String(message.link_id) };
    const results = await Promise.all((tokens ?? []).map(async t => ({ token: t.token, result: await sendPush(t.platform, t.token, push) })));
    const gone = results.filter(r => r.result === 'gone').map(r => r.token);
    if (gone.length) await admin.from('push_tokens').delete().in('token', gone);
    return json({ sent: results.filter(r => r.result === 'sent').length });
  } catch (e) {
    console.error(e);
    return json({ error: 'failed' }, 500);
  }
});
