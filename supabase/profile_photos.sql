-- Profile photos + private credit balances for Creators Connection.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- 1) Credits leave the public profile view so only the owner can see them
--    (via public.users RLS on their own row).
-- 2) profile_photo is added if missing, and a public storage bucket holds
--    the files under {user_id}/...

alter table public.users
  add column if not exists profile_photo text;

-- Drop first: create or replace view cannot remove columns.
-- security_invoker = false keeps the view running as its owner so it can
-- expose every profile despite users RLS (select-own-only).
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = false) as
select id, username, profile_photo
from public.users;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: profile-photos bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

-- Files live under <user-id>/<filename>.
drop policy if exists "Users can upload own profile photos" on storage.objects;
create policy "Users can upload own profile photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own profile photos" on storage.objects;
create policy "Users can update own profile photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own profile photos" on storage.objects;
create policy "Users can delete own profile photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
