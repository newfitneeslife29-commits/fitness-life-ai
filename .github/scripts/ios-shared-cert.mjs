// One Apple distribution certificate shared by the iOS apps built in this
// repository (Fitness Life, Parqués). Apple allows only two at a time per
// team, so a certificate per app and per run left the apps blocking each
// other ("You already have a current Distribution certificate").
//
// The certificate's private key is kept in the GitHub Actions cache,
// encrypted (AES-256-GCM) with a key derived from the App Store Connect API
// key (the APPSTORE_PRIVATE_KEY secret, already in every release workflow):
// without that secret the cached file is useless.
//
// Reads KEY_PATH (the .p8) and SHARED_CERT_DIR (the cached folder) from the
// environment. Without SHARED_CERT_DIR, every run makes its own certificate
// as before.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { SHARED_CERT_DIR, KEY_PATH } = process.env;
const file = () => SHARED_CERT_DIR && join(SHARED_CERT_DIR, 'cert.enc');
// Keep this label: changing it makes the cached certificate unreadable.
const secret = () => createHash('sha256').update('ios shared distribution certificate\n').update(readFileSync(KEY_PATH)).digest();

// Renewed this long before it expires, so a build in review keeps a valid one.
const RENEW_BEFORE_MS = 30 * 86_400_000;

function load() {
    const f = file();
    if (!f || !existsSync(f)) return null;
    try {
        const raw = readFileSync(f);
        const decipher = createDecipheriv('aes-256-gcm', secret(), raw.subarray(0, 12));
        decipher.setAuthTag(raw.subarray(12, 28));
        return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    } catch {
        console.log('::warning::The shared signing certificate could not be read; making a new one.');
        return null;
    }
}

function save(value) {
    if (!SHARED_CERT_DIR) return;
    mkdirSync(SHARED_CERT_DIR, { recursive: true });
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', secret(), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    writeFileSync(file(), Buffer.concat([iv, cipher.getAuthTag(), data]));
    // Tells the workflow to store the folder in the cache.
    writeFileSync(join(SHARED_CERT_DIR, 'new'), '1');
}

// Id of the shared certificate, so pruning and cleanup never remove it.
export const sharedCertificateId = () => load()?.id ?? null;

// The shared certificate while Apple still has it; otherwise a new one from
// `create` (which signs the CSR next to key.pem in signingDir), then shared.
// Reusing it writes its private key over signingDir/key.pem.
export async function sharedCertificate(api, create, signingDir) {
    const shared = load();
    if (shared) {
        const cert = await api('GET', `/certificates/${shared.id}`).catch(() => null);
        const expires = cert ? Date.parse(cert.data.attributes.expirationDate) : 0;
        if (cert?.data.attributes.certificateContent && expires - Date.now() > RENEW_BEFORE_MS) {
            writeFileSync(join(signingDir, 'key.pem'), shared.keyPem, { mode: 0o600 });
            console.log(`Using the shared distribution certificate (expires ${cert.data.attributes.expirationDate.slice(0, 10)})`);
            return { cert, shared: true };
        }
        console.log('The shared certificate was revoked or expires soon; making a new one.');
    }
    const cert = await create();
    if (!SHARED_CERT_DIR) return { cert, shared: false };
    save({ id: cert.data.id, keyPem: readFileSync(join(signingDir, 'key.pem'), 'utf8') });
    console.log('Made a new shared distribution certificate');
    return { cert, shared: true };
}
