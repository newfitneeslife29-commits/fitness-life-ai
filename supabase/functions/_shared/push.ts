// Phone notifications: Android through Firebase Cloud Messaging (HTTP v1),
// iPhone straight through Apple's push service (APNs).
//
// Secrets (set by the deploy workflow, each optional):
//   FIREBASE_SERVICE_ACCOUNT  the whole JSON of a Firebase service account key
//   APNS_KEY, APNS_KEY_ID     the .p8 key for Apple Push Notifications and its Key ID
//   APPLE_TEAM_ID             the 10-character Team ID
const FIREBASE = (() => {
  try {
    const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '');
    return sa?.client_email && sa?.private_key && sa?.project_id
      ? { email: String(sa.client_email), key: String(sa.private_key), project: String(sa.project_id) }
      : null;
  } catch {
    return null;
  }
})();
const APNS_KEY = Deno.env.get('APNS_KEY') ?? '';
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID') ?? '';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '';
const BUNDLE_ID = 'com.fitnesslife.app';

export const pushConfigured = { android: FIREBASE !== null, ios: APNS_KEY !== '' && APNS_KEY_ID !== '' && TEAM_ID !== '' };

export interface Push {
  title?: string; // without one, the phone shows the app's name
  body: string;
  // The app screen the notification opens (#/...), and the conversation it
  // belongs to (notifications of one chat, or of the community, are grouped).
  link: string;
  thread: string;
  // How long the notification is worth delivering: a phone that was off or
  // offline longer doesn't get it days later.
  ttlSeconds?: number;
}

const DEFAULT_TTL = 24 * 3600;

// 'gone': the token no longer exists (app removed, notifications reset).
export type PushResult = 'sent' | 'gone' | 'failed';

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemBytes = (pem: string) => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\\n|\s/g, '')), c => c.charCodeAt(0));

const signJwt = async (header: object, claims: object, key: CryptoKey, algorithm: AlgorithmIdentifier | EcdsaParams) => {
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  // ECDSA signatures from WebCrypto are already r‖s, as JWTs need.
  const signature = await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(input));
  return `${input}.${b64url(signature)}`;
};

// ---------- Android (Firebase) ----------

let googleToken: { value: string; expires: number } | null = null;

const firebaseAccessToken = async () => {
  if (googleToken && googleToken.expires > Date.now() + 60_000) return googleToken.value;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(FIREBASE!.key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({ alg: 'RS256', typ: 'JWT' }, {
    iss: FIREBASE!.email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }, key, 'RSASSA-PKCS1-v1_5');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in failed (HTTP ${res.status}): ${data.error ?? ''}`);
  googleToken = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return googleToken.value;
};

const sendAndroid = async (token: string, push: Push): Promise<PushResult> => {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE!.project}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await firebaseAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { ...(push.title ? { title: push.title } : {}), body: push.body },
        data: { link: push.link },
        android: { priority: 'high', ttl: `${push.ttlSeconds ?? DEFAULT_TTL}s`, notification: { channel_id: 'chat', tag: push.thread, icon: 'ic_stat_notify', color: '#f26b1d', sound: 'default' } },
      },
    }),
  });
  if (res.ok) return 'sent';
  const error = await res.json().catch(() => ({}));
  const code = error?.error?.details?.find?.((d: { errorCode?: string }) => d.errorCode)?.errorCode ?? error?.error?.status;
  if (res.status === 404 || code === 'UNREGISTERED' || (res.status === 400 && /registration token/i.test(error?.error?.message ?? ''))) return 'gone';
  console.error('FCM', res.status, JSON.stringify(error).slice(0, 300));
  return 'failed';
};

// ---------- iPhone (APNs) ----------

let appleToken: { value: string; made: number } | null = null;

// Apple wants the same token reused, and a new one at most every 20 minutes.
const apnsToken = async () => {
  if (appleToken && Date.now() - appleToken.made < 40 * 60_000) return appleToken.value;
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(APNS_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const value = await signJwt({ alg: 'ES256', kid: APNS_KEY_ID }, { iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }, key, { name: 'ECDSA', hash: 'SHA-256' });
  appleToken = { value, made: Date.now() };
  return value;
};

const sendIos = async (token: string, push: Push): Promise<PushResult> => {
  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await apnsToken()}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + (push.ttlSeconds ?? DEFAULT_TTL)),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps: { alert: { ...(push.title ? { title: push.title } : {}), body: push.body }, sound: 'default', 'thread-id': push.thread }, link: push.link }),
  });
  if (res.ok) return 'sent';
  const reason = (await res.json().catch(() => ({})))?.reason ?? '';
  if (res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic') return 'gone';
  if (reason === 'ExpiredProviderToken') appleToken = null;
  console.error('APNs', res.status, reason);
  return 'failed';
};

export const sendPush = (platform: string, token: string, push: Push): Promise<PushResult> => {
  if (platform === 'android' && pushConfigured.android) return sendAndroid(token, push).catch(e => (console.error(e), 'failed' as const));
  if (platform === 'ios' && pushConfigured.ios) return sendIos(token, push).catch(e => (console.error(e), 'failed' as const));
  return Promise.resolve('failed');
};

// A notification fits a phone screen.
export const preview = (text: string, max = 180) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

// Sends to every phone of a person and forgets the tokens that no longer
// exist. Returns how many phones got it.
// deno-lint-ignore no-explicit-any
export const pushToUser = async (admin: any, userId: string, make: (lang: string | null) => Push) => {
  const { data: tokens } = await admin.from('push_tokens').select('token, platform, lang').eq('user_id', userId).limit(20);
  const results = await Promise.all(((tokens ?? []) as { token: string; platform: string; lang: string | null }[])
    .map(async t => ({ token: t.token, result: await sendPush(t.platform, t.token, make(t.lang)) })));
  const gone = results.filter(r => r.result === 'gone').map(r => r.token);
  if (gone.length) await admin.from('push_tokens').delete().in('token', gone);
  return results.filter(r => r.result === 'sent').length;
};
