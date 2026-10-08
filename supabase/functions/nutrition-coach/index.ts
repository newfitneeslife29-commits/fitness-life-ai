// AI nutrition coach: the only place that holds the Anthropic API key.
//
// Deploy:  supabase functions deploy nutrition-coach
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_SECRET_KEY=...
//          optional: FREE_MONTHLY_LIMIT=5 PREMIUM_MONTHLY_LIMIT=100 REVENUECAT_ENTITLEMENT=premium
// Auth:    turn on anonymous sign-ins (Authentication → Sign In / Providers).
//          The app signs in anonymously; the same id is the RevenueCat app user id,
//          so the subscription (App Store, Google Play or web) is checked here.
//
// Request body (JSON), every answer carries `usage: { used, limit, premium }`:
//   { action: 'status' }                                            → { usage }
//   { action: 'chat', lang, context, messages: [{ role, text }] }  → { text, usage }
//   { action: 'estimate', lang, text }                              → { name, items, note, usage }
// Errors: 401 no session · 402 free uses spent (offer Premium) · 429 Premium limit
//         · 422 declined · 400 bad input · 502/503 model errors.
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { chatSystem, contextNote, ESTIMATE_SCHEMA, estimateSystem, type CoachContext, type Lang, type Macros } from './prompt.ts';
import { hasEntitlement } from './subscription.ts';

const MODEL = 'claude-opus-5-5';
// AI is what costs money, so it is what Premium (4.99/month) pays for.
const FREE_MONTHLY_LIMIT = Number(Deno.env.get('FREE_MONTHLY_LIMIT') ?? 5);
const PREMIUM_MONTHLY_LIMIT = Number(Deno.env.get('PREMIUM_MONTHLY_LIMIT') ?? 100);
const REVENUECAT_SECRET_KEY = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const ENTITLEMENT = Deno.env.get('REVENUECAT_ENTITLEMENT') ?? 'premium';
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// If a safety classifier declines a request, the API re-runs it on the
// fallback model Anthropic recommends for that case instead of refusing.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- Input validation ----------

const num = (v: unknown, max = 100_000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), max) : 0;
};
const macros = (v: unknown): Macros => {
  const m = (v ?? {}) as Record<string, unknown>;
  return { kcal: num(m.kcal), protein: num(m.protein), carbs: num(m.carbs), fat: num(m.fat) };
};
const langOf = (v: unknown): Lang => (v === 'en' || v === 'pt' ? v : 'es');

const contextOf = (v: unknown): CoachContext => {
  const c = (v ?? {}) as Record<string, unknown>;
  const goal = c.goal === 'fuerza' || c.goal === 'salud' ? c.goal : 'musculo';
  const weight = Number(c.weightKg);
  return {
    goal,
    weightKg: Number.isFinite(weight) && weight >= 20 && weight <= 400 ? Math.round(weight * 10) / 10 : null,
    targets: c.targets ? macros(c.targets) : null,
    today: macros(c.today),
    trainedToday: c.trainedToday === true,
  };
};

// The conversation must start with the user and end with a new question.
const messagesOf = (v: unknown): Anthropic.Beta.BetaMessageParam[] => {
  if (!Array.isArray(v)) throw new HttpError(400, 'messages must be an array');
  const list = v
    .slice(-MAX_MESSAGES)
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .map(m => ({ role: m.role as 'user' | 'assistant', content: String(m.text).slice(0, MAX_CHARS) }));
  while (list.length && list[0].role !== 'user') list.shift();
  if (!list.length || list[list.length - 1].role !== 'user') throw new HttpError(400, 'the last message must be from the user');
  return list;
};

// ---------- Claude calls ----------

const textOf = (res: Anthropic.Beta.BetaMessage) => {
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'declined');
  return res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
};

async function chat(lang: Lang, context: CoachContext, messages: Anthropic.Beta.BetaMessageParam[]) {
  const res = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    // Quick, conversational answers: low effort keeps the chat snappy.
    output_config: { effort: 'low' },
    system: [
      { type: 'text', text: chatSystem(lang) },
      { type: 'text', text: contextNote(context) },
    ],
    messages,
  });
  const text = textOf(res);
  if (!text) throw new HttpError(502, 'empty answer');
  return { text };
}

async function estimate(lang: Lang, description: string) {
  const res = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESTIMATE_SCHEMA } },
    system: estimateSystem(lang),
    messages: [{ role: 'user', content: description }],
  });
  if (res.stop_reason === 'max_tokens') throw new HttpError(502, 'truncated');
  const raw = JSON.parse(textOf(res)) as { name?: unknown; items?: unknown[]; note?: unknown };
  return {
    name: String(raw.name ?? '').slice(0, 80),
    note: String(raw.note ?? '').slice(0, 300),
    items: (raw.items ?? []).slice(0, 30).map(i => {
      const item = i as Record<string, unknown>;
      return { name: String(item.name ?? '').slice(0, 80), grams: num(item.grams, 5000), ...macros(item) };
    }),
  };
}

// ---------- Subscription and quota ----------

// RevenueCat knows every store the user may have paid in. If it can't be
// reached, the user gets the free allowance rather than an error.
async function isPremium(userId: string) {
  if (!REVENUECAT_SECRET_KEY) return false;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
    return hasEntitlement(await res.json(), ENTITLEMENT);
  } catch (error) {
    console.error('nutrition-coach: subscription check failed', error);
    return false;
  }
}

interface Usage {
  used: number;
  limit: number;
  premium: boolean;
}

async function usageOf(userId: string): Promise<Usage> {
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [premium, { count, error }] = await Promise.all([
    isPremium(userId),
    admin
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .like('action', 'nutrition_%')
      .gte('created_at', since.toISOString()),
  ]);
  if (error) throw error;
  return { used: count ?? 0, limit: premium ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT, premium };
}

const checkQuota = (usage: Usage) => {
  if (usage.used < usage.limit) return;
  throw usage.premium ? new HttpError(429, 'monthly limit reached') : new HttpError(402, 'free uses spent');
};

// ---------- Handler ----------

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let usage: Usage | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const lang = langOf(body.lang);
    usage = await usageOf(user.id);
    if (body.action === 'status') return json({ usage });

    let result: object;
    if (body.action === 'chat') {
      const messages = messagesOf(body.messages);
      checkQuota(usage);
      result = await chat(lang, contextOf(body.context), messages);
    } else if (body.action === 'estimate') {
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : '';
      if (text.length < 3) throw new HttpError(400, 'describe the meal');
      checkQuota(usage);
      result = await estimate(lang, text);
    } else {
      throw new HttpError(400, 'unknown action');
    }
    await admin.from('ai_usage').insert({ user_id: user.id, action: `nutrition_${body.action}` });
    return json({ ...result, usage: { ...usage, used: usage.used + 1 } });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, usage }, error.status);
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
      console.error('nutrition-coach: model unavailable', error);
      return json({ error: 'busy' }, 503);
    }
    console.error('nutrition-coach error', error);
    return json({ error: 'failed' }, 500);
  }
});
