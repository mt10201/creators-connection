-- Row Level Security + privilege hardening for Creators Connection.
-- Run this LAST in the Supabase SQL Editor, after every other file in this
-- folder. Safe to re-run: every policy is dropped and recreated, and every
-- grant/revoke is idempotent.
--
-- This file is the single source of truth for who can read and write what.
-- The earlier files each set up their own policies; this one restates the whole
-- picture and tightens the gaps between them.
--
-- Model
--   • Anonymous visitors: read active posts, public profiles, boost catalog,
--     active boost labels. Nothing else, and no writes at all.
--   • Authenticated users: the above, plus their own rows in every table, and
--     writes limited to their own content and a fixed list of columns.
--   • Credits and boosts: written only by SECURITY DEFINER functions
--     (grant_credits, purchase_boost, and the triggers that call them). No
--     client role may insert, update or delete a ledger row directly.
--
-- Why column-level grants appear below: RLS can decide *which rows* a user may
-- touch but not *which columns*. Owning a row is not permission to rewrite
-- like_count, credit_balance or impression counters, all of which feed ranking
-- or the wallet. Postgres column privileges are the missing half.
--
-- Trigger note: BEFORE triggers that assign generated columns (for example
-- product_link_normalized, tags_search) are unaffected by the column grants —
-- privileges are checked against the columns named in the statement, not
-- against what a trigger later writes into NEW.

-- ---------------------------------------------------------------------------
-- 0a) Prerequisites
-- ---------------------------------------------------------------------------
-- The SQL Editor runs a script in one transaction, so a missing table halfway
-- down would roll back everything with a confusing error. Fail early instead,
-- naming what to run first.

do $$
declare
  v_missing text[] := '{}';
  r record;
begin
  for r in
    select * from (values
      ('users', 'schema.sql'),
      ('posts', 'schema.sql'),
      ('credit_transactions', 'schema.sql'),
      ('likes', 'likes_saves.sql'),
      ('saves', 'likes_saves.sql'),
      ('notifications', 'notifications.sql'),
      ('analytics_events', 'analytics_events.sql'),
      ('post_url_credit_claims', 'credits_hybrid.sql'),
      ('boosts', 'boosts.sql'),
      ('boost_products', 'boosts.sql'),
      ('feed_config', 'boosts.sql'),
      ('impressions', 'impressions.sql'),
      ('link_clicks', 'impressions.sql'),
      ('referral_credit_claims', 'referrals.sql')
    ) as t(tbl, src)
  loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = r.tbl and c.relkind = 'r'
    ) then
      v_missing := v_missing || format('%s (run %s)', r.tbl, r.src);
    end if;
  end loop;

  if cardinality(v_missing) > 0 then
    raise exception 'rls.sql prerequisites missing: %',
      array_to_string(v_missing, '; ');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 0b) Inventory: warn about any public table without RLS
-- ---------------------------------------------------------------------------
-- Runs first so a newly added table that this file forgot is visible in the
-- output before the policies below are applied.

do $$
declare
  r record;
  v_missing int := 0;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
    order by c.relname
  loop
    v_missing := v_missing + 1;
    raise warning 'RLS DISABLED on public.% (add it to supabase/rls.sql)', r.relname;
  end loop;

  if v_missing = 0 then
    raise notice 'RLS is enabled on every table in public.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1) users
-- ---------------------------------------------------------------------------
-- Own row only. Public-facing name/photo/age is served by the public_profiles
-- view (owner-run), so email, credit_balance and referred_by never leak.

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

-- No delete policy: account removal goes through the service role
-- (auth.admin.deleteUser) and cascades from auth.users.

-- credit_balance and referred_by are deliberately absent from the update
-- grant. Without this a user could set their own credit_balance directly.
revoke insert, update, delete on public.users from anon, authenticated;
revoke select on public.users from anon;
grant select on public.users to authenticated;
grant insert (id, username, email, profile_photo) on public.users to authenticated;
grant update (username, profile_photo) on public.users to authenticated;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) posts
-- ---------------------------------------------------------------------------
-- Public reads are limited to visible posts; an owner always sees their own,
-- so the dashboard still works if a post is ever hidden.

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (
    coalesce(status, 'active') = 'active'
    or auth.uid() = creator_id
  );

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

-- Writable columns match the upload and edit forms exactly (lib/posts.ts).
-- Everything else on posts is derived and must stay out of reach: like_count,
-- save_count, organic_impressions, boosted_impressions and link_clicks are
-- ranking or reporting inputs, boost_status/boost_end_date belong to the boost
-- system, and product_link_normalized/tags_search are trigger-maintained.
-- Add a column here only when a form legitimately needs to write it.
revoke insert, update, delete on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (
  creator_id, product_title, description, product_link, category,
  tags, media_urls, media_paths, video_url, video_path
) on public.posts to authenticated;
grant update (
  product_title, description, product_link, category,
  tags, media_urls, media_paths, video_url, video_path
) on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- 3) likes / saves
-- ---------------------------------------------------------------------------
-- The UI only ever asks "did I like this?" and reads totals from
-- posts.like_count / posts.save_count, which triggers maintain. So own rows
-- are enough, and the full like graph stays private.

alter table public.likes enable row level security;
alter table public.saves enable row level security;

drop policy if exists "Likes are viewable by everyone" on public.likes;
drop policy if exists "Users can view own likes" on public.likes;
create policy "Users can view own likes"
  on public.likes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can like as themselves" on public.likes;
create policy "Users can like as themselves"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.likes;
create policy "Users can remove own likes"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own saves" on public.saves;
create policy "Users can view own saves"
  on public.saves for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save as themselves" on public.saves;
create policy "Users can save as themselves"
  on public.saves for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove own saves" on public.saves;
create policy "Users can remove own saves"
  on public.saves for delete
  to authenticated
  using (auth.uid() = user_id);

-- No update: a like is created or removed, never edited.
revoke all on public.likes from anon, authenticated;
revoke all on public.saves from anon, authenticated;
grant select, insert, delete on public.likes to authenticated;
grant select, insert, delete on public.saves to authenticated;

-- ---------------------------------------------------------------------------
-- 4) credit_transactions  (read own, never write)
-- ---------------------------------------------------------------------------

alter table public.credit_transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.credit_transactions;
create policy "Users can view own transactions"
  on public.credit_transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy anywhere: grant_credits and purchase_boost
-- are SECURITY DEFINER and run as the function owner, so revoking the write
-- privileges here does not affect them.
revoke all on public.credit_transactions from anon, authenticated;
grant select on public.credit_transactions to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Credit claim ledgers (read own, never write)
-- ---------------------------------------------------------------------------

alter table public.post_url_credit_claims enable row level security;

drop policy if exists "Users can view own url credit claims" on public.post_url_credit_claims;
create policy "Users can view own url credit claims"
  on public.post_url_credit_claims for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.post_url_credit_claims from anon, authenticated;
grant select on public.post_url_credit_claims to authenticated;

alter table public.referral_credit_claims enable row level security;

drop policy if exists "Referrers can view own referral claims" on public.referral_credit_claims;
create policy "Referrers can view own referral claims"
  on public.referral_credit_claims for select
  to authenticated
  using (auth.uid() = referrer_id);

revoke all on public.referral_credit_claims from anon, authenticated;
grant select on public.referral_credit_claims to authenticated;

-- ---------------------------------------------------------------------------
-- 6) boosts, boost_products, feed_config
-- ---------------------------------------------------------------------------
-- purchase_boost() is the only writer. Signed-out visitors need labels for
-- boosted cards, which the owner-run active_boosts view provides without
-- exposing who paid what.

alter table public.boosts enable row level security;

drop policy if exists "Users can view own boosts" on public.boosts;
create policy "Users can view own boosts"
  on public.boosts for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.boosts from anon, authenticated;
grant select on public.boosts to authenticated;
grant select on public.active_boosts to anon, authenticated;

alter table public.boost_products enable row level security;

drop policy if exists "Boost products are viewable by everyone" on public.boost_products;
create policy "Boost products are viewable by everyone"
  on public.boost_products for select
  using (true);

-- Catalog and pricing are managed in SQL only: a writable cost_credits would
-- let a user price their own boost.
revoke all on public.boost_products from anon, authenticated;
grant select on public.boost_products to anon, authenticated;

alter table public.feed_config enable row level security;

drop policy if exists "Feed config is viewable by everyone" on public.feed_config;
create policy "Feed config is viewable by everyone"
  on public.feed_config for select
  using (true);

revoke all on public.feed_config from anon, authenticated;
grant select on public.feed_config to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) notifications
-- ---------------------------------------------------------------------------
-- Rows are written by triggers only. Marking as read is the single change a
-- user may make, which is why the update grant names one column.

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- 8) impressions / link_clicks  (definer RPCs only)
-- ---------------------------------------------------------------------------
-- RLS is on with no policies at all, so no client role can read or write these
-- even with a table grant. record_impression / record_link_click are the only
-- doors in, and they dedupe before touching the counters.

alter table public.impressions enable row level security;
alter table public.link_clicks enable row level security;

revoke all on public.impressions from anon, authenticated;
revoke all on public.link_clicks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) analytics_events  (append own, read never)
-- ---------------------------------------------------------------------------

alter table public.analytics_events enable row level security;

drop policy if exists "Users can insert own analytics events" on public.analytics_events;
create policy "Users can insert own analytics events"
  on public.analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id);

revoke all on public.analytics_events from anon, authenticated;
grant insert (event_name, user_id, post_id, metadata) on public.analytics_events to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Function privileges
-- ---------------------------------------------------------------------------
-- IMPORTANT: Supabase sets default privileges that grant EXECUTE on new
-- functions in `public` to anon and authenticated explicitly. A
-- `revoke all ... from public` does NOT remove those role grants, so every
-- internal function has to be revoked from anon and authenticated by name.
-- Without this, grant_credits is reachable over PostgREST as
-- POST /rest/v1/rpc/grant_credits — an unlimited credit mint.
--
-- Trigger functions do not need EXECUTE granted to the calling role; the
-- privilege is checked when the trigger is created, not when it fires.

-- Revoked by name across every overload, skipping anything not installed yet:
--   grant_credits   the ledger writer — the credit mint
--   spend_credits   takes an arbitrary reason, so a caller could write a
--                   negative 'engagement_like' row and reset a post's
--                   engagement cap. purchase_boost is the only spend path used.
--   the rest        trigger bodies and internal helpers, which need no EXECUTE
--                   grant to fire and should not be callable as RPC
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'grant_credits',
        'spend_credits',
        'handle_new_user',
        'award_post_credits',
        'award_like_credits',
        'award_save_credits',
        'award_referral_credits',
        'claw_back_post_credits',
        'enforce_post_create_rules',
        'sync_product_link_normalized',
        'sync_like_count',
        'sync_save_count',
        'notify_post_engagement',
        'resolve_referrer',
        'expire_finished_boosts'
      )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated', r.sig
    );
    raise notice 'revoked execute: %', r.sig;
  end loop;
end
$$;

-- Deliberately reachable. Each one is read-only for the caller's own rows,
-- validates ownership internally, or is a pure helper used in UI copy.
-- Granted by name so a file that hasn't been run yet is skipped rather than
-- aborting the script.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, t.roles
    from (values
      ('my_credit_summary',    'authenticated'),
      ('my_spendable_credits', 'authenticated'),
      ('my_earned_today',      'authenticated'),
      ('my_referral_summary',  'authenticated'),
      ('purchase_boost',       'authenticated'),
      ('email_for_username',   'anon, authenticated'),
      ('record_impression',    'anon, authenticated'),
      ('record_link_click',    'anon, authenticated'),
      ('normalize_product_url', 'anon, authenticated'),
      ('daily_earn_cap',       'anon, authenticated'),
      ('is_earn_reason',       'anon, authenticated')
    ) as t(fn, roles)
    join pg_proc p on p.proname = t.fn
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  loop
    execute format('grant execute on function %s to %s', r.sig, r.roles);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 11) Storage
-- ---------------------------------------------------------------------------
-- Both buckets are public-read (media is embedded in pages and OG cards) and
-- write-restricted to <user-id>/<file>, so nobody can overwrite or delete
-- someone else's upload.

update storage.buckets set public = true
where id in ('product-images', 'profile-photos');

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

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
  )
  with check (
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

drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

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
  )
  with check (
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

-- ---------------------------------------------------------------------------
-- 12) Verification
-- ---------------------------------------------------------------------------
-- The SQL Editor shows the last result set. Expect RLS = true on every row and
-- a policy count of at least 1 everywhere except impressions and link_clicks,
-- which are intentionally policy-free (definer RPCs only).

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.polname) as policies,
  coalesce(
    string_agg(distinct p.polcmd::text, ',' order by p.polcmd::text),
    '—'
  ) as commands
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;

-- Useful follow-ups when auditing by hand:
--
--   -- Every policy, in full:
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, policyname;
--
--   -- Who can execute what (should list no internal credit functions):
--   select p.proname, r.rolname, has_function_privilege(r.rolname, p.oid, 'execute')
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   cross join (select rolname from pg_roles where rolname in ('anon','authenticated')) r
--   where n.nspname = 'public' and p.prokind = 'f'
--   order by p.proname, r.rolname;
--
--   -- Column-level write grants on posts and users:
--   select table_name, column_name, privilege_type, grantee
--   from information_schema.column_privileges
--   where table_schema = 'public'
--     and table_name in ('posts', 'users')
--     and grantee in ('anon', 'authenticated')
--   order by table_name, grantee, privilege_type, column_name;
