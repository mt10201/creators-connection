-- Short product video support (max ~3 seconds, stored separately from image galleries).
-- Run this once in the Supabase SQL Editor.

alter table public.posts
  add column if not exists video_url text;

alter table public.posts
  add column if not exists video_path text;

-- Videos live in the existing public product-images bucket under the same
-- `{user_id}/...` path convention, so no new storage policies are required.
