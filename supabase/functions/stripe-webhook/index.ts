// Stripe tells the app about hires: a finished checkout, a renewal, a
// failed payment or a cancellation. Registered in Stripe by the deploy
// workflow, which also stores its signing secret.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Events:  checkout.session.completed, customer.subscription.created,
//          customer.subscription.updated, customer.subscription.deleted
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { cryptoProvider, finishCheckout, saveSubscription, stripe, stripeConfigured } from '../_shared/stripe.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!stripeConfigured || !SECRET) return new Response('Not configured', { status: 503 });

  const signature = req.headers.get('Stripe-Signature') ?? '';
  const payload = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, SECRET, undefined, cryptoProvider);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      // A delayed payment (bank transfer, voucher) that went through or failed.
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed':
        // A hire (subscription) or a program (one payment).
        await finishCheckout(admin, event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Fetched again: events can arrive out of order.
        await saveSubscription(admin, await stripe.subscriptions.retrieve(event.data.object.id));
        break;
    }
  } catch (e) {
    console.error('stripe-webhook:', event.type, e);
    return new Response('Failed', { status: 500 }); // Stripe retries
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
