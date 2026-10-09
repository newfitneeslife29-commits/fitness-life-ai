-- Community: people with an account share their progress (text and an
-- optional photo); everyone in the app can see posts, like and comment.
-- Tables are prefixed with community_ so they never clash with older tables
-- in the project (there is an unrelated public.profiles).
--
-- Moderation: anyone can report a post or comment; three reports from
-- different people hide it until the owner of the project reviews it
-- (Table Editor → community_posts / community_comments → hidden = false).
-- Blocking a person is done in the app (their posts are filtered out).

create table if not exists public.community_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  avatar_path text check (char_length(avatar_path) <= 200),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.community_profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  image_path text check (char_length(image_path) <= 200),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint community_posts_not_empty check (char_length(btrim(body)) > 0 or image_path is not null)
);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.community_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.community_profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id uuid references public.community_posts (id) on delete cascade,
  comment_id uuid references public.community_comments (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  constraint community_reports_target check ((post_id is null) <> (comment_id is null))
);
create unique index if not exists community_reports_once_post on public.community_reports (reporter, post_id) where post_id is not null;
create unique index if not exists community_reports_once_comment on public.community_reports (reporter, comment_id) where comment_id is not null;

-- A real account (not the anonymous session used without one).
create or replace function public.community_is_member() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- Three reports hide a post or comment.
create or replace function public.community_hide_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null and (select count(*) from community_reports where post_id = new.post_id) >= 3 then
    update community_posts set hidden = true where id = new.post_id;
  end if;
  if new.comment_id is not null and (select count(*) from community_reports where comment_id = new.comment_id) >= 3 then
    update community_comments set hidden = true where id = new.comment_id;
  end if;
  return new;
end $$;
drop trigger if exists community_hide_reported on public.community_reports;
create trigger community_hide_reported after insert on public.community_reports
  for each row execute function public.community_hide_reported();

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;

-- Profiles: everyone in the app can see names and pictures; you edit yours.
drop policy if exists "community_profiles_read" on public.community_profiles;
create policy "community_profiles_read" on public.community_profiles for select to authenticated using (true);
drop policy if exists "community_profiles_insert" on public.community_profiles;
create policy "community_profiles_insert" on public.community_profiles for insert to authenticated
  with check (id = auth.uid() and public.community_is_member());
drop policy if exists "community_profiles_update" on public.community_profiles;
create policy "community_profiles_update" on public.community_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Posts: visible unless hidden by reports (your own stay visible to you).
drop policy if exists "community_posts_read" on public.community_posts;
create policy "community_posts_read" on public.community_posts for select to authenticated
  using (not hidden or user_id = auth.uid());
drop policy if exists "community_posts_insert" on public.community_posts;
create policy "community_posts_insert" on public.community_posts for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member() and hidden = false);
drop policy if exists "community_posts_delete" on public.community_posts;
create policy "community_posts_delete" on public.community_posts for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "community_likes_read" on public.community_likes;
create policy "community_likes_read" on public.community_likes for select to authenticated using (true);
drop policy if exists "community_likes_insert" on public.community_likes;
create policy "community_likes_insert" on public.community_likes for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member());
drop policy if exists "community_likes_delete" on public.community_likes;
create policy "community_likes_delete" on public.community_likes for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "community_comments_read" on public.community_comments;
create policy "community_comments_read" on public.community_comments for select to authenticated
  using (not hidden or user_id = auth.uid());
drop policy if exists "community_comments_insert" on public.community_comments;
create policy "community_comments_insert" on public.community_comments for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member() and hidden = false);
drop policy if exists "community_comments_delete" on public.community_comments;
create policy "community_comments_delete" on public.community_comments for delete to authenticated
  using (user_id = auth.uid());

-- Reports: anyone signed in (even without an account) can report; nobody reads them from the app.
drop policy if exists "community_reports_insert" on public.community_reports;
create policy "community_reports_insert" on public.community_reports for insert to authenticated
  with check (reporter = auth.uid());

-- Photos: public bucket (anyone can view), each person writes only in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community_files_insert" on storage.objects;
create policy "community_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text and public.community_is_member());
drop policy if exists "community_files_update" on storage.objects;
create policy "community_files_update" on storage.objects for update to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community_files_delete" on storage.objects;
create policy "community_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community_files_read_own" on storage.objects;
create policy "community_files_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
