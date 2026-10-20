-- Invite a friend: each account has a code; a new account that enters it
-- gets a week of Premium, and so does the friend who invited them (up to 10
-- invites). The referral function grants the weeks through RevenueCat.
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists "referral_codes_own" on public.referral_codes;
create policy "referral_codes_own" on public.referral_codes for select to authenticated using (user_id = auth.uid());

-- One per person who entered a code. Functions only.
create table if not exists public.referral_redemptions (
  redeemer uuid primary key references auth.users (id) on delete cascade,
  referrer uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists referral_redemptions_referrer on public.referral_redemptions (referrer);
alter table public.referral_redemptions enable row level security;

-- My code (made the first time), and how many friends joined with it.
create or replace function public.referral_my_code()
returns table (code text, friends integer)
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if not exists (select 1 from referral_codes where user_id = auth.uid()) then
    loop
      candidate := '';
      for i in 1..6 loop
        candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      begin
        insert into referral_codes (user_id, code) values (auth.uid(), candidate);
        exit;
      exception when unique_violation then
        -- Taken (or made at the same time by another call): try again.
        if exists (select 1 from referral_codes where user_id = auth.uid()) then exit; end if;
      end;
    end loop;
  end if;
  return query
    select c.code, (select count(*)::int from referral_redemptions r where r.referrer = auth.uid())
    from referral_codes c where c.user_id = auth.uid();
end $$;
revoke all on function public.referral_my_code() from public, anon;
grant execute on function public.referral_my_code() to authenticated;
