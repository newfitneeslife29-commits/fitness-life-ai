-- Programs that trainers sell for a one-time payment: several routines for a
-- number of weeks. Paid with Stripe like the hires (the trainer gets their
-- share, Fitness Life keeps its commission); buyers get the routines.
create table if not exists public.trainer_programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_applications (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  weeks smallint not null default 4 check (weeks between 1 and 52),
  price_cents integer not null check (price_cents between 100 and 100000),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  routines jsonb not null check (jsonb_typeof(routines) = 'array' and jsonb_array_length(routines) between 1 and 14 and octet_length(routines::text) <= 200000),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainer_programs_trainer on public.trainer_programs (trainer_id);
alter table public.trainer_programs enable row level security;

-- The trainer manages their own programs (once approved).
create or replace function public.trainer_owns_application(app uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainer_applications where id = app and user_id = auth.uid() and status = 'approved');
$$;
drop policy if exists "trainer_programs_own" on public.trainer_programs;
create policy "trainer_programs_own" on public.trainer_programs for all to authenticated
  using (public.trainer_owns_application(trainer_id))
  with check (public.trainer_owns_application(trainer_id));

create or replace function public.trainer_program_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.trainer_id := old.trainer_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists trainer_program_stamp on public.trainer_programs;
create trigger trainer_program_stamp before insert or update on public.trainer_programs
  for each row execute function public.trainer_program_stamp();

-- One per buyer and program. Written only by the functions (after paying).
create table if not exists public.program_purchases (
  program_id uuid not null references public.trainer_programs (id) on delete cascade,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  primary key (program_id, buyer_id)
);
alter table public.program_purchases enable row level security;
drop policy if exists "program_purchases_own" on public.program_purchases;
create policy "program_purchases_own" on public.program_purchases for select to authenticated using (buyer_id = auth.uid());

-- A program someone bought stays (the trainer can stop selling it instead).
create or replace function public.trainer_program_keep() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (select 1 from program_purchases where program_id = old.id) then
    raise exception 'program_has_buyers' using errcode = 'P0001';
  end if;
  return old;
end $$;
drop trigger if exists trainer_program_keep on public.trainer_programs;
create trigger trainer_program_keep before delete on public.trainer_programs
  for each row execute function public.trainer_program_keep();

-- Checkouts of programs, so a payment is saved even if the webhook is late.
alter table public.trainer_checkouts add column if not exists program_id uuid references public.trainer_programs (id) on delete cascade;

-- The programs on sale (without their routines), and whether I own them.
create or replace function public.programs_listed()
returns table (
  id uuid, trainer_id uuid, trainer_name text, title text, description text, weeks smallint,
  price_cents integer, currency text, routine_count integer, owned boolean, sales integer
)
language sql stable security definer set search_path = public as $$
  select p.id, p.trainer_id, t.name, p.title, p.description, p.weeks, p.price_cents, p.currency,
         jsonb_array_length(p.routines),
         exists (select 1 from program_purchases b where b.program_id = p.id and b.buyer_id = auth.uid()),
         (select count(*)::int from program_purchases b where b.program_id = p.id)
  from trainer_programs p
  join trainer_applications t on t.id = p.trainer_id
  where auth.uid() is not null and p.published and t.status = 'approved' and t.payouts_ready
  order by p.created_at desc
  limit 200;
$$;
revoke all on function public.programs_listed() from public, anon;
grant execute on function public.programs_listed() to authenticated;

-- A program's routines: for its buyers and its trainer.
create or replace function public.program_content(program uuid)
returns table (title text, routines jsonb)
language sql stable security definer set search_path = public as $$
  select p.title, p.routines from trainer_programs p
  where p.id = program and (
    exists (select 1 from program_purchases b where b.program_id = p.id and b.buyer_id = auth.uid())
    or public.trainer_owns_application(p.trainer_id));
$$;
revoke all on function public.program_content(uuid) from public, anon;
grant execute on function public.program_content(uuid) to authenticated;

-- The trainer's sales of each program.
create or replace function public.my_program_sales()
returns table (program_id uuid, sales integer, revenue_cents bigint)
language sql stable security definer set search_path = public as $$
  select b.program_id, count(*)::int, sum(b.amount_cents)::bigint
  from program_purchases b join trainer_programs p on p.id = b.program_id
  where public.trainer_owns_application(p.trainer_id)
  group by b.program_id;
$$;
revoke all on function public.my_program_sales() from public, anon;
grant execute on function public.my_program_sales() to authenticated;
