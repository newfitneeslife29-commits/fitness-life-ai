-- 30-day challenges: each person's progress (counted by the app from their
-- own data) for the leaderboard of people doing the same challenge.
create table if not exists public.challenge_entries (
  challenge text not null check (challenge ~ '^[a-z0-9]{2,20}$'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null,
  progress smallint not null default 0 check (progress between 0 and 400),
  updated_at timestamptz not null default now(),
  primary key (challenge, user_id)
);
create index if not exists challenge_entries_board on public.challenge_entries (challenge, joined_at);
alter table public.challenge_entries enable row level security;
drop policy if exists "challenge_entries_own" on public.challenge_entries;
create policy "challenge_entries_own" on public.challenge_entries for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and joined_at <= now() + interval '1 day');

-- The top 20 of a challenge (people who joined in the last 31 days), and me.
-- Private profiles only see themselves.
create or replace function public.challenge_board(challenge text)
returns table (user_id uuid, name text, avatar_path text, avatar_updated timestamptz, progress smallint, rank bigint, me boolean)
language sql stable security definer set search_path = public as $$
  with entries as (
    select e.user_id, e.progress, e.updated_at, p.name, p.avatar_path, p.updated_at as avatar_updated
    from challenge_entries e
    left join community_profiles p on p.id = e.user_id
    where e.challenge = challenge_board.challenge and e.joined_at > now() - interval '31 days' and auth.uid() is not null
      and (e.user_id = auth.uid() or not coalesce(p.is_private, false))
  ), ranked as (
    select *, rank() over (order by progress desc) as rank from entries
  )
  select r.user_id, coalesce(r.name, ''), r.avatar_path, r.avatar_updated, r.progress, r.rank, r.user_id = auth.uid()
  from ranked r
  where r.rank <= 20 or r.user_id = auth.uid()
  order by r.rank, r.updated_at
  limit 21;
$$;
revoke all on function public.challenge_board(text) from public, anon;
grant execute on function public.challenge_board(text) to authenticated;

-- How many people are doing each challenge now.
create or replace function public.challenge_counts()
returns table (challenge text, people integer)
language sql stable security definer set search_path = public as $$
  select e.challenge, count(*)::int from challenge_entries e
  where e.joined_at > now() - interval '31 days' and auth.uid() is not null
  group by e.challenge;
$$;
revoke all on function public.challenge_counts() from public, anon;
grant execute on function public.challenge_counts() to authenticated;
