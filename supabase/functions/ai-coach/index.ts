// AI coach proxy: the only place that holds the Gemini key.
//
// Deploy:  supabase functions deploy ai-coach
// Secrets: supabase secrets set GEMINI_API_KEY=... [GEMINI_MODEL=...]
//
// Request body (JSON):
//   { action: 'chat',  message: string, history?: {role, parts}[] }
//   { action: 'image', base64: string, prompt: string, mimeType?: string }
//   { action: 'video', base64: string, prompt: string, mimeType?: string }
// Response: { text: string } with the model output (JSON text for chat/image).
import { createClient } from 'npm:@supabase/supabase-js@2.91.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { SYSTEM_INSTRUCTION } from './prompt.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3-pro-preview';

// Usage limits (see "Monetización" in the product doc).
const FREE_MESSAGES_PER_MONTH = 5;
const PREMIUM_MESSAGES_PER_DAY = 100;

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
type Content = { role: 'user' | 'model'; parts: Part[] };

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function callGemini(contents: Content[], systemText: string, jsonOutput: boolean) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: jsonOutput ? { responseMimeType: 'application/json' } : undefined,
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
}

// Remaining quota for this user, or a message explaining why they are out.
async function checkQuota(userId: string, isPremium: boolean): Promise<string | null> {
  const now = new Date();
  const since = isPremium
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count, error } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since.toISOString());
  if (error) throw error;
  if (isPremium && (count ?? 0) >= PREMIUM_MESSAGES_PER_DAY) {
    return 'Has alcanzado el límite diario del coach IA. Vuelve mañana.';
  }
  if (!isPremium && (count ?? 0) >= FREE_MESSAGES_PER_MONTH) {
    return `El plan gratuito incluye ${FREE_MESSAGES_PER_MONTH} consultas al mes. Hazte Premium para usar el coach sin límite.`;
  }
  return null;
}

// Short summary of the user's profile and recent training, so answers are
// grounded in what they actually did.
async function userContext(userId: string) {
  const [{ data: profile }, { data: sessions }] = await Promise.all([
    admin.from('profiles').select('goal, experience, weight, weight_unit, days_per_week, equipment').eq('id', userId).maybeSingle(),
    admin
      .from('workout_sessions')
      .select('started_at, routine_name, total_volume_kg')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(5),
  ]);
  const lines = [];
  if (profile) lines.push(`User profile: ${JSON.stringify(profile)}`);
  if (sessions?.length) {
    lines.push('Last sessions:');
    for (const s of sessions) {
      lines.push(`- ${s.started_at.slice(0, 10)} ${s.routine_name ?? 'Workout'}: ${Math.round(s.total_volume_kg ?? 0)} kg volume`);
    }
  }
  return lines.length ? `\n\nCONTEXT ABOUT THIS USER:\n${lines.join('\n')}` : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await req.json();
    const { data: profile } = await admin.from('profiles').select('is_premium').eq('id', user.id).maybeSingle();
    const limitMessage = await checkQuota(user.id, profile?.is_premium === true);
    if (limitMessage) {
      return json({ text: JSON.stringify({ type: 'chat', summary: limitMessage }), limited: true }, 429);
    }

    let text: string;
    if (body.action === 'chat') {
      const history: Content[] = Array.isArray(body.history) ? body.history : [];
      const contents = [...history, { role: 'user' as const, parts: [{ text: String(body.message ?? '') }] }];
      text = await callGemini(contents, SYSTEM_INSTRUCTION + await userContext(user.id), true);
    } else if (body.action === 'image' || body.action === 'video') {
      const isImage = body.action === 'image';
      const contents: Content[] = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: body.mimeType ?? (isImage ? 'image/jpeg' : 'video/mp4'), data: String(body.base64 ?? '') } },
          { text: String(body.prompt ?? '') + (isImage ? ' Output strict JSON.' : '') },
        ],
      }];
      text = await callGemini(contents, SYSTEM_INSTRUCTION, isImage);
    } else {
      return json({ error: 'Unknown action' }, 400);
    }

    await admin.from('ai_usage').insert({ user_id: user.id, action: body.action });
    return json({ text });
  } catch (error) {
    console.error('ai-coach error', error);
    return json({ error: 'AI request failed' }, 500);
  }
});
