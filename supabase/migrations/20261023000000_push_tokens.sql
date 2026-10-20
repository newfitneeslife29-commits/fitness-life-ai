-- Phone notifications for the trainer chat. Each phone that allows them
-- saves its push token (Android: Firebase Cloud Messaging; iPhone: Apple's
-- push service); the chat-push function sends new messages to the other
-- person's phones.
create table if not exists public.push_tokens (
  token text primary key check (char_length(token) between 20 and 4096),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);
-- Only through the functions below (a phone can change hands between accounts).
alter table public.push_tokens enable row level security;

create or replace function public.push_register(token text, platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  insert into push_tokens (token, user_id, platform) values (push_register.token, auth.uid(), push_register.platform)
  on conflict on constraint push_tokens_pkey do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
revoke all on function public.push_register(text, text) from public, anon;
grant execute on function public.push_register(text, text) to authenticated;

-- On sign-out: this phone stops getting the account's messages.
create or replace function public.push_unregister(token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where push_tokens.token = push_unregister.token and user_id = auth.uid();
$$;
revoke all on function public.push_unregister(text) from public, anon;
grant execute on function public.push_unregister(text) to authenticated;

-- Each message is announced once (the function marks it).
alter table public.trainer_messages add column if not exists pushed_at timestamptz;
