-- Community hardening, found in a review of the social migration.
-- Idempotent: runs on every deploy.

-- Likes and comments follow the post's visibility: nobody can list the likes
-- of a private profile's posts (that leaked their ids, and so their photos'
-- addresses), nor like or comment on posts they can't see.
drop policy if exists "community_likes_read" on public.community_likes;
create policy "community_likes_read" on public.community_likes for select to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id));
drop policy if exists "community_likes_insert" on public.community_likes;
create policy "community_likes_insert" on public.community_likes for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member()
    and exists (select 1 from public.community_posts p where p.id = post_id));
drop policy if exists "community_comments_insert" on public.community_comments;
create policy "community_comments_insert" on public.community_comments for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member() and hidden = false
    and exists (select 1 from public.community_posts p where p.id = post_id));

-- Only people with an account can report (three throwaway sessions could
-- otherwise hide anything).
drop policy if exists "community_reports_insert" on public.community_reports;
create policy "community_reports_insert" on public.community_reports for insert to authenticated
  with check (reporter = auth.uid() and public.community_is_member());

-- The server sets the dates: a post dated in the future would stay first in
-- everyone's feed, a story would never expire.
create or replace function public.community_server_dates() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  if tg_table_name = 'community_stories' then
    new.expires_at := now() + interval '24 hours';
  end if;
  return new;
end $$;
drop trigger if exists community_posts_dates on public.community_posts;
create trigger community_posts_dates before insert on public.community_posts
  for each row execute function public.community_server_dates();
drop trigger if exists community_comments_dates on public.community_comments;
create trigger community_comments_dates before insert on public.community_comments
  for each row execute function public.community_server_dates();
drop trigger if exists community_stories_dates on public.community_stories;
create trigger community_stories_dates before insert on public.community_stories
  for each row execute function public.community_server_dates();
drop trigger if exists community_follows_dates on public.community_follows;
create trigger community_follows_dates before insert on public.community_follows
  for each row execute function public.community_server_dates();

-- Accepting a request only changes its status: the follower and the person
-- followed can't be swapped (that made fake follows).
create or replace function public.community_follow_keep_people() returns trigger
language plpgsql as $$
begin
  if new.follower <> old.follower or new.following <> old.following then
    raise exception 'a follow keeps its people';
  end if;
  return new;
end $$;
drop trigger if exists community_follow_keep_people on public.community_follows;
create trigger community_follow_keep_people before update on public.community_follows
  for each row execute function public.community_follow_keep_people();

-- The "Following" feed: posts of the people I follow, matched here (the app
-- used to send their ids in the address, too long with many follows). Runs
-- as the caller, so the posts' own visibility rules still apply.
create or replace function public.community_following_posts() returns setof public.community_posts
language sql stable as $$
  select p.* from public.community_posts p
  where exists (select 1 from public.community_follows f
    where f.follower = auth.uid() and f.following = p.user_id and f.status = 'accepted')
$$;
