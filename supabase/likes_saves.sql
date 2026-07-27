-- Likes and saves for Creators Connection.
-- Run this in the Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- In case the tables already existed without these columns.
alter table public.likes add column if not exists user_id uuid;
alter table public.likes add column if not exists post_id uuid;
alter table public.saves add column if not exists user_id uuid;
alter table public.saves add column if not exists post_id uuid;

-- One like / one save per user per post. This is what makes the toggle safe.
create unique index if not exists likes_user_post_key on public.likes (user_id, post_id);
create unique index if not exists saves_user_post_key on public.saves (user_id, post_id);

create index if not exists likes_post_id_idx on public.likes (post_id);
create index if not exists saves_post_id_idx on public.saves (post_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.likes enable row level security;
alter table public.saves enable row level security;

-- Like rows are readable by everyone so the UI can show what you already liked.
drop policy if exists "Likes are viewable by everyone" on public.likes;
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

drop policy if exists "Users can like as themselves" on public.likes;
create policy "Users can like as themselves"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.likes;
create policy "Users can remove own likes"
  on public.likes for delete to authenticated
  using (auth.uid() = user_id);

-- Saves are private: only the owner can see what they saved.
drop policy if exists "Users can view own saves" on public.saves;
create policy "Users can view own saves"
  on public.saves for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save as themselves" on public.saves;
create policy "Users can save as themselves"
  on public.saves for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own saves" on public.saves;
create policy "Users can remove own saves"
  on public.saves for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Keep posts.like_count / posts.save_count accurate
-- ---------------------------------------------------------------------------

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts p
  set like_count = (select count(*) from public.likes l where l.post_id = p.id)
  where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

create or replace function public.sync_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts p
  set save_count = (select count(*) from public.saves s where s.post_id = p.id)
  where p.id = coalesce(new.post_id, old.post_id);
  return null;
end;
$$;

drop trigger if exists likes_sync_count on public.likes;
create trigger likes_sync_count
  after insert or delete on public.likes
  for each row execute function public.sync_like_count();

drop trigger if exists saves_sync_count on public.saves;
create trigger saves_sync_count
  after insert or delete on public.saves
  for each row execute function public.sync_save_count();

-- Reconcile any counts that drifted before the triggers existed.
update public.posts p
set like_count = (select count(*) from public.likes l where l.post_id = p.id),
    save_count = (select count(*) from public.saves s where s.post_id = p.id);

notify pgrst, 'reload schema';
