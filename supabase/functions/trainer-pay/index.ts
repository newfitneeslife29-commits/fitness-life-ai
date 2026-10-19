// Hiring trainers in the app, with Stripe: the only place (with
// stripe-webhook) that holds the Stripe secret key.
//
// Deploy:  supabase functions deploy trainer-pay
// Secrets: STRIPE_SECRET_KEY, SITE_URL (set by the deploy workflow)
//
// Request body (JSON), with a signed-in (not anonymous) session:
//   Trainers
//   { action: 'connect', country, platform }  → { url }  Stripe page to set up payouts
//   { action: 'status' }                      → { connected, ready, detailsSubmitted }
//   { action: 'dashboard' }                   → { url }  the trainer's Stripe Express dashboard
//   Clients
//   { action: 'checkout', trainerId, name, lang, platform } → { url }  Stripe Checkout
//   Both
//   { action: 'sync' }            → { hired: linkId | null }  saves finished checkouts, refreshes hires
//   { action: 'cancel', linkId }  → { ok }  cancels at the end of the paid month
// Errors: { error: code } with 400/401/403/404/409/503; codes the app explains:
//   stripe_not_configured · connect_disabled · country_unsupported · not_trainer
//   · trainer_unavailable · already_hired · own_trainer
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { accountReady, finishCheckout, LIVE, returnUrl, saveSubscription, stripe, stripeConfigured } from '../_shared/stripe.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Languages Stripe Checkout speaks (others: the browser's language).
const CHECKOUT_LOCALES = ['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'ja', 'ko', 'zh', 'id'];

const myApplication = async (userId: string) => {
  const { data } = await admin.from('trainer_applications')
    .select('id, name, status, stripe_account_id, payouts_ready').eq('user_id', userId).maybeSingle();
  if (!data) throw new HttpError(403, 'not_trainer');
  return data;
};

const stripeCode = (e: unknown) => {
  const message = String((e as { message?: string })?.message ?? '');
  if (/signed up for Connect|connect.*(not enabled|platform profile)|review the responsibilities/i.test(message)) return 'connect_disabled';
  if (/country/i.test(message)) return 'country_unsupported';
  return null;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!stripeConfigured) return json({ error: 'stripe_not_configured' }, 503);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user || user.is_anonymous) return json({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const platform = body.platform === 'native' ? 'native' : 'web';

  try {
    switch (body.action) {
      case 'connect': {
        const app = await myApplication(user.id);
        let account = app.stripe_account_id;
        if (!account) {
          const country = String(body.country ?? '').toUpperCase();
          if (!/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'country_unsupported');
          const platformAccount = await stripe.accounts.retrieve(null);
          // Same country as Fitness Life: a full account. Elsewhere: a
          // "recipient" account that only receives its share (cross-border payouts).
          const same = country === platformAccount.country;
          const created = await stripe.accounts.create({
            type: 'express',
            country,
            email: user.email,
            business_type: 'individual',
            capabilities: same ? { card_payments: { requested: true }, transfers: { requested: true } } : { transfers: { requested: true } },
            ...(same ? {} : { tos_acceptance: { service_agreement: 'recipient' } }),
            business_profile: { product_description: 'Online personal training sold through the Fitness Life app' },
            metadata: { user_id: user.id, trainer_id: app.id },
          });
          account = created.id;
          const { error } = await admin.from('trainer_applications').update({ stripe_account_id: account, payouts_ready: false }).eq('id', app.id);
          if (error) throw error;
        }
        const link = await stripe.accountLinks.create({
          account,
          type: 'account_onboarding',
          refresh_url: returnUrl('refresh', platform),
          return_url: returnUrl('connected', platform),
        });
        return json({ url: link.url });
      }

      case 'status': {
        const app = await myApplication(user.id);
        if (!app.stripe_account_id) return json({ connected: false, ready: false, detailsSubmitted: false });
        const account = await stripe.accounts.retrieve(app.stripe_account_id);
        const ready = accountReady(account);
        if (ready !== app.payouts_ready) {
          await admin.from('trainer_applications').update({ payouts_ready: ready }).eq('id', app.id);
        }
        return json({ connected: true, ready, detailsSubmitted: account.details_submitted === true });
      }

      case 'dashboard': {
        const app = await myApplication(user.id);
        if (!app.stripe_account_id) throw new HttpError(409, 'not_connected');
        const link = await stripe.accounts.createLoginLink(app.stripe_account_id);
        return json({ url: link.url });
      }

      case 'checkout': {
        const trainerId = String(body.trainerId ?? '');
        if (!/^[0-9a-f-]{36}$/i.test(trainerId)) throw new HttpError(400, 'bad trainer');
        const { data: trainer } = await admin.from('trainer_applications')
          .select('id, user_id, name, status, price_cents, currency, fee_percent, stripe_account_id').eq('id', trainerId).maybeSingle();
        if (!trainer || trainer.status !== 'approved' || trainer.price_cents <= 0 || !trainer.stripe_account_id) {
          throw new HttpError(404, 'trainer_unavailable');
        }
        if (trainer.user_id === user.id) throw new HttpError(409, 'own_trainer');
        const { data: hired } = await admin.from('trainer_clients').select('id')
          .eq('trainer_id', trainer.id).eq('client_id', user.id).in('status', LIVE).limit(1);
        if (hired?.length) throw new HttpError(409, 'already_hired');
        // Checked live: the trainer must still be able to receive the money.
        const account = await stripe.accounts.retrieve(trainer.stripe_account_id);
        if (!accountReady(account)) {
          await admin.from('trainer_applications').update({ payouts_ready: false }).eq('id', trainer.id);
          throw new HttpError(404, 'trainer_unavailable');
        }
        const lang = String(body.lang ?? '');
        const metadata = { trainer_id: trainer.id, client_id: user.id };
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [{
            quantity: 1,
            price_data: {
              currency: trainer.currency,
              unit_amount: trainer.price_cents,
              recurring: { interval: 'month' },
              product_data: { name: `Fitness Life · ${trainer.name}` },
            },
          }],
          subscription_data: {
            application_fee_percent: trainer.fee_percent,
            transfer_data: { destination: trainer.stripe_account_id },
            metadata,
          },
          metadata,
          client_reference_id: user.id,
          ...(user.email ? { customer_email: user.email } : {}),
          locale: (CHECKOUT_LOCALES.includes(lang) ? lang : 'auto') as 'auto',
          success_url: returnUrl('hired', platform),
          cancel_url: returnUrl('canceled', platform),
        });
        const { error } = await admin.from('trainer_checkouts').insert({
          session_id: session.id, client_id: user.id, trainer_id: trainer.id,
          client_name: String(body.name ?? '').trim().slice(0, 60),
        });
        if (error) throw error;
        return json({ url: session.url });
      }

      case 'sync': {
        // Checkouts from the last two days that the webhook hasn't finished.
        const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
        const { data: pending } = await admin.from('trainer_checkouts').select('session_id')
          .eq('client_id', user.id).eq('done', false).gte('created_at', since).order('created_at', { ascending: false }).limit(5);
        let hired: string | null = null;
        for (const row of pending ?? []) {
          const session = await stripe.checkout.sessions.retrieve(row.session_id);
          hired = (await finishCheckout(admin, session)) ?? hired;
        }
        // Hires not updated in the last hour (renewals, cancellations).
        const stale = new Date(Date.now() - 3_600_000).toISOString();
        const { data: links } = await admin.from('trainer_clients').select('stripe_subscription_id')
          .or(`client_id.eq.${user.id},trainer_user_id.eq.${user.id}`).neq('status', 'canceled').lt('updated_at', stale).limit(20);
        for (const link of links ?? []) {
          await saveSubscription(admin, await stripe.subscriptions.retrieve(link.stripe_subscription_id));
        }
        return json({ hired });
      }

      case 'cancel': {
        const linkId = String(body.linkId ?? '');
        const { data: link } = await admin.from('trainer_clients').select('id, client_id, trainer_user_id, stripe_subscription_id').eq('id', linkId).maybeSingle();
        if (!link) throw new HttpError(404, 'not found');
        const { data: isAdmin } = await admin.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle();
        if (link.client_id !== user.id && link.trainer_user_id !== user.id && !isAdmin) throw new HttpError(403, 'forbidden');
        const sub = await stripe.subscriptions.update(link.stripe_subscription_id, { cancel_at_period_end: true });
        await saveSubscription(admin, sub);
        return json({ ok: true });
      }

      default:
        throw new HttpError(400, 'unknown action');
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    const code = body.action === 'connect' ? stripeCode(e) : null;
    if (code) return json({ error: code }, 409);
    console.error('trainer-pay:', body.action, e);
    return json({ error: 'failed' }, 500);
  }
});
