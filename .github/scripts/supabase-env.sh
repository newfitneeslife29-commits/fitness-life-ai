#!/usr/bin/env bash
# Points the app build at the Supabase backend: writes VITE_SUPABASE_URL and
# VITE_SUPABASE_ANON_KEY to $GITHUB_ENV for the following steps.
#
# Needs only the SUPABASE_PROJECT_REF variable: the URL comes from it, and the
# anon key (public by design) is read from Supabase with SUPABASE_ACCESS_TOKEN.
# A VITE_SUPABASE_ANON_KEY variable, if set, is the fallback. Without a
# project, the build still succeeds and the app shows the AI as unavailable.
set -uo pipefail

ref="${SUPABASE_PROJECT_REF:-}"
if ! [[ "$ref" =~ ^[a-z]{20}$ ]]; then
  echo "::notice::No valid SUPABASE_PROJECT_REF: building without the AI coach."
  exit 0
fi

key=""
if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  key=$(curl -fsS "https://api.supabase.com/v1/projects/$ref/api-keys" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    | jq -r '[.[] | select(.name == "anon")][0].api_key // empty') || key=""
fi
[ -z "$key" ] && key="${ANON_KEY_VARIABLE:-}"

if [ -z "$key" ]; then
  echo "::warning::Could not get the Supabase anon key: building without the AI coach."
  exit 0
fi

echo "VITE_SUPABASE_URL=https://$ref.supabase.co" >> "$GITHUB_ENV"
echo "VITE_SUPABASE_ANON_KEY=$key" >> "$GITHUB_ENV"
echo "AI coach backend: https://$ref.supabase.co"
