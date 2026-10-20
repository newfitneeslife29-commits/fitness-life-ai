-- Weekly ranking among friends: each person's totals of the week (counted by
-- the app), seen by themselves and by the people who follow them (accepted).
create table if not exists public.weekly_stats (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  workouts smallint not null default 0 check (workouts between 0 and 50),
  minutes integer not null default 0 check (minutes between 0 and 10000),
  steps integer not null default 0 check (steps between 0 and 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.weekly_stats enable row level security;
drop policy if exists "weekly_stats_own" on public.weekly_stats;
create policy "weekly_stats_own" on public.weekly_stats for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and week between current_date - 14 and current_date + 7);

-- Me and the people I follow, for a week (Monday).
create or replace function public.friends_week(week date)
returns table (user_id uuid, name text, avatar_path text, avatar_updated timestamptz, workouts smallint, minutes integer, steps integer, me boolean)
language sql stable security definer set search_path = public as $$
  select s.user_id, coalesce(p.name, ''), p.avatar_path, p.updated_at, s.workouts, s.minutes, s.steps, s.user_id = auth.uid()
  from weekly_stats s
  left join community_profiles p on p.id = s.user_id
  where s.week = friends_week.week and auth.uid() is not null
    and (s.user_id = auth.uid() or s.user_id in (
      select f.following from community_follows f where f.follower = auth.uid() and f.status = 'accepted'))
  limit 200;
$$;
revoke all on function public.friends_week(date) from public, anon;
grant execute on function public.friends_week(date) to authenticated;
