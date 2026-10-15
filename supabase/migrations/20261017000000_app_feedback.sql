-- Feedback sent from the app (Ajustes → Enviar comentarios). Anyone with a
-- session (anonymous or an account) can send; nobody can read it from the
-- app: it's read in the Supabase dashboard (Table Editor → app_feedback).
-- Idempotent: runs on every deploy.
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('idea', 'problem', 'praise', 'other')),
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 3 and 2000),
  email text check (email is null or char_length(email) <= 200),
  lang text check (char_length(lang) <= 10),
  app_version text check (char_length(app_version) <= 40),
  platform text check (char_length(platform) <= 20),
  created_at timestamptz not null default now()
);
create index if not exists app_feedback_user_created on public.app_feedback (user_id, created_at desc);
alter table public.app_feedback enable row level security;

drop policy if exists "app_feedback_insert" on public.app_feedback;
create policy "app_feedback_insert" on public.app_feedback for insert to authenticated
  with check (user_id = auth.uid());

-- At most 10 a day per person (stops a script from flooding the table), and
-- the server sets the date.
create or replace function public.app_feedback_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if (select count(*) from public.app_feedback
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'feedback limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists app_feedback_limit on public.app_feedback;
create trigger app_feedback_limit before insert on public.app_feedback
  for each row execute function public.app_feedback_limit();
