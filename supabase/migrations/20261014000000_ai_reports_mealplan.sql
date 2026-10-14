-- AI meal plans can be reported too.
-- Idempotent: runs on every deploy.
alter table public.ai_reports drop constraint if exists ai_reports_kind_check;
alter table public.ai_reports add constraint ai_reports_kind_check
  check (kind in ('coach', 'meal', 'trainer', 'routine', 'mealplan'));
