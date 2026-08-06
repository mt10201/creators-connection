-- Fairness caps: limit boost → engagement → credit feedback loops.
-- Run in the Supabase SQL Editor after credits_hybrid.sql, boosts.sql and
-- ranking.sql (it redefines grant_credits and purchase_boost).
-- Safe to re-run.
--
-- Two caps, nothing else changes:
--   1. A user can earn at most 12 credits per UTC day from all sources
--      combined (signup bonus, first-time post URLs, likes, saves).
--   2. A user can have at most 3 active boosts at once, any mix of Fresh Push
--      and Home Feature.
--
-- Vesting, per-action credit amounts, per-post engagement caps, organic
-- ranking and impression logging are all untouched.

-- ---------------------------------------------------------------------------
-- Constants
-- ---------------------------------------------------------------------------

-- Total credits a single account may earn in one UTC day.
create or replace function public.daily_earn_cap()
returns integer
language sql
immutable
as $$ select 12 $$;

grant execute on function public.daily_earn_cap() to anon, authenticated;

-- Only these reasons are "earning". Refunds, clawbacks and boost spends are
-- deliberately excluded so a correction can never be blocked by the cap.
create or replace function public.is_earn_reason(p_reason text)
returns boolean
language sql
immutable
as $$
  select p_reason in (
    'signup_bonus',
    'post_created',
    'engagement_like',
    'engagement_save'
  )
$$;

grant execute on function public.is_earn_reason(text) to anon, authenticated;

create index if not exists credit_transactions_user_created_at_idx
  on public.credit_transactions (user_id, created_at);

-- ---------------------------------------------------------------------------
-- 1) Daily earn cap, enforced in the single ledger writer
-- ---------------------------------------------------------------------------
-- Every earn path (signup trigger, post trigger, like/save triggers) funnels
-- through grant_credits, so capping here covers all sources at once.
--
-- Behaviour when the cap is reached: the grant is silently trimmed to what is
-- left for the day, or skipped entirely at zero. Callers use PERFORM and
-- ignore the return value, so likes and saves still succeed normally — the
-- viewer sees no error, the owner simply earns nothing more today.

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_post_id uuid default null,
  p_source_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_at timestamptz;
  v_amount integer := p_amount;
  v_earned_today integer;
  v_remaining integer;
  v_day_start timestamptz;
begin
  if p_user_id is null or p_amount is null or p_amount = 0 then
    return false;
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'CREDIT_INVALID_REASON';
  end if;

  if p_amount > 0 and public.is_earn_reason(p_reason) then
    v_day_start := date_trunc('day', now() at time zone 'utc') at time zone 'utc';

    select coalesce(sum(amount), 0)::integer
    into v_earned_today
    from public.credit_transactions
    where user_id = p_user_id
      and amount > 0
      and public.is_earn_reason(reason)
      and created_at >= v_day_start;

    v_remaining := public.daily_earn_cap() - v_earned_today;

    if v_remaining <= 0 then
      return false;
    end if;

    v_amount := least(p_amount, v_remaining);
  end if;

  -- Positive grants vest for 24h; clawbacks/spends affect spendable immediately.
  if v_amount > 0 then
    v_available_at := now() + interval '24 hours';
  else
    v_available_at := now();
  end if;

  insert into public.credit_transactions (
    user_id, amount, reason, post_id, source_user_id, available_at
  )
  values (
    p_user_id, v_amount, p_reason, p_post_id, p_source_user_id, v_available_at
  );

  update public.users
  set credit_balance = coalesce(credit_balance, 0) + v_amount
  where id = p_user_id;

  return true;
exception
  when unique_violation then
    -- Signup / engagement uniqueness — treat as already granted.
    return false;
end;
$$;

revoke all on function public.grant_credits(uuid, integer, text, uuid, uuid) from public;

-- ---------------------------------------------------------------------------
-- 2) Concurrent boost cap per creator
-- ---------------------------------------------------------------------------
-- Rule chosen: at most 3 active boosts per account at any moment, in any mix
-- of Fresh Push and Home Feature. One flat number is easier to explain in the
-- UI than a per-product matrix, and the existing 1-active-boost-per-post rule
-- already stops a single listing from taking all three.
--
-- The concurrent check runs before the rolling 24h purchase check so someone
-- at the ceiling is told to wait for a boost to end rather than being given a
-- rate-limit message.

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

  -- Fresh Push is a launch window: the post must be under 24 hours old.
  if v_product.scope = 'explore_first_page'
     and v_post.created_at < now() - interval '24 hours' then
    raise exception 'BOOST_POST_TOO_OLD';
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

  -- Cap: three concurrent active boosts per account, any product mix.
  select count(*)::integer into v_active_for_user
  from public.boosts
  where user_id = v_user_id
    and status = 'active'
    and ends_at > now();

  if v_active_for_user >= 3 then
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
-- Read-only helper so the UI can show today's remaining earn allowance
-- ---------------------------------------------------------------------------

create or replace function public.my_earned_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_transactions
  where user_id = auth.uid()
    and amount > 0
    and public.is_earn_reason(reason)
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

revoke all on function public.my_earned_today() from public;
grant execute on function public.my_earned_today() to authenticated;

notify pgrst, 'reload schema';
