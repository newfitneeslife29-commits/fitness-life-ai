// Prints the client secret Supabase needs for "Sign in with Apple": a JWT
// signed with the Sign in with Apple key (.p8). Apple accepts at most six
// months, so it is made for 150 days and the workflow renews it every month.
// Reads TEAM_ID, KEY_ID, SERVICES_ID and PRIVATE_KEY from the environment.
import { createPrivateKey, sign } from 'node:crypto';

const { TEAM_ID, KEY_ID, SERVICES_ID, PRIVATE_KEY } = process.env;
const now = Math.floor(Date.now() / 1000);
const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${part({ alg: 'ES256', kid: KEY_ID })}.${part({
    iss: TEAM_ID, iat: now, exp: now + 150 * 24 * 3600, aud: 'https://appleid.apple.com', sub: SERVICES_ID,
})}`;
const signature = sign('sha256', Buffer.from(unsigned), { key: createPrivateKey(PRIVATE_KEY), dsaEncoding: 'ieee-p1363' });
process.stdout.write(`${unsigned}.${signature.toString('base64url')}`);
