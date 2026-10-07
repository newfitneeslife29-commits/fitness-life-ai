// Stripe webhook: the ONLY place that can turn Premium on or off.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
// Stripe dashboard → Webhooks → endpoint
//   https://<project>.supabase.co/functions/v1/stripe-webhook
//   events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted
//
// The Payment Link is opened with ?client_reference_id=<supabase user id>
// (see components/PremiumModal.tsx), which is how a payment maps to a user.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.91.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

async function syncSubscription(sub: Stripe.Subscription, userId?: string | null) {
  // Later events only carry the subscription; find its user from the first one.
  if (!userId) {
    const { data } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) {
    console.warn('No user for subscription', sub.id);
    return;
  }

  const item = sub.items.data[0];
  // Newer Stripe API versions moved current_period_end from the subscription to its items.
  type WithPeriodEnd = { current_period_end?: number };
  const periodEnd = (item as unknown as WithPeriodEnd)?.current_period_end
    ?? (sub as unknown as WithPeriodEnd).current_period_end;
  const { error: subError } = await admin.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    created: new Date(sub.created * 1000).toISOString(),
    price_id: item?.price.id ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
  if (subError) throw subError;

  const { error: profileError } = await admin
    .from('profiles')
    .update({ is_premium: ACTIVE_STATUSES.has(sub.status) })
    .eq('id', userId);
  if (profileError) throw profileError;
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch (err) {
    console.error('Invalid Stripe signature', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(subId), session.client_reference_id);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
    }
  } catch (err) {
    console.error('Webhook handling failed', err);
    // 500 makes Stripe retry later.
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
