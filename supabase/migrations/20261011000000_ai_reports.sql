-- Reports on AI answers: the coach's replies and meal estimates. Google Play
-- asks apps with generative AI to let people flag offensive output. Review
-- them in Table Editor → ai_reports; nobody reads them from the app.

create table if not exists public.ai_reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('coach', 'meal')),
  reason text not null check (reason in ('offensive', 'harmful', 'wrong', 'other')),
  content text not null check (char_length(content) between 1 and 4000),
  question text not null default '' check (char_length(question) <= 1000),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists ai_reports_created_idx on public.ai_reports (created_at desc);

alter table public.ai_reports enable row level security;

-- Any session can report, including the anonymous one used without an account.
drop policy if exists "ai_reports_insert" on public.ai_reports;
create policy "ai_reports_insert" on public.ai_reports for insert to authenticated
  with check (reporter = auth.uid());
