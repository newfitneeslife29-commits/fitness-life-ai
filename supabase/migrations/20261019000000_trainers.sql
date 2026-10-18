-- Online trainers. People with an account apply from the app (Ajustes →
-- "Hazte entrenador online"); you review each application in the Supabase
-- dashboard (Table Editor → trainer_applications) and set status to
-- 'approved' to list it in the app, or 'rejected'. Any change the trainer
-- makes sends it back to review. Idempotent: runs on every deploy.
create table if not exists public.trainer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references public.community_profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  specialty text not null check (char_length(btrim(specialty)) between 2 and 100),
  bio text not null check (char_length(btrim(bio)) between 20 and 800),
  experience_years smallint not null default 0 check (experience_years between 0 and 60),
  certifications text not null default '' check (char_length(certifications) <= 300),
  languages text not null default '' check (char_length(languages) <= 100),
  price text not null default '' check (char_length(price) <= 60),
  contact text not null check (char_length(btrim(contact)) between 3 and 200),
  country text not null default '' check (char_length(country) <= 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainer_applications_status on public.trainer_applications (status, updated_at desc);
alter table public.trainer_applications enable row level security;

-- Everyone sees approved trainers; each person sees their own application.
drop policy if exists "trainer_applications_read" on public.trainer_applications;
create policy "trainer_applications_read" on public.trainer_applications for select to authenticated
  using (status = 'approved' or user_id = auth.uid());
drop policy if exists "trainer_applications_insert" on public.trainer_applications;
create policy "trainer_applications_insert" on public.trainer_applications for insert to authenticated
  with check (user_id = auth.uid() and public.community_is_member());
drop policy if exists "trainer_applications_update" on public.trainer_applications;
create policy "trainer_applications_update" on public.trainer_applications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "trainer_applications_delete" on public.trainer_applications;
create policy "trainer_applications_delete" on public.trainer_applications for delete to authenticated
  using (user_id = auth.uid());

-- From the app, an application is always "pending": only the dashboard
-- (service role, no auth.uid()) can approve or reject.
create or replace function public.trainer_application_review() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then
    new.status := 'pending';
    new.updated_at := now();
    if tg_op = 'INSERT' then new.created_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists trainer_application_review on public.trainer_applications;
create trigger trainer_application_review before insert or update on public.trainer_applications
  for each row execute function public.trainer_application_review();
