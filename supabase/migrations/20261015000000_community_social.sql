-- Community, social part: followers, private profiles and 24-hour stories.
-- Idempotent: runs on every deploy.
--
-- Private profile: only the people it accepted as followers (and the owner)
-- see its posts and stories; anyone can still see its name and picture and
-- ask to follow. A public profile is followed straight away.

alter table public.community_profiles add column if not exists is_private boolean not null default false;

create table if not exists public.community_follows (
  follower uuid not null references public.community_profiles (id) on delete cascade,
  following uuid not null references public.community_profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower, following),
  constraint community_follows_not_self check (follower <> following)
);
create index if not exists community_follows_following_idx on public.community_follows (following, status);

-- Whether the person asking may see what `owner` shares.
create or replace function public.community_can_see(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
    or not coalesce((select is_private from community_profiles where id = owner), false)
    or exists (select 1 from community_follows where follower = auth.uid() and following = owner and status = 'accepted')
$$;

-- A follow starts accepted for a public profile and pending for a private one.
create or replace function public.community_follow_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := case when coalesce((select is_private from community_profiles where id = new.following), false) then 'pending' else 'accepted' end;
  return new;
end $$;
drop trigger if exists community_follow_status on public.community_follows;
create trigger community_follow_status before insert on public.community_follows
  for each row execute function public.community_follow_status();

-- Going public accepts the requests that were waiting.
create or replace function public.community_accept_on_public() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_private and not new.is_private then
    update community_follows set status = 'accepted' where following = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists community_accept_on_public on public.community_profiles;
create trigger community_accept_on_public after update of is_private on public.community_profiles
  for each row execute function public.community_accept_on_public();

alter table public.community_follows enable row level security;

-- Accepted follows are public (follower counts); requests only for the two people.
drop policy if exists "community_follows_read" on public.community_follows;
create policy "community_follows_read" on public.community_follows for select to authenticated
  using (status = 'accepted' or follower = auth.uid() or following = auth.uid());
drop policy if exists "community_follows_insert" on public.community_follows;
create policy "community_follows_insert" on public.community_follows for insert to authenticated
  with check (follower = auth.uid() and public.community_is_member());
-- Only the person followed accepts a request.
drop policy if exists "community_follows_update" on public.community_follows;
create policy "community_follows_update" on public.community_follows for update to authenticated
  using (following = auth.uid()) with check (following = auth.uid() and status = 'accepted');
-- Unfollow, or remove a follower / turn down a request.
drop policy if exists "community_follows_delete" on public.community_follows;
create policy "community_follows_delete" on public.community_follows for delete to authenticated
  using (follower = auth.uid() or following = auth.uid());

-- Posts and comments of private profiles: only for their followers.
drop policy if exists "community_posts_read" on public.community_posts;
create policy "community_posts_read" on public.community_posts for select to authenticated
  using ((not hidden or user_id = auth.uid()) and public.community_can_see(user_id));
drop policy if exists "community_comments_read" on public.community_comments;
create policy "community_comments_read" on public.community_comments for select to authenticated
  using ((not hidden or user_id = auth.uid())
    and exists (select 1 from public.community_posts p where p.id = post_id and public.community_can_see(p.user_id)));

-- Stories: a photo with an optional caption, visible for 24 hours.
create table if not exists public.community_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.community_profiles (id) on delete cascade,
  image_path text not null check (char_length(image_path) <= 200),
  caption text not null default '' check (char_length(caption) <= 200),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists community_stories_live_idx on public.community_stories (expires_at desc);

alter table public.community_stories enable row level security;
drop policy if exists "community_stories_read" on public.community_stories;
create policy "community_stories_read" on public.community_stories for select to authenticated
  using (user_id = auth.uid() or (not hidden and expires_at > now() and public.community_can_see(user_id)));
drop policy if exists "community_stories_insert" on public.community_stories;
create policy "community_stories_insert" on public.community_stories for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member() and hidden = false
    and expires_at <= now() + interval '24 hours 5 minutes');
drop policy if exists "community_stories_delete" on public.community_stories;
create policy "community_stories_delete" on public.community_stories for delete to authenticated
  using (user_id = auth.uid());

-- Stories can be reported like posts; three reports hide one.
alter table public.community_reports add column if not exists story_id uuid references public.community_stories (id) on delete cascade;
alter table public.community_reports drop constraint if exists community_reports_target;
alter table public.community_reports add constraint community_reports_target check (num_nonnulls(post_id, comment_id, story_id) = 1);
create unique index if not exists community_reports_once_story on public.community_reports (reporter, story_id) where story_id is not null;

create or replace function public.community_hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null and (select count(*) from community_reports where post_id = new.post_id) >= 3 then
    update community_posts set hidden = true where id = new.post_id;
  end if;
  if new.comment_id is not null and (select count(*) from community_reports where comment_id = new.comment_id) >= 3 then
    update community_comments set hidden = true where id = new.comment_id;
  end if;
  if new.story_id is not null and (select count(*) from community_reports where story_id = new.story_id) >= 3 then
    update community_stories set hidden = true where id = new.story_id;
  end if;
  return new;
end $$;
