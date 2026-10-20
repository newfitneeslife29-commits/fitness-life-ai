-- Trainers and their clients, more tools: reviews, routines sent by the
-- trainer, the client's workouts seen by the trainer, and photos in the chat.

-- ---------- Reviews ----------
-- One per client and trainer, only from someone who hired them.
create table if not exists public.trainer_reviews (
  trainer_id uuid not null references public.trainer_applications (id) on delete cascade,
  client_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  body text not null default '' check (char_length(body) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trainer_id, client_id)
);
alter table public.trainer_reviews enable row level security;

create or replace function public.trainer_hired_by_me(trainer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainer_clients where trainer_id = trainer and client_id = auth.uid() and status <> 'incomplete');
$$;

drop policy if exists "trainer_reviews_read" on public.trainer_reviews;
create policy "trainer_reviews_read" on public.trainer_reviews for select to authenticated using (true);
drop policy if exists "trainer_reviews_insert" on public.trainer_reviews;
create policy "trainer_reviews_insert" on public.trainer_reviews for insert to authenticated
  with check (client_id = auth.uid() and public.trainer_hired_by_me(trainer_id));
drop policy if exists "trainer_reviews_update" on public.trainer_reviews;
create policy "trainer_reviews_update" on public.trainer_reviews for update to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid() and public.trainer_hired_by_me(trainer_id));
drop policy if exists "trainer_reviews_delete" on public.trainer_reviews;
create policy "trainer_reviews_delete" on public.trainer_reviews for delete to authenticated
  using (client_id = auth.uid() or public.is_app_admin());

create or replace function public.trainer_review_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists trainer_review_stamp on public.trainer_reviews;
create trigger trainer_review_stamp before insert or update on public.trainer_reviews
  for each row execute function public.trainer_review_stamp();

-- Average stars of every listed trainer.
create or replace function public.trainer_ratings()
returns table (trainer_id uuid, stars numeric, reviews integer)
language sql stable security definer set search_path = public as $$
  select r.trainer_id, round(avg(r.stars), 1), count(*)::int from trainer_reviews r
  join trainer_applications t on t.id = r.trainer_id and t.status = 'approved'
  where auth.uid() is not null
  group by r.trainer_id;
$$;
revoke all on function public.trainer_ratings() from public, anon;
grant execute on function public.trainer_ratings() to authenticated;

-- A trainer's reviews, newest first, with the client's name and photo.
create or replace function public.trainer_reviews_of(trainer uuid)
returns table (client_id uuid, stars smallint, body text, updated_at timestamptz, name text, avatar_path text, avatar_updated timestamptz)
language sql stable security definer set search_path = public as $$
  select r.client_id, r.stars, r.body, r.updated_at, coalesce(nullif(p.name, ''), c.client_name, ''), p.avatar_path, p.updated_at
  from trainer_reviews r
  left join community_profiles p on p.id = r.client_id
  left join lateral (select client_name from trainer_clients where trainer_id = r.trainer_id and client_id = r.client_id order by created_at desc limit 1) c on true
  where r.trainer_id = trainer and auth.uid() is not null
  order by r.updated_at desc
  limit 100;
$$;
revoke all on function public.trainer_reviews_of(uuid) from public, anon;
grant execute on function public.trainer_reviews_of(uuid) to authenticated;

-- ---------- Routines sent by the trainer ----------
create table if not exists public.trainer_routines (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.trainer_clients (id) on delete cascade,
  routine jsonb not null check (jsonb_typeof(routine) = 'object' and octet_length(routine::text) <= 50000),
  created_at timestamptz not null default now(),
  received_at timestamptz
);
create index if not exists trainer_routines_link on public.trainer_routines (link_id, created_at desc);
alter table public.trainer_routines enable row level security;
drop policy if exists "trainer_routines_read" on public.trainer_routines;
create policy "trainer_routines_read" on public.trainer_routines for select to authenticated
  using (public.trainer_link_role(link_id) is not null);
drop policy if exists "trainer_routines_insert" on public.trainer_routines;
create policy "trainer_routines_insert" on public.trainer_routines for insert to authenticated
  with check (public.trainer_link_role(link_id) = 'trainer' and public.trainer_link_open(link_id) and received_at is null);
-- The client marks it as added to their routines.
drop policy if exists "trainer_routines_receive" on public.trainer_routines;
create policy "trainer_routines_receive" on public.trainer_routines for update to authenticated
  using (public.trainer_link_role(link_id) = 'client') with check (public.trainer_link_role(link_id) = 'client');

create or replace function public.trainer_routine_keep() returns trigger
language plpgsql as $$
begin
  -- Only the "received" mark can change.
  new.link_id := old.link_id;
  new.routine := old.routine;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists trainer_routine_keep on public.trainer_routines;
create trigger trainer_routine_keep before update on public.trainer_routines
  for each row execute function public.trainer_routine_keep();

-- ---------- The client's workouts, for their trainer ----------
create table if not exists public.trainer_client_sessions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.trainer_clients (id) on delete cascade,
  session_id text not null check (char_length(session_id) <= 64),
  summary jsonb not null check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 20000),
  started_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (link_id, session_id)
);
create index if not exists trainer_client_sessions_link on public.trainer_client_sessions (link_id, started_at desc);
alter table public.trainer_client_sessions enable row level security;
drop policy if exists "trainer_client_sessions_read" on public.trainer_client_sessions;
create policy "trainer_client_sessions_read" on public.trainer_client_sessions for select to authenticated
  using (public.trainer_link_role(link_id) is not null);
drop policy if exists "trainer_client_sessions_insert" on public.trainer_client_sessions;
create policy "trainer_client_sessions_insert" on public.trainer_client_sessions for insert to authenticated
  with check (public.trainer_link_role(link_id) = 'client' and public.trainer_link_open(link_id));
drop policy if exists "trainer_client_sessions_delete" on public.trainer_client_sessions;
create policy "trainer_client_sessions_delete" on public.trainer_client_sessions for delete to authenticated
  using (public.trainer_link_role(link_id) = 'client');

-- The latest workout of each of the trainer's clients (for the panel).
create or replace function public.trainer_last_sessions()
returns table (link_id uuid, started_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.link_id, max(s.started_at) from trainer_client_sessions s
  join trainer_clients c on c.id = s.link_id and c.trainer_user_id = auth.uid()
  group by s.link_id;
$$;
revoke all on function public.trainer_last_sessions() from public, anon;
grant execute on function public.trainer_last_sessions() to authenticated;

-- ---------- Photos in the chat ----------
alter table public.trainer_messages add column if not exists image_path text check (image_path is null or char_length(image_path) <= 200);
alter table public.trainer_messages drop constraint if exists trainer_messages_body_check;
alter table public.trainer_messages drop constraint if exists trainer_messages_body_or_image;
alter table public.trainer_messages add constraint trainer_messages_body_or_image
  check (char_length(body) <= 2000 and (char_length(btrim(body)) > 0 or image_path is not null));

-- Private: only the two people of the chat (folder = the hire's id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trainer-chat', 'trainer-chat', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.trainer_chat_folder_role(name text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  folder text := (storage.foldername(name))[1];
begin
  if folder !~ '^[0-9a-f-]{36}$' then return null; end if;
  return public.trainer_link_role(folder::uuid);
end $$;

drop policy if exists "trainer_chat_files_read" on storage.objects;
create policy "trainer_chat_files_read" on storage.objects for select to authenticated
  using (bucket_id = 'trainer-chat' and public.trainer_chat_folder_role(name) is not null);
drop policy if exists "trainer_chat_files_insert" on storage.objects;
create policy "trainer_chat_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'trainer-chat' and public.trainer_chat_folder_role(name) is not null
    and public.trainer_link_open(((storage.foldername(name))[1])::uuid));

-- A photo must be in its own chat's folder.
create or replace function public.trainer_message_image() returns trigger
language plpgsql as $$
begin
  if new.image_path is not null and new.image_path not like new.link_id::text || '/%' then
    raise exception 'image_not_in_chat' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trainer_message_image on public.trainer_messages;
create trigger trainer_message_image before insert on public.trainer_messages
  for each row execute function public.trainer_message_image();
