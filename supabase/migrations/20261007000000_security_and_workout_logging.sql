-- Fitness Life AI: security hardening + workout logging (Fase 0 + Fase 1).
-- Safe to run on the existing project: every statement is idempotent.
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- profiles: own row only; is_premium can only change from the service role
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_premium boolean not null default false;
alter table public.profiles add column if not exists days_per_week smallint;
alter table public.profiles add column if not exists equipment text[];

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Premium is granted by the Stripe webhook (service role). Any client attempt
-- to set it is silently reverted.
create or replace function public.protect_is_premium()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.is_premium := false;
    else
      new.is_premium := old.is_premium;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_premium on public.profiles;
create trigger profiles_protect_is_premium
  before insert or update on public.profiles
  for each row execute function public.protect_is_premium();

-- ---------------------------------------------------------------------------
-- routines: user-owned
-- ---------------------------------------------------------------------------
alter table public.routines enable row level security;

drop policy if exists "routines_own" on public.routines;
create policy "routines_own" on public.routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- subscriptions: readable by its owner, written only by the webhook
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (user_id = auth.uid());
-- No insert/update/delete policies: only the service role writes here.

-- ---------------------------------------------------------------------------
-- Workout logging
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id text,
  routine_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_volume_kg numeric(10, 2),
  notes text
);
create index if not exists workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Exercises are identified by name for now (catalog and AI routines use names).
  exercise_name text not null,
  set_index smallint not null,
  weight_kg numeric(6, 2) not null default 0,
  reps smallint not null,
  rpe numeric(3, 1),
  is_warmup boolean not null default false,
  completed_at timestamptz not null default now()
);
create index if not exists workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_name, completed_at desc);
create index if not exists workout_sets_session_idx
  on public.workout_sets (session_id);

alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

drop policy if exists "workout_sessions_own" on public.workout_sessions;
create policy "workout_sessions_own" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "workout_sets_own" on public.workout_sets;
create policy "workout_sets_own" on public.workout_sets
  for all using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- AI usage (quota), written by the ai-coach Edge Function
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select using (user_id = auth.uid());
