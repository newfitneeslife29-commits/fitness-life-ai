-- Fixes before launch.

-- Invite rewards: counted on the code's owner and never going down, so
-- deleting the friends' accounts (their redemptions go with them) doesn't
-- reopen the 10-invite limit.
alter table public.referral_codes add column if not exists rewards integer not null default 0;
update public.referral_codes c set rewards = least(10, (select count(*) from public.referral_redemptions r where r.referrer = c.user_id))
  where rewards = 0;

-- One more reward for this person if they are under the limit: the new count,
-- or null when they already had them all. The referral function only.
create or replace function public.referral_take_reward(p_referrer uuid, p_max integer)
returns integer
language sql security definer set search_path = public as $$
  update referral_codes set rewards = rewards + 1
  where user_id = p_referrer and rewards < p_max
  returning rewards;
$$;
revoke all on function public.referral_take_reward(uuid, integer) from public, anon, authenticated;
grant execute on function public.referral_take_reward(uuid, integer) to service_role;

-- Weekly ranking: only friends, people who follow each other, see each
-- other's week (a public profile accepts any follower automatically).
create or replace function public.friends_week(week date)
returns table (user_id uuid, name text, avatar_path text, avatar_updated timestamptz, workouts smallint, minutes integer, steps integer, me boolean)
language sql stable security definer set search_path = public as $$
  select s.user_id, coalesce(p.name, ''), p.avatar_path, p.updated_at, s.workouts, s.minutes, s.steps, s.user_id = auth.uid()
  from weekly_stats s
  left join community_profiles p on p.id = s.user_id
  where s.week = friends_week.week and auth.uid() is not null
    and (s.user_id = auth.uid() or (
      exists (select 1 from community_follows f where f.follower = auth.uid() and f.following = s.user_id and f.status = 'accepted')
      and exists (select 1 from community_follows g where g.follower = s.user_id and g.following = auth.uid() and g.status = 'accepted')))
  limit 200;
$$;
revoke all on function public.friends_week(date) from public, anon;
grant execute on function public.friends_week(date) to authenticated;
