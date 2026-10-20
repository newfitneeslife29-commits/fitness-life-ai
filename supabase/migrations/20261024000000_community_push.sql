-- Community notifications (likes, comments, followers), written in the
-- language of the phone that receives them.
alter table public.push_tokens add column if not exists lang text check (lang is null or lang ~ '^[a-z]{2}$');

drop function if exists public.push_register(text, text);
create or replace function public.push_register(token text, platform text, lang text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  insert into push_tokens (token, user_id, platform, lang) values (push_register.token, auth.uid(), push_register.platform, push_register.lang)
  on conflict on constraint push_tokens_pkey do update
    set user_id = excluded.user_id, platform = excluded.platform, lang = coalesce(excluded.lang, push_tokens.lang), updated_at = now();
end $$;
revoke all on function public.push_register(text, text, text) from public, anon;
grant execute on function public.push_register(text, text, text) to authenticated;

-- What was already announced (a like taken back and given again is not
-- announced twice). Functions only.
create table if not exists public.push_sent (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.push_sent enable row level security;
