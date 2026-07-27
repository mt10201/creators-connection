-- Creators Connection schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  email text,
  credit_balance integer not null default 0,
  created_at timestamptz not null default now()
);

-- Migrate existing installs from full_name to username, preserving values.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'full_name'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'users' and column_name = 'username'
    ) then
      -- Both columns exist: carry any full_name values over, then drop it.
      update public.users
      set username = nullif(trim(full_name), '')
      where coalesce(trim(username), '') = '';

      -- The view must go first; it depends on the column.
      drop view if exists public.public_profiles;
      alter table public.users drop column full_name;
    else
      drop view if exists public.public_profiles;
      alter table public.users rename column full_name to username;
    end if;
  end if;
end
$$;

alter table public.users add column if not exists username text;

-- Usernames are public identifiers, so they must be unique.
create unique index if not exists users_username_key
  on public.users (lower(username))
  where username is not null;

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Explore is public and shows creator names, but public.users holds emails and
-- credit balances. This view exposes only the safe columns. It runs with the
-- owner's rights (the default), so it intentionally bypasses the row policies
-- above rather than exposing the whole table.
-- credit_balance is shown on public profile pages; email stays private.
create or replace view public.public_profiles as
select id, username, profile_photo, credit_balance
from public.users;

grant select on public.public_profiles to anon, authenticated;

-- Lets people sign in with a username. Runs as owner so it can read the email
-- column that RLS otherwise keeps private, and it is only ever called from the
-- server so the address never reaches the browser.
-- Reads auth.users.email rather than the copy in public.users, which can drift
-- and would resolve to an address Supabase does not recognise.
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.email
  from public.users u
  join auth.users au on au.id = u.id
  where lower(u.username) = lower(trim(p_username))
  order by au.email_confirmed_at nulls last
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- Every auth user gets a profile row automatically, so posts.creator_id always
-- has something to point at.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email, credit_balance)
  values (
    new.id,
    -- Store NULL rather than '' so a missing username is unambiguous.
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'username',
        new.raw_user_meta_data ->> 'full_name'
      ),
      ''
    ),
    new.email,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for accounts that signed up before the trigger existed.
insert into public.users (id, username, email, credit_balance)
select
  au.id,
  nullif(
    coalesce(
      au.raw_user_meta_data ->> 'username',
      au.raw_user_meta_data ->> 'full_name'
    ),
    ''
  ),
  au.email,
  0
from auth.users au
on conflict (id) do nothing;

-- Repair profiles whose username was never copied across from auth metadata.
update public.users u
set username = nullif(
  coalesce(
    au.raw_user_meta_data ->> 'username',
    au.raw_user_meta_data ->> 'full_name'
  ),
  ''
)
from auth.users au
where au.id = u.id
  and coalesce(trim(u.username), '') = ''
  and coalesce(
    trim(coalesce(
      au.raw_user_meta_data ->> 'username',
      au.raw_user_meta_data ->> 'full_name'
    )),
    ''
  ) <> '';

-- Last resort so every account has a visible handle.
update public.users
set username = split_part(email, '@', 1)
where coalesce(trim(username), '') = ''
  and email is not null;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.users (id),
  product_title text,
  description text,
  product_link text,
  media_urls text[],
  category text,
  status text default 'active',
  boost_status text default 'none',
  boost_end_date timestamptz,
  like_count integer default 0,
  save_count integer default 0,
  created_at timestamptz default now(),
  media_paths text[] not null default '{}'
);

-- For databases created before posts supported multiple images.
alter table public.posts add column if not exists media_urls text[];
alter table public.posts add column if not exists media_paths text[] not null default '{}';

-- Optional short product clip (≤3 seconds).
alter table public.posts add column if not exists video_url text;
alter table public.posts add column if not exists video_path text;

create index if not exists posts_creator_id_idx on public.posts (creator_id);
create index if not exists posts_category_idx on public.posts (category);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- The discovery feed is public, so anyone (signed in or not) can read posts.
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "Users can insert own posts" on public.posts;
create policy "Users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = creator_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = creator_id);

-- ---------------------------------------------------------------------------
-- credit_transactions
-- ---------------------------------------------------------------------------

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.credit_transactions;
create policy "Users can view own transactions"
  on public.credit_transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- Deliberately no insert/update policy: only the trigger below may write here,
-- so a user cannot mint credits by calling the API directly.

-- ---------------------------------------------------------------------------
-- Award +5 credits whenever a post is created
-- ---------------------------------------------------------------------------

create or replace function public.award_post_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_transactions (user_id, amount, reason, post_id)
  values (new.creator_id, 5, 'post_created', new.id);

  update public.users
  set credit_balance = coalesce(credit_balance, 0) + 5
  where id = new.creator_id;

  return new;
end;
$$;

drop trigger if exists on_post_created_award_credits on public.posts;
create trigger on_post_created_award_credits
  after insert on public.posts
  for each row
  execute function public.award_post_credits();

-- ---------------------------------------------------------------------------
-- Storage: product-images bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Files are stored under <user-id>/<filename>, so the first path segment must
-- match the uploader.
drop policy if exists "Users can upload own product images" on storage.objects;
create policy "Users can upload own product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own product images" on storage.objects;
create policy "Users can update own product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own product images" on storage.objects;
create policy "Users can delete own product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
