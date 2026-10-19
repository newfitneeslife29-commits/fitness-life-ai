-- Hiring trainers inside the app. The team sets each trainer's monthly
-- price and the Fitness Life commission; the trainer connects a Stripe
-- account (Stripe Connect Express) to get paid. A client pays a monthly
-- subscription through Stripe Checkout: Stripe sends the trainer their share
-- and keeps the commission in the Fitness Life account. Client and trainer
-- then talk in a private chat. Stripe is only called from the trainer-pay
-- and stripe-webhook functions (service role). Idempotent: runs on every
-- deploy.

alter table public.trainer_applications add column if not exists price_cents integer not null default 0;
alter table public.trainer_applications add column if not exists currency text not null default 'usd';
alter table public.trainer_applications add column if not exists fee_percent smallint not null default 25;
alter table public.trainer_applications add column if not exists stripe_account_id text not null default '';
alter table public.trainer_applications add column if not exists payouts_ready boolean not null default false;
do $$ begin
  alter table public.trainer_applications add constraint trainer_price_cents_range check (price_cents between 0 and 1000000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.trainer_applications add constraint trainer_currency_code check (currency ~ '^[a-z]{3}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.trainer_applications add constraint trainer_fee_percent_range check (fee_percent between 0 and 90);
exception when duplicate_object then null; end $$;

-- A trainer's own change goes back to review and can't touch the price, the
-- commission or the payment link; an admin's review keeps the trainer's data
-- as it is. Only the functions (no auth.uid()) set the Stripe account.
create or replace function public.trainer_application_review() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then
    return new; -- dashboard / service role
  end if;
  if tg_op = 'UPDATE' then
    new.stripe_account_id := old.stripe_account_id;
    new.payouts_ready := old.payouts_ready;
  else
    new.stripe_account_id := '';
    new.payouts_ready := false;
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
    new.price_cents := 0;
    new.currency := 'usd';
    new.fee_percent := 25;
  elsif not public.is_app_admin() then
    new.app_price := old.app_price;
    new.payment_url := old.payment_url;
    new.price_cents := old.price_cents;
    new.currency := old.currency;
    new.fee_percent := old.fee_percent;
  end if;
  new.status := 'pending';
  new.updated_at := now();
  return new;
end $$;

-- One row per subscription: written only by the functions.
create table if not exists public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainer_applications (id) on delete set null,
  trainer_user_id uuid references auth.users (id) on delete set null,
  client_id uuid not null references auth.users (id) on delete cascade,
  client_name text not null default '' check (char_length(client_name) <= 60),
  status text not null default 'incomplete',
  stripe_subscription_id text not null unique,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  fee_percent smallint not null default 0,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  client_read_at timestamptz not null default now(),
  trainer_read_at timestamptz not null default now(),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainer_clients_client on public.trainer_clients (client_id);
create index if not exists trainer_clients_trainer on public.trainer_clients (trainer_user_id);
alter table public.trainer_clients enable row level security;
drop policy if exists "trainer_clients_read" on public.trainer_clients;
create policy "trainer_clients_read" on public.trainer_clients for select to authenticated
  using (client_id = auth.uid() or trainer_user_id = auth.uid() or public.is_app_admin());

-- Checkouts started from the app, so the functions can finish a hire even
-- if Stripe's webhook is late or missing. Functions only.
create table if not exists public.trainer_checkouts (
  session_id text primary key,
  client_id uuid not null references auth.users (id) on delete cascade,
  trainer_id uuid not null references public.trainer_applications (id) on delete cascade,
  client_name text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists trainer_checkouts_client on public.trainer_checkouts (client_id, created_at desc);
alter table public.trainer_checkouts enable row level security;

-- Who the signed-in person is in a hire: 'client', 'trainer' or null.
create or replace function public.trainer_link_role(link uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when c.client_id = auth.uid() then 'client'
              when c.trainer_user_id = auth.uid() then 'trainer' end
  from trainer_clients c where c.id = link;
$$;

-- The chat stays open while the subscription is paid (or its last paid
-- month hasn't ended).
create or replace function public.trainer_link_open(link uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trainer_clients c
    where c.id = link and c.trainer_user_id is not null
      and (c.status in ('active', 'trialing', 'past_due') or c.current_period_end > now())
  );
$$;

create table if not exists public.trainer_messages (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.trainer_clients (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists trainer_messages_link on public.trainer_messages (link_id, id desc);
alter table public.trainer_messages enable row level security;
drop policy if exists "trainer_messages_read" on public.trainer_messages;
create policy "trainer_messages_read" on public.trainer_messages for select to authenticated
  using (public.trainer_link_role(link_id) is not null);
drop policy if exists "trainer_messages_insert" on public.trainer_messages;
create policy "trainer_messages_insert" on public.trainer_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.trainer_link_role(link_id) is not null and public.trainer_link_open(link_id));

create or replace function public.trainer_message_sent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update trainer_clients set last_message_at = new.created_at,
    client_read_at = case when client_id = new.sender_id then new.created_at else client_read_at end,
    trainer_read_at = case when trainer_user_id = new.sender_id then new.created_at else trainer_read_at end
  where id = new.link_id;
  return new;
end $$;
create or replace function public.trainer_message_stamp() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;
drop trigger if exists trainer_message_stamp on public.trainer_messages;
create trigger trainer_message_stamp before insert on public.trainer_messages
  for each row execute function public.trainer_message_stamp();
drop trigger if exists trainer_message_sent on public.trainer_messages;
create trigger trainer_message_sent after insert on public.trainer_messages
  for each row execute function public.trainer_message_sent();

-- New messages arrive live in the chat.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trainer_messages') then
    alter publication supabase_realtime add table public.trainer_messages;
  end if;
end $$;

-- The signed-in person's hires, as client or as trainer, with the other
-- person's name and photo and the unread count.
create or replace function public.trainer_links()
returns table (
  id uuid, role text, status text, trainer_id uuid, trainer_name text, trainer_avatar text, trainer_avatar_updated timestamptz,
  client_name text, client_avatar text, client_avatar_updated timestamptz, amount_cents integer, currency text, fee_percent smallint,
  current_period_end timestamptz, cancel_at_period_end boolean, open boolean, unread integer, last_message_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id,
         case when c.client_id = auth.uid() then 'client' else 'trainer' end,
         c.status, c.trainer_id, coalesce(t.name, ''), tp.avatar_path, tp.updated_at,
         c.client_name, cp.avatar_path, cp.updated_at, c.amount_cents, c.currency, c.fee_percent,
         c.current_period_end, c.cancel_at_period_end, public.trainer_link_open(c.id),
         (select count(*)::int from trainer_messages m
           where m.link_id = c.id and m.sender_id <> auth.uid()
             and m.created_at > case when c.client_id = auth.uid() then c.client_read_at else c.trainer_read_at end),
         c.last_message_at, c.created_at
  from trainer_clients c
  left join trainer_applications t on t.id = c.trainer_id
  left join community_profiles tp on tp.id = c.trainer_user_id
  left join community_profiles cp on cp.id = c.client_id
  where auth.uid() is not null and (c.client_id = auth.uid() or c.trainer_user_id = auth.uid())
    and c.status <> 'incomplete'
  order by coalesce(c.last_message_at, c.created_at) desc
  limit 200;
$$;
revoke all on function public.trainer_links() from public, anon;
grant execute on function public.trainer_links() to authenticated;

create or replace function public.trainer_mark_read(link uuid) returns void
language sql security definer set search_path = public as $$
  update trainer_clients set
    client_read_at = case when client_id = auth.uid() then now() else client_read_at end,
    trainer_read_at = case when trainer_user_id = auth.uid() then now() else trainer_read_at end
  where id = link and (client_id = auth.uid() or trainer_user_id = auth.uid());
$$;
revoke all on function public.trainer_mark_read(uuid) from public, anon;
grant execute on function public.trainer_mark_read(uuid) to authenticated;

-- Admins: how many paying clients each trainer has.
create or replace function public.trainer_client_counts()
returns table (trainer_id uuid, active integer)
language sql stable security definer set search_path = public as $$
  select c.trainer_id, count(*)::int from trainer_clients c
  where public.is_app_admin() and c.trainer_id is not null and c.status in ('active', 'trialing', 'past_due')
  group by c.trainer_id;
$$;
revoke all on function public.trainer_client_counts() from public, anon;
grant execute on function public.trainer_client_counts() to authenticated;

-- A trainer with paying clients can't withdraw from the app (their clients
-- would keep paying). Deleting the account goes through the account
-- function, which cancels the subscriptions first.
create or replace function public.trainer_application_keep() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (
    select 1 from trainer_clients where trainer_id = old.id and status in ('active', 'trialing', 'past_due')
  ) then
    raise exception 'trainer_has_clients' using errcode = 'P0001';
  end if;
  return old;
end $$;
drop trigger if exists trainer_application_keep on public.trainer_applications;
create trigger trainer_application_keep before delete on public.trainer_applications
  for each row execute function public.trainer_application_keep();

-- Approved trainers for everyone: the contact only when they can't be hired
-- in the app or through a payment link (then people reach them directly).
drop function if exists public.trainers_listed();
create function public.trainers_listed()
returns table (
  id uuid, user_id uuid, name text, specialty text, bio text, experience_years smallint,
  certifications text, languages text, country text, app_price text, payment_url text,
  contact text, avatar_path text, profile_updated_at timestamptz,
  price_cents integer, currency text, hire_in_app boolean
)
language sql stable security definer set search_path = public as $$
  select t.id, t.user_id, t.name, t.specialty, t.bio, t.experience_years, t.certifications,
         t.languages, t.country, t.app_price, t.payment_url,
         case when t.payment_url = '' and not (t.payouts_ready and t.price_cents > 0) then t.contact else '' end,
         p.avatar_path, p.updated_at,
         t.price_cents, t.currency, (t.payouts_ready and t.price_cents > 0)
  from public.trainer_applications t
  left join public.community_profiles p on p.id = t.user_id
  where t.status = 'approved' and auth.uid() is not null
  order by t.updated_at desc
  limit 100;
$$;
revoke all on function public.trainers_listed() from public, anon;
grant execute on function public.trainers_listed() to authenticated;
