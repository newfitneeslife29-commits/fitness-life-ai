#!/usr/bin/env bash
# Google Play upload key: the key that signs every Android build sent to Play.
#
# It lives in the Supabase project's Vault (encrypted, readable only with
# SUPABASE_ACCESS_TOKEN), so nobody has to create it on a computer or paste
# it anywhere. The first run creates it; later runs reuse the same one.
# Google Play keeps its own app signing key; if this upload key is ever lost,
# Play Console can register a new one (Test and release → App integrity).
#
# Writes ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD and
# ANDROID_KEY_ALIAS to $GITHUB_ENV for the Gradle build.
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?}" "${SUPABASE_ACCESS_TOKEN:?}"
api="https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query"
work="${RUNNER_TEMP:-$(mktemp -d)}"
name='android_upload_key'

query() {
  jq -n --arg q "$1" '{query: $q}' > "$work/query.json"
  local status
  status=$(curl -sS -o "$work/answer.json" -w '%{http_code}' -X POST "$api" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' \
    -d @"$work/query.json")
  rm -f "$work/query.json"
  if [ "$status" -ge 300 ]; then
    echo "::error::Supabase answered HTTP $status: $(jq -r '.message // .' "$work/answer.json" 2>/dev/null | head -c 300)"
    return 1
  fi
}

# Prints the stored key, or nothing when there is none yet. Fails if it cannot tell.
read_key() {
  query "select decrypted_secret from vault.decrypted_secrets where name = '$name' limit 1" || return 1
  jq -r '.[0].decrypted_secret // empty' "$work/answer.json"
}

stored=$(read_key) || exit 1
if [ -z "$stored" ]; then
  echo "No upload key yet: creating one."
  pass=$(openssl rand -hex 24)
  echo "::add-mask::$pass"
  keytool -genkeypair -keystore "$work/new.p12" -storetype PKCS12 -alias upload \
    -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=Fitness Life, O=Fitness Life' \
    -storepass "$pass" -keypass "$pass" 2>/dev/null
  value=$(jq -nc --arg k "$(base64 -w0 "$work/new.p12")" --arg p "$pass" '{keystore: $k, password: $p}')
  rm -f "$work/new.p12"
  # Another run may have created it meanwhile (the name is unique): then use that one.
  query "select vault.create_secret('$value', '$name', 'Fitness Life: Google Play upload key. Do not delete.')" \
    || echo "Could not store the new key; reading the existing one."
  stored=$(read_key) || exit 1
fi
rm -f "$work/answer.json"
if [ -z "$stored" ]; then
  echo "::error::Could not read or create the upload key in the Supabase Vault."
  exit 1
fi

pass=$(jq -r .password <<< "$stored")
echo "::add-mask::$pass"
jq -r .keystore <<< "$stored" | base64 -d > "$work/upload.p12"
chmod 600 "$work/upload.p12"

{
  echo "ANDROID_KEYSTORE_PATH=$work/upload.p12"
  echo "ANDROID_KEYSTORE_PASSWORD=$pass"
  echo "ANDROID_KEY_ALIAS=upload"
} >> "${GITHUB_ENV:-/dev/null}"

# The certificate fingerprints are public; Play Console shows the same ones.
echo "Upload key certificate:"
keytool -list -v -keystore "$work/upload.p12" -storepass "$pass" -alias upload 2>/dev/null | grep -E 'SHA1:|SHA256:' | sed 's/^\s*/  /'
