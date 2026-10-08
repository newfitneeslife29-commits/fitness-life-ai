-- The only table the backend needs: one row per AI request, so the
-- nutrition-coach function can count free and Premium uses per month.
-- Users are anonymous Supabase accounts; no personal data is stored.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

-- Written only by the function (service role). Users may read their own rows.
alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (user_id = auth.uid());
