// AI nutrition coach: the only place that holds the Anthropic API key.
//
// Deploy:  supabase functions deploy nutrition-coach
// Secrets: supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_SECRET_KEY=...
//          optional: FREE_MONTHLY_LIMIT=0 PREMIUM_MONTHLY_LIMIT=300 REVENUECAT_ENTITLEMENT=premium
//          SMOKE_TEST_TOKEN (set by the deploy workflow, lets its check run as Premium)
// Auth:    turn on anonymous sign-ins (Authentication → Sign In / Providers).
//          The app signs in anonymously; the same id is the RevenueCat app user id,
//          so the subscription (App Store, Google Play or web) is checked here.
//
// Request body (JSON), every answer carries `usage: { used, limit, premium }`:
//   { action: 'status' }                                            → { usage }
//   { action: 'chat', lang, context, messages: [{ role, text }] }  → { text, usage }
//   { action: 'estimate', lang, text }                              → { name, items, note, usage }
//   { action: 'photo', lang, image: base64 JPEG/PNG/WebP, mediaType, text? } → same as estimate
//   { action: 'trainer', lang, context, messages: [{ role, text }] } → { text, usage }  (personal trainer)
//   { action: 'routine', lang, context, text, exercises: [{ id, name, muscle, equipment, timed }] }
//       → { name, note, exercises: [{ exerciseId, sets, repMin, repMax, restSec }], usage }
//   { action: 'mealplan', lang, context, text?, mealsPerDay: 3..6 }
//       → { name, note, days: [{ meals: [{ slot, time, name, foods, kcal, protein, carbs, fat }] }] × 7, usage }
//       (always HTTP 200 once it starts: an error then comes as { error, status } in the body)
// Errors: 401 no session · 402 AI is Premium-only (offer Premium) · 429 Premium limit
//         · 422 declined · 400 bad input · 502/503 model errors.
import Anthropic from 'npm:@anthropic-ai/sdk@0.132.1';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  chatSystem, contextNote, ESTIMATE_SCHEMA, estimateSystem, MEAL_DAY_SCHEMA, MEAL_OUTLINE_SCHEMA, mealDaySystem, mealOutlineSystem, photoSystem, routineSchema, routineSystem,
  trainerNote, trainerSystem, type CoachContext, type Lang, type Macros, type TrainerContext,
} from './prompt.ts';
import { cleanMealPlan } from './mealplan.ts';
import { hasEntitlement } from './subscription.ts';

// Fast, low-cost model: a Premium user's whole month costs cents, so the
// subscription (4.99/month or 39.99/year) stays profitable.
const MODEL = 'claude-haiku-5-5';
// AI is what costs money, so it is only for Premium. The ceiling is a fair-use
// limit against abuse; normal use stays far below it.
const FREE_MONTHLY_LIMIT = Number(Deno.env.get('FREE_MONTHLY_LIMIT') ?? 0);
const PREMIUM_MONTHLY_LIMIT = Number(Deno.env.get('PREMIUM_MONTHLY_LIMIT') ?? 300);
const REVENUECAT_SECRET_KEY = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const ENTITLEMENT = Deno.env.get('REVENUECAT_ENTITLEMENT') ?? 'premium';
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;
// Random per deploy; only the deploy workflow knows it.
const SMOKE_TEST_TOKEN = Deno.env.get('SMOKE_TEST_TOKEN') ?? '';

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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
  const goal = c.goal === 'fuerza' || c.goal === 'salud' || c.goal === 'grasa' ? c.goal : 'musculo';
  // A number inside [min, max], rounded to one decimal, or null.
  const within = (x: unknown, min: number, max: number) => {
    const n = Number(x);
    return x !== null && x !== undefined && x !== '' && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
  };
  return {
    goal,
    weightKg: within(c.weightKg, 20, 400),
    targets: c.targets ? macros(c.targets) : null,
    today: macros(c.today),
    trainedToday: c.trainedToday === true,
    sex: c.sex === 'hombre' || c.sex === 'mujer' ? c.sex : null,
    age: within(c.age, 13, 110),
    heightCm: within(c.heightCm, 100, 250),
    activity: c.activity === 'sedentario' || c.activity === 'ligero' || c.activity === 'moderado' || c.activity === 'alto' ? c.activity : null,
    targetWeightKg: within(c.targetWeightKg, 20, 400),
  };
};

const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? v as T : fallback);
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

const trainerContextOf = (v: unknown): TrainerContext => {
  const c = (v ?? {}) as Record<string, unknown>;
  const base = contextOf(c);
  const days = Number(c.daysPerWeek);
  return {
    goal: base.goal,
    level: oneOf(c.level, ['principiante', 'intermedio', 'avanzado'] as const, 'principiante'),
    daysPerWeek: Number.isFinite(days) ? Math.min(7, Math.max(1, Math.round(days))) : 3,
    setup: oneOf(c.setup, ['gimnasio', 'mancuernas', 'casa'] as const, 'gimnasio'),
    limitations: Array.isArray(c.limitations)
      ? c.limitations.filter((l): l is string => ['rodillas', 'espalda', 'hombros', 'munecas'].includes(l as string))
        .map(l => ({ rodillas: 'knees', espalda: 'lower back', hombros: 'shoulders', munecas: 'wrists' })[l as 'rodillas'])
      : [],
    sex: base.sex,
    age: base.age,
    heightCm: base.heightCm,
    weightKg: base.weightKg,
    targetWeightKg: base.targetWeightKg,
    plan: clip(c.plan, 2500),
    history: clip(c.history, 3500),
  };
};

interface CatalogEntry { id: string; name: string; muscle: string; equipment: string; timed: boolean }

// The exercises the routine may use: the app's catalog, filtered to the user's equipment.
const catalogOf = (v: unknown): CatalogEntry[] => {
  if (!Array.isArray(v)) throw new HttpError(400, 'exercises must be an array');
  const list = v.slice(0, 150).flatMap(e => {
    const x = (e ?? {}) as Record<string, unknown>;
    const id = typeof x.id === 'string' && /^[a-z0-9-]{2,40}$/.test(x.id) ? x.id : null;
    return id ? [{ id, name: clip(x.name, 60), muscle: clip(x.muscle, 30), equipment: clip(x.equipment, 30), timed: x.timed === true }] : [];
  });
  if (list.length < 4) throw new HttpError(400, 'not enough exercises');
  return list;
};

// The conversation must start with the user and end with a new question.
const messagesOf = (v: unknown): Anthropic.MessageParam[] => {
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

const textOf = (res: Anthropic.Message) => {
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'declined');
  return res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
};

async function chat(lang: Lang, context: CoachContext, messages: Anthropic.MessageParam[]) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
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

async function trainer(lang: Lang, context: TrainerContext, messages: Anthropic.MessageParam[]) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Training advice needs a bit more thought than small talk.
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: trainerSystem(lang) },
      { type: 'text', text: trainerNote(context) },
    ],
    messages,
  });
  const answer = textOf(res);
  if (!answer) throw new HttpError(502, 'empty answer');
  return { text: answer };
}

const clamp = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, num(v, max)));

async function routine(lang: Lang, context: TrainerContext, request: string, catalog: CatalogEntry[]) {
  const listing = catalog.map(e => `- ${e.id}: ${e.name} (${e.muscle}, ${e.equipment}${e.timed ? ', timed in seconds' : ''})`).join('\n');
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: routineSchema(catalog.map(e => e.id)) } },
    system: [
      { type: 'text', text: routineSystem(lang) },
      { type: 'text', text: `${trainerNote(context)}\n\nExercise catalog (id: name):\n${listing}` },
    ],
    messages: [{ role: 'user', content: request }],
  });
  if (res.stop_reason === 'max_tokens') throw new HttpError(502, 'truncated');
  const raw = JSON.parse(textOf(res)) as { name?: unknown; note?: unknown; exercises?: unknown[] };
  const ids = new Set(catalog.map(e => e.id));
  const exercises = (raw.exercises ?? []).slice(0, 10).flatMap(e => {
    const x = e as Record<string, unknown>;
    if (typeof x.exerciseId !== 'string' || !ids.has(x.exerciseId)) return [];
    const repMin = clamp(x.repMin, 1, 120);
    return [{ exerciseId: x.exerciseId, sets: clamp(x.sets, 1, 6), repMin, repMax: Math.max(repMin, clamp(x.repMax, 1, 180)), restSec: clamp(x.restSec, 15, 300) }];
  });
  return { name: String(raw.name ?? '').slice(0, 60), note: String(raw.note ?? '').slice(0, 300), exercises };
}

// Two short steps instead of one long answer (which ran out of room and
// took over a minute): the outline of the week, then the 7 days in detail
// at the same time. A day that fails is filled in from the others.
async function structured<T>(system: string, note: string, content: string, schema: Record<string, unknown>): Promise<T> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system: [{ type: 'text', text: system }, { type: 'text', text: note }],
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'max_tokens') throw new HttpError(502, 'truncated');
  return JSON.parse(textOf(res)) as T;
}

type OutlineMeal = { slot: string; time: string; name: string };

async function mealPlan(lang: Lang, context: CoachContext, request: string, mealsPerDay: number) {
  const note = contextNote(context);
  const outline = await structured<{ name?: string; note?: string; days?: { meals?: OutlineMeal[] }[] }>(
    mealOutlineSystem(lang, mealsPerDay), note, request || 'Plan my meals for the week.', MEAL_OUTLINE_SCHEMA,
  );
  const days = (outline.days ?? []).slice(0, 7).filter(d => d.meals?.length);
  if (!days.length) return cleanMealPlan({ name: outline.name, note: outline.note, days: [] });
  const detailed = await Promise.allSettled(days.map((d, i) => structured<{ meals?: unknown[] }>(
    mealDaySystem(lang), note,
    `Day ${i + 1} of the week${request ? ` (the user asked: ${request})` : ''}. Detail these meals:\n${(d.meals ?? []).map(m => `- ${m.time} ${m.slot}: ${m.name}`).join('\n')}`,
    MEAL_DAY_SCHEMA,
  )));
  const ok = detailed.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
  if (!ok.length) throw (detailed[0] as PromiseRejectedResult).reason;
  return cleanMealPlan({
    name: outline.name, note: outline.note,
    days: detailed.map(r => (r.status === 'fulfilled' ? r.value : ok[0])),
  });
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_IMAGE_BASE64 = 2_000_000; // about 1.5 MB; the app sends ~200 KB

async function estimate(lang: Lang, description: string, photo?: { data: string; mediaType: ImageType }) {
  const content: Anthropic.ContentBlockParam[] = photo
    ? [
      { type: 'image', source: { type: 'base64', media_type: photo.mediaType, data: photo.data } },
      { type: 'text', text: description || 'Estimate this meal.' },
    ]
    : [{ type: 'text', text: description }];
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESTIMATE_SCHEMA } },
    system: photo ? photoSystem(lang) : estimateSystem(lang),
    messages: [{ role: 'user', content }],
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

async function usageOf(userId: string, smokeTest: boolean): Promise<Usage> {
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [premium, { count, error }] = await Promise.all([
    smokeTest || isPremium(userId),
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
  throw usage.premium ? new HttpError(429, 'monthly limit reached') : new HttpError(402, 'premium required');
};

// ---------- Handler ----------

// What the app gets for an error: the HTTP status and a short code.
const failure = (error: unknown, usage?: Usage): { status: number; body: Record<string, unknown> } => {
  if (error instanceof HttpError) return { status: error.status, body: { error: error.message, usage } };
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
    console.error('nutrition-coach: model unavailable', error);
    return { status: 503, body: { error: 'busy' } };
  }
  console.error('nutrition-coach error', error);
  return { status: 500, body: { error: 'failed' } };
};

// For answers that take long (the meal plan): the response starts at once and
// sends a space every few seconds until the JSON is ready, so phones don't
// drop a request that stays silent for a minute. Leading spaces are valid
// JSON. An error comes in the body as { error, status }.
const keepAlive = (work: () => Promise<object>, usage: Usage) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => controller.enqueue(encoder.encode(' ')), 5000);
      let out: object;
      try {
        out = await work();
      } catch (error) {
        const { status, body } = failure(error, usage);
        out = { ...body, status };
      }
      clearInterval(ping);
      controller.enqueue(encoder.encode(JSON.stringify(out)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

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
    const smokeTest = SMOKE_TEST_TOKEN.length >= 32 && req.headers.get('x-smoke-test') === SMOKE_TEST_TOKEN;
    usage = await usageOf(user.id, smokeTest);
    if (body.action === 'status') return json({ usage });

    let result: object;
    if (body.action === 'chat') {
      const messages = messagesOf(body.messages);
      checkQuota(usage);
      result = await chat(lang, contextOf(body.context), messages);
    } else if (body.action === 'trainer') {
      const messages = messagesOf(body.messages);
      checkQuota(usage);
      result = await trainer(lang, trainerContextOf(body.context), messages);
    } else if (body.action === 'routine') {
      const request = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';
      if (request.length < 3) throw new HttpError(400, 'describe the routine');
      const catalog = catalogOf(body.exercises);
      checkQuota(usage);
      result = await routine(lang, trainerContextOf(body.context), request, catalog);
    } else if (body.action === 'mealplan') {
      const request = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';
      const perDay = Number(body.mealsPerDay);
      const mealsPerDay = Number.isFinite(perDay) ? Math.min(6, Math.max(3, Math.round(perDay))) : 4;
      checkQuota(usage);
      const known = usage;
      return keepAlive(async () => {
        const plan = await mealPlan(lang, contextOf(body.context), request, mealsPerDay);
        await admin.from('ai_usage').insert({ user_id: user.id, action: 'nutrition_mealplan' });
        return { ...plan, usage: { ...known, used: known.used + 1 } };
      }, known);
    } else if (body.action === 'estimate') {
      const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : '';
      if (text.length < 3) throw new HttpError(400, 'describe the meal');
      checkQuota(usage);
      result = await estimate(lang, text);
    } else if (body.action === 'photo') {
      const data = typeof body.image === 'string' ? body.image : '';
      const mediaType = IMAGE_TYPES.find(t => t === body.mediaType);
      if (!mediaType || data.length < 100 || data.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
        throw new HttpError(400, 'send a JPEG, PNG or WebP photo');
      }
      const note = typeof body.text === 'string' ? body.text.trim().slice(0, 300) : '';
      checkQuota(usage);
      result = await estimate(lang, note, { data, mediaType });
    } else {
      throw new HttpError(400, 'unknown action');
    }
    await admin.from('ai_usage').insert({ user_id: user.id, action: `nutrition_${body.action}` });
    return json({ ...result, usage: { ...usage, used: usage.used + 1 } });
  } catch (error) {
    const { status, body } = failure(error, usage);
    return json(body, status);
  }
});
