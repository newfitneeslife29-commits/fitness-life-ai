-- Trainers sold through Fitness Life: the team (app admins) approves each
-- trainer and sets the price shown in the app and the payment link (for
-- example a Stripe Payment Link that pays Fitness Life, which then pays the
-- trainer their share). A trainer with a payment link is hired through it,
-- so their own contact stays private. Idempotent: runs on every deploy.

-- Who manages trainers from the app. Rows are added by the deploy (the
-- ADMIN_EMAIL variable) or in the dashboard, never from the app.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists "app_admins_read_self" on public.app_admins;
create policy "app_admins_read_self" on public.app_admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

alter table public.trainer_applications add column if not exists app_price text not null default '';
alter table public.trainer_applications add column if not exists payment_url text not null default '';
do $$ begin
  alter table public.trainer_applications add constraint trainer_app_price_len check (char_length(app_price) <= 60);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.trainer_applications add constraint trainer_payment_url_https
    check (payment_url = '' or (payment_url ~ '^https://[^\s]+$' and char_length(payment_url) <= 500));
exception when duplicate_object then null; end $$;

-- Applications are read by their author and by admins; the public list
-- comes from trainers_listed() below, which hides private contacts.
drop policy if exists "trainer_applications_read" on public.trainer_applications;
create policy "trainer_applications_read" on public.trainer_applications for select to authenticated
  using (user_id = auth.uid() or public.is_app_admin());
drop policy if exists "trainer_applications_update" on public.trainer_applications;
create policy "trainer_applications_update" on public.trainer_applications for update to authenticated
  using (user_id = auth.uid() or public.is_app_admin())
  with check (user_id = auth.uid() or public.is_app_admin());
drop policy if exists "trainer_applications_delete" on public.trainer_applications;
create policy "trainer_applications_delete" on public.trainer_applications for delete to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

-- A trainer's own change goes back to review and can't touch the price or
-- the payment link; an admin's review keeps the trainer's data as it is.
create or replace function public.trainer_application_review() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then
    return new; -- dashboard / service role
  end if;
  if tg_op = 'UPDATE' and public.is_app_admin() then
    if old.user_id <> auth.uid() then
      new.name := old.name; new.specialty := old.specialty; new.bio := old.bio;
      new.experience_years := old.experience_years; new.certifications := old.certifications;
      new.languages := old.languages; new.price := old.price; new.contact := old.contact;
      new.country := old.country; new.user_id := old.user_id;
    end if;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.app_price := '';
    new.payment_url := '';
  elsif not public.is_app_admin() then
    new.app_price := old.app_price;
    new.payment_url := old.payment_url;
  end if;
  new.status := 'pending';
  new.updated_at := now();
  return new;
end $$;

-- Approved trainers for everyone: the contact only when there is no
-- payment link (then people reach them directly).
-- Dropped first: a later migration adds columns to it.
drop function if exists public.trainers_listed();
create function public.trainers_listed()
returns table (
  id uuid, user_id uuid, name text, specialty text, bio text, experience_years smallint,
  certifications text, languages text, country text, app_price text, payment_url text,
  contact text, avatar_path text, profile_updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select t.id, t.user_id, t.name, t.specialty, t.bio, t.experience_years, t.certifications,
         t.languages, t.country, t.app_price, t.payment_url,
         case when t.payment_url = '' then t.contact else '' end,
         p.avatar_path, p.updated_at
  from public.trainer_applications t
  left join public.community_profiles p on p.id = t.user_id
  where t.status = 'approved' and auth.uid() is not null
  order by t.updated_at desc
  limit 100;
$$;
revoke all on function public.trainers_listed() from public, anon;
grant execute on function public.trainers_listed() to authenticated;
