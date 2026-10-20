// Stripe for hiring trainers (trainer-pay and stripe-webhook functions).
// Trainers get paid through Stripe Connect Express accounts; each hire is a
// monthly subscription paid to Fitness Life, which sends the trainer their
// share automatically (destination charge) and keeps the commission.
import Stripe from 'npm:stripe@22.6.2';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.3';

const KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
export const stripeConfigured = KEY !== '';
export const stripe = new Stripe(KEY || 'sk_not_configured', { httpClient: Stripe.createFetchHttpClient() });
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Where Stripe sends people back: a page of the web app that returns to the
// phone app (or to the web app's trainers page).
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://newfitneeslife29-commits.github.io/fitness-life-ai/').replace(/\/?$/, '/');
export const returnUrl = (to: 'hired' | 'bought' | 'canceled' | 'connected' | 'refresh', platform: string) =>
  `${SITE_URL}stripe-return.html?to=${to}&app=${platform === 'native' ? 'native' : 'web'}`;

// Paid (or in its last paid month): the client and the trainer can talk.
export const LIVE = ['active', 'trialing', 'past_due'];

// A connected account that can receive its share.
export const accountReady = (a: Stripe.Account) => a.capabilities?.transfers === 'active' && a.payouts_enabled === true;

// Saves the hire from Stripe's subscription. Only subscriptions started by
// the app carry trainer_id/client_id (others, like manual payment links, are
// ignored). Returns the hire's id.
export const saveSubscription = async (admin: SupabaseClient, sub: Stripe.Subscription, clientName = ''): Promise<string | null> => {
  const trainerId = sub.metadata?.trainer_id;
  const clientId = sub.metadata?.client_id;
  if (!trainerId || !clientId) return null;
  const item = sub.items.data[0];
  const { data: trainer } = await admin.from('trainer_applications').select('user_id').eq('id', trainerId).maybeSingle();
  const fields = {
    status: sub.status,
    amount_cents: item?.price?.unit_amount ?? 0,
    currency: item?.price?.currency ?? 'usd',
    fee_percent: Math.round(sub.application_fee_percent ?? 0),
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end || sub.cancel_at != null,
    updated_at: new Date().toISOString(),
  };
  // The client's name as the app sent it at checkout (Stripe's events can
  // come before the checkout is finished).
  if (!clientName) {
    const { data: checkout } = await admin.from('trainer_checkouts').select('client_name')
      .eq('client_id', clientId).eq('trainer_id', trainerId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    clientName = checkout?.client_name ?? '';
  }
  const { data: existing } = await admin.from('trainer_clients').select('id, client_name').eq('stripe_subscription_id', sub.id).maybeSingle();
  if (existing) {
    const { error } = await admin.from('trainer_clients')
      .update(existing.client_name || !clientName ? fields : { ...fields, client_name: clientName.slice(0, 60) }).eq('id', existing.id);
    if (error) throw error;
    return existing.id as string;
  }
  const { data, error } = await admin.from('trainer_clients').insert({
    ...fields,
    stripe_subscription_id: sub.id,
    trainer_id: trainer ? trainerId : null,
    trainer_user_id: trainer?.user_id ?? null,
    client_id: clientId,
    client_name: clientName.slice(0, 60),
  }).select('id').single();
  if (error) {
    // The webhook and the app can save the same hire at once.
    if (error.code === '23505') return saveSubscription(admin, sub, clientName);
    throw error;
  }
  return data.id as string;
};

// A paid program: the buyer gets its routines (program_content).
export const savePurchase = async (admin: SupabaseClient, session: Stripe.Checkout.Session) => {
  const programId = session.metadata?.program_id;
  const buyerId = session.metadata?.buyer_id;
  if (!programId || !buyerId || session.payment_status !== 'paid') return null;
  const { error } = await admin.from('program_purchases').upsert({
    program_id: programId, buyer_id: buyerId, stripe_session_id: session.id,
    amount_cents: session.amount_total ?? 0, currency: session.currency ?? 'usd',
  }, { onConflict: 'program_id,buyer_id', ignoreDuplicates: true });
  if (error) throw error;
  return programId;
};

// Finishes a checkout started from the app (complete → hire or program saved).
export const finishCheckout = async (admin: SupabaseClient, session: Stripe.Checkout.Session) => {
  const { data: row } = await admin.from('trainer_checkouts').select('client_name, done').eq('session_id', session.id).maybeSingle();
  let linkId: string | null = null;
  if (session.status === 'complete' && session.mode === 'payment') {
    await savePurchase(admin, session);
  } else if (session.status === 'complete' && session.subscription) {
    const sub = typeof session.subscription === 'string' ? await stripe.subscriptions.retrieve(session.subscription) : session.subscription;
    linkId = await saveSubscription(admin, sub, row?.client_name ?? '');
  }
  if (row && !row.done && session.status !== 'open') {
    await admin.from('trainer_checkouts').update({ done: true }).eq('session_id', session.id);
  }
  return linkId;
};
