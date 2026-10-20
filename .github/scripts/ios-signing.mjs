// Makes what the iOS export needs to sign the app and its widget for the App
// Store, through the App Store Connect API: a distribution certificate (from
// the CSR the workflow made) and an App Store profile for each bundle ID, with
// the capabilities set on its App ID (App Groups included, which Xcode's own
// cloud signing can't read with an API key). "cleanup" removes them again.
//
//   node ios-signing.mjs setup | cleanup
//
// Reads KEY_ID, ISSUER_ID, TEAM_ID, KEY_PATH (the .p8), SIGNING_DIR (with
// csr.pem) and RUN (a label for the profile names) from the environment.
// setup writes cert.cer, the profiles, export.plist and state.json there.
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BUNDLES = ['com.fitnesslife.app', 'com.fitnesslife.app.widget'];
const API = 'https://api.appstoreconnect.apple.com/v1';
const { KEY_ID, ISSUER_ID, TEAM_ID, KEY_PATH, SIGNING_DIR, RUN = 'ci' } = process.env;
const statePath = join(SIGNING_DIR, 'state.json');

function token() {
    const now = Math.floor(Date.now() / 1000);
    const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${part({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${part({
        iss: ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1',
    })}`;
    const key = createPrivateKey(readFileSync(KEY_PATH, 'utf8'));
    return `${unsigned}.${sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

async function api(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
    });
    if (method === 'DELETE' && (res.ok || res.status === 404)) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const why = (json.errors ?? []).map(e => `${e.title}: ${e.detail ?? ''}`).join('; ');
        throw new Error(`${method} ${path} → ${res.status} ${why}`);
    }
    return json;
}

const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function setup() {
    const state = { certificateId: null, profileIds: [] };
    const save = () => writeFileSync(statePath, JSON.stringify(state));

    const csr = readFileSync(join(SIGNING_DIR, 'csr.pem'), 'utf8');
    const cert = await api('POST', '/certificates', {
        data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csr } },
    });
    state.certificateId = cert.data.id;
    save();
    const der = Buffer.from(cert.data.attributes.certificateContent, 'base64');
    writeFileSync(join(SIGNING_DIR, 'cert.cer'), der);
    const sha1 = createHash('sha1').update(der).digest('hex').toUpperCase();

    const folders = [
        join(homedir(), 'Library/MobileDevice/Provisioning Profiles'),
        join(homedir(), 'Library/Developer/Xcode/UserData/Provisioning Profiles'),
    ];
    folders.forEach(f => mkdirSync(f, { recursive: true }));
    const names = {};
    for (const identifier of BUNDLES) {
        const found = await api('GET', `/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&limit=200`);
        const bundle = found.data.find(b => b.attributes.identifier === identifier);
        if (!bundle) throw new Error(`The App ID ${identifier} isn't registered in the Apple Developer account`);
        const profile = await api('POST', '/profiles', {
            data: {
                type: 'profiles',
                attributes: { name: `Fitness Life CI ${RUN} ${identifier}`, profileType: 'IOS_APP_STORE' },
                relationships: {
                    bundleId: { data: { type: 'bundleIds', id: bundle.id } },
                    certificates: { data: [{ type: 'certificates', id: state.certificateId }] },
                },
            },
        });
        state.profileIds.push(profile.data.id);
        save();
        const { name, uuid, profileContent } = profile.data.attributes;
        for (const f of folders) writeFileSync(join(f, `${uuid}.mobileprovision`), Buffer.from(profileContent, 'base64'));
        names[identifier] = name;
        console.log(`Profile for ${identifier}: ${name}`);
    }

    const profiles = Object.entries(names)
        .map(([id, name]) => `      <key>${xml(id)}</key><string>${xml(name)}</string>`).join('\n');
    writeFileSync(join(SIGNING_DIR, 'export.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${xml(TEAM_ID)}</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>${sha1}</string>
  <key>provisioningProfiles</key>
    <dict>
${profiles}
    </dict>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
`);
}

async function cleanup() {
    let state;
    try {
        state = JSON.parse(readFileSync(statePath, 'utf8'));
    } catch {
        return;
    }
    for (const id of state.profileIds) await api('DELETE', `/profiles/${id}`);
    if (state.certificateId) await api('DELETE', `/certificates/${state.certificateId}`);
    console.log('Removed the CI certificate and profiles');
}

const command = process.argv[2];
await (command === 'cleanup' ? cleanup() : setup()).catch(e => {
    console.log(`::error::${e.message}`);
    process.exit(1);
});
