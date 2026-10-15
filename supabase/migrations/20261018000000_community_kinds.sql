-- What a post is: a tip, an experience, a question, an achievement or just a
-- post. Lets the feed show only tips, only questions… Older apps don't send
-- it and get 'general'. Idempotent: runs on every deploy.
alter table public.community_posts add column if not exists kind text not null default 'general';
do $$ begin
  alter table public.community_posts add constraint community_posts_kind
    check (kind in ('general', 'tip', 'experience', 'question', 'achievement'));
exception when duplicate_object then null;
end $$;
create index if not exists community_posts_kind_created_idx on public.community_posts (kind, created_at desc);
