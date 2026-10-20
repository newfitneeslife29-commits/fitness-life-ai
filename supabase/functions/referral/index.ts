// Invite a friend: a new account enters a friend's code and both get a week
// of Premium (RevenueCat promotional entitlement). The friend gets it for up
// to 10 invites; each account can enter a code once, in its first 30 days.
//
// Deploy:  supabase functions deploy referral
// Secrets: REVENUECAT_SECRET_KEY (optional REVENUECAT_ENTITLEMENT, default "premium")
//
// Request body (JSON), with a signed-in (not anonymous) session:
//   { action: 'redeem', code }  → { ok: true, days: 7 }
// Errors: { error } with 400/403/409/503: invalid_code · own_code · already_redeemed
//   · too_late · needs_account · not_configured · failed
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { pushToUser } from '../_shared/push.ts';
import { communityText } from '../_shared/push_texts.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const REVENUECAT_SECRET_KEY = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const ENTITLEMENT = Deno.env.get('REVENUECAT_ENTITLEMENT') ?? 'premium';
const MAX_REWARDS = 10;
const NEW_ACCOUNT_DAYS = 30;

// A week of Premium for a person (their RevenueCat id is their account id).
const grantWeek = async (userId: string) => {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent(ENTITLEMENT)}/promotional`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 'weekly' }),
    },
  );
  if (!res.ok) throw new Error(`RevenueCat ${res.status}: ${(await res.text()).slice(0, 200)}`);
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.is_anonymous) return json({ error: 'needs_account' }, 403);
  if (!REVENUECAT_SECRET_KEY) return json({ error: 'not_configured' }, 503);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (body.action !== 'redeem') return json({ error: 'bad_request' }, 400);

  const code = String(body.code ?? '').trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return json({ error: 'invalid_code' }, 400);

  try {
    const { data: owner } = await admin.from('referral_codes').select('user_id').eq('code', code).maybeSingle();
    if (!owner) return json({ error: 'invalid_code' }, 400);
    if (owner.user_id === user.id) return json({ error: 'own_code' }, 400);
    if (Date.now() - new Date(user.created_at).getTime() > NEW_ACCOUNT_DAYS * 86_400_000) return json({ error: 'too_late' }, 403);

    const { error: taken } = await admin.from('referral_redemptions').insert({ redeemer: user.id, referrer: owner.user_id });
    if (taken) {
      if (taken.code === '23505') return json({ error: 'already_redeemed' }, 409);
      throw taken;
    }
    try {
      await grantWeek(user.id);
    } catch (e) {
      // Nothing was given: the code can be entered again.
      await admin.from('referral_redemptions').delete().eq('redeemer', user.id);
      throw e;
    }

    const { count } = await admin.from('referral_redemptions').select('redeemer', { count: 'exact', head: true }).eq('referrer', owner.user_id);
    if ((count ?? 0) <= MAX_REWARDS) {
      try {
        await grantWeek(owner.user_id);
        const { data: profile } = await admin.from('community_profiles').select('name').eq('id', user.id).maybeSingle();
        const name = profile?.name || (user.email ?? '').split('@')[0] || 'Fitness Life';
        await pushToUser(admin, owner.user_id, lang => ({ body: communityText(lang, 'referral', { name }), link: '/invitar', thread: 'referral' }));
      } catch (e) {
        console.error('referral: reward for the friend failed', e);
      }
    }
    return json({ ok: true, days: 7 });
  } catch (e) {
    console.error(e);
    return json({ error: 'failed' }, 503);
  }
});
