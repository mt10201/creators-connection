-- Phase 1: spending earned credits on boosts.
-- Run in the Supabase SQL Editor after schema.sql + credits_hybrid.sql.
-- Safe to re-run.
--
-- Rules:
--   • Boosts are bought with vested (spendable) credits only — no real money.
--   • Boosts never feed organic ranking; they only fill reserved, labeled rails.
--   • Caps: 1 active boost per post, 2 concurrent per account, 3 purchases/24h.
--   • Explore spotlight slots stay OFF (feed_config.boost_slots_enabled = false).

-- ---------------------------------------------------------------------------
-- Ledger extension (credit_transactions.available_at is the vesting timestamp)
-- ---------------------------------------------------------------------------

alter table public.credit_transactions
  add column if not exists boost_id uuid;

-- ---------------------------------------------------------------------------
-- boost_products (config lives in the DB, not only in UI copy)
-- ---------------------------------------------------------------------------

create table if not exists public.boost_products (
  slug text primary key,
  name text not null,
  description text not null,
  cost_credits integer not null check (cost_credits > 0),
  duration_hours integer not null check (duration_hours > 0),
  scope text not null,
  label text not null default 'Boosted',
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.boost_products (
  slug, name, description, cost_credits, duration_hours, scope, label, enabled, sort_order
)
values
  (
    'fresh_push',
    'Fresh Push',
    'Places your post in a labeled Just landed strip on Explore for 6 hours. Available on posts under 24 hours old.',
    2, 6, 'explore_first_page', 'Boosted', true, 10
  ),
  (
    'home_feature',
    'Home Feature',
    'Adds your post to the homepage rotating banner for 24 hours.',
    6, 24, 'home_banner', 'Featured', true, 20
  ),
  (
    'explore_spotlight',
    'Explore Spotlight',
    'Reserved spotlight slot in Explore. Not available yet.',
    10, 24, 'explore_spotlight', 'Spotlight', false, 30
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  cost_credits = excluded.cost_credits,
  duration_hours = excluded.duration_hours,
  scope = excluded.scope,
  label = excluded.label,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

alter table public.boost_products enable row level security;

drop policy if exists "Boost products are viewable by everyone" on public.boost_products;
create policy "Boost products are viewable by everyone"
  on public.boost_products for select
  using (true);

-- No insert/update/delete policies: catalog is admin/SQL managed.

-- ---------------------------------------------------------------------------
-- feed_config (single row)
-- ---------------------------------------------------------------------------

create table if not exists public.feed_config (
  id integer primary key default 1 check (id = 1),
  boost_slots_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.feed_config (id, boost_slots_enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.feed_config enable row level security;

drop policy if exists "Feed config is viewable by everyone" on public.feed_config;
create policy "Feed config is viewable by everyone"
  on public.feed_config for select
  using (true);

-- ---------------------------------------------------------------------------
-- boosts
-- ---------------------------------------------------------------------------

create table if not exists public.boosts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  product_slug text not null references public.boost_products (slug),
  scope text not null,
  label text not null default 'Boosted',
  cost_credits integer not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists boosts_post_id_idx on public.boosts (post_id);
create index if not exists boosts_user_id_idx on public.boosts (user_id, created_at desc);
create index if not exists boosts_active_idx on public.boosts (scope, ends_at desc)
  where status = 'active';

-- Fresh Push uses reserved Explore slots (legacy just_landed scope remapped).
update public.boosts set scope = 'explore_first_page' where scope = 'just_landed';

alter table public.boosts enable row level security;

drop policy if exists "Users can view own boosts" on public.boosts;
create policy "Users can view own boosts"
  on public.boosts for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update policies: purchase_boost() is the only writer.

alter table public.credit_transactions
  drop constraint if exists credit_transactions_boost_id_fkey;
alter table public.credit_transactions
  add constraint credit_transactions_boost_id_fkey
  foreign key (boost_id) references public.boosts (id) on delete set null;

-- Public, non-sensitive projection so rails and labels work for signed-out
-- visitors. Runs as owner so it can bypass the owner-only policy above.
drop view if exists public.active_boosts;
create view public.active_boosts
with (security_invoker = false) as
select
  b.id,
  b.post_id,
  b.product_slug,
  b.scope,
  b.label,
  b.starts_at,
  b.ends_at
from public.boosts b
where b.status = 'active'
  and b.ends_at > now();

grant select on public.active_boosts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Balance helper: spendable (vested) vs vesting (pending)
-- ---------------------------------------------------------------------------

create or replace function public.my_credit_summary()
returns table (
  spendable integer,
  vesting integer,
  total integer,
  next_vesting_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(amount) filter (where available_at <= now()), 0)::integer as spendable,
    coalesce(sum(amount) filter (where available_at > now()), 0)::integer as vesting,
    coalesce(sum(amount), 0)::integer as total,
    min(available_at) filter (where available_at > now()) as next_vesting_at
  from public.credit_transactions
  where user_id = auth.uid();
$$;

revoke all on function public.my_credit_summary() from public;
grant execute on function public.my_credit_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- purchase_boost (atomic, owner-only, vested credits only)
-- ---------------------------------------------------------------------------

create or replace function public.purchase_boost(
  p_post_id uuid,
  p_product_slug text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.boost_products%rowtype;
  v_post public.posts%rowtype;
  v_slots_enabled boolean;
  v_spendable integer;
  v_active_for_post integer;
  v_active_for_user integer;
  v_recent_purchases integer;
  v_boost_id uuid;
  v_ends_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'BOOST_NOT_AUTHENTICATED';
  end if;

  select * into v_product
  from public.boost_products
  where slug = p_product_slug;

  if not found or not v_product.enabled then
    raise exception 'BOOST_PRODUCT_UNAVAILABLE';
  end if;

  -- Explore spotlight slots stay off until feed_config flips.
  if v_product.scope = 'explore_spotlight' then
    select boost_slots_enabled into v_slots_enabled from public.feed_config where id = 1;
    if not coalesce(v_slots_enabled, false) then
      raise exception 'BOOST_SLOTS_DISABLED';
    end if;
  end if;

  select * into v_post
  from public.posts
  where id = p_post_id;

  if not found then
    raise exception 'BOOST_POST_NOT_FOUND';
  end if;

  if v_post.creator_id is distinct from v_user_id then
    raise exception 'BOOST_NOT_POST_OWNER';
  end if;

  if coalesce(v_post.status, 'active') <> 'active' then
    raise exception 'BOOST_POST_NOT_ACTIVE';
  end if;

  -- Eligibility: a boost must point at a complete, viewable post.
  if coalesce(array_length(v_post.media_urls, 1), 0) < 1 then
    raise exception 'BOOST_POST_NEEDS_IMAGE';
  end if;

  -- One error per field so the modal can name what's actually missing.
  -- Columns are product_title / product_link (not title / product_url).
  if coalesce(length(trim(v_post.product_title)), 0) < 1 then
    raise exception 'BOOST_POST_NEEDS_TITLE';
  end if;

  if coalesce(length(trim(v_post.description)), 0) < 20 then
    raise exception 'BOOST_POST_NEEDS_DESCRIPTION';
  end if;

  if coalesce(trim(v_post.product_link), '') !~* '^https?://\S+$' then
    raise exception 'BOOST_POST_NEEDS_LINK';
  end if;

  -- Cap: one active boost per post.
  select count(*)::integer into v_active_for_post
  from public.boosts
  where post_id = p_post_id
    and status = 'active'
    and ends_at > now();

  if v_active_for_post >= 1 then
    raise exception 'BOOST_POST_ALREADY_BOOSTED';
  end if;

  -- Cap: two concurrent active boosts per account.
  select count(*)::integer into v_active_for_user
  from public.boosts
  where user_id = v_user_id
    and status = 'active'
    and ends_at > now();

  if v_active_for_user >= 2 then
    raise exception 'BOOST_TOO_MANY_ACTIVE';
  end if;

  -- Cap: three purchases per rolling 24 hours.
  select count(*)::integer into v_recent_purchases
  from public.boosts
  where user_id = v_user_id
    and created_at > now() - interval '24 hours';

  if v_recent_purchases >= 3 then
    raise exception 'BOOST_DAILY_LIMIT';
  end if;

  -- Lock the profile so two purchases in flight cannot both pass the check.
  perform 1 from public.users where id = v_user_id for update;

  select coalesce(sum(amount), 0)::integer into v_spendable
  from public.credit_transactions
  where user_id = v_user_id
    and available_at <= now();

  if v_spendable < v_product.cost_credits then
    raise exception 'BOOST_INSUFFICIENT_CREDITS';
  end if;

  v_ends_at := now() + make_interval(hours => v_product.duration_hours);

  insert into public.boosts (
    post_id, user_id, product_slug, scope, label, cost_credits, status, starts_at, ends_at
  )
  values (
    p_post_id, v_user_id, v_product.slug, v_product.scope, v_product.label,
    v_product.cost_credits, 'active', now(), v_ends_at
  )
  returning id into v_boost_id;

  -- Spends are immediately effective (available_at = now), never vesting.
  insert into public.credit_transactions (
    user_id, amount, reason, post_id, boost_id, available_at
  )
  values (
    v_user_id, -v_product.cost_credits, 'boost_purchase', p_post_id, v_boost_id, now()
  );

  update public.users
  set credit_balance = coalesce(credit_balance, 0) - v_product.cost_credits
  where id = v_user_id;

  return jsonb_build_object(
    'boost_id', v_boost_id,
    'product_slug', v_product.slug,
    'label', v_product.label,
    'cost_credits', v_product.cost_credits,
    'ends_at', v_ends_at,
    'spendable_after', v_spendable - v_product.cost_credits
  );
end;
$$;

revoke all on function public.purchase_boost(uuid, text) from public;
grant execute on function public.purchase_boost(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies; these just make the tables reachable)
-- ---------------------------------------------------------------------------

grant select on public.boost_products to anon, authenticated;
grant select on public.feed_config to anon, authenticated;
grant select on public.boosts to authenticated;

-- Optional housekeeping: flip finished boosts so history reads cleanly.
-- Rails already filter on ends_at, so this is cosmetic.
create or replace function public.expire_finished_boosts()
returns integer
language sql
security definer
set search_path = public
as $$
  with done as (
    update public.boosts
    set status = 'expired'
    where status = 'active'
      and ends_at <= now()
    returning 1
  )
  select count(*)::integer from done;
$$;

revoke all on function public.expire_finished_boosts() from public;

notify pgrst, 'reload schema';
