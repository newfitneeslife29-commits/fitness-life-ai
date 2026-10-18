-- Short videos in community posts (up to 30 s, checked in the app; 50 MB
-- here). They live in their own public bucket, one folder per person, like
-- the photos. Idempotent: runs on every deploy.
alter table public.community_posts add column if not exists video_path text check (char_length(video_path) <= 200);
alter table public.community_posts drop constraint if exists community_posts_not_empty;
alter table public.community_posts add constraint community_posts_not_empty
  check (char_length(btrim(body)) > 0 or image_path is not null or video_path is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-videos', 'community-videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community_videos_insert" on storage.objects;
create policy "community_videos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'community-videos' and (storage.foldername(name))[1] = auth.uid()::text and public.community_is_member());
drop policy if exists "community_videos_delete" on storage.objects;
create policy "community_videos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'community-videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community_videos_read_own" on storage.objects;
create policy "community_videos_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'community-videos' and (storage.foldername(name))[1] = auth.uid()::text);
