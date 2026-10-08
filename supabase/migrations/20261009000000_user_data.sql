-- Cloud copy of the app's data for people with an account: one row per
-- user with the same JSON the app keeps on the phone. Only its owner can
-- read or write it, and anonymous sessions cannot use it.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- A few MB is years of workouts; anything bigger is not from the app.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_data_size') then
    alter table public.user_data add constraint user_data_size check (pg_column_size(data) < 5000000);
  end if;
end $$;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
  for select to authenticated
  using (user_id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
  for insert to authenticated
  with check (user_id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
  for update to authenticated
  using (user_id = auth.uid() and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (user_id = auth.uid());
