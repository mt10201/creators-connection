-- Phase 1 organic ranking support.
-- Run in the Supabase SQL Editor after schema.sql and boosts.sql.
-- Safe to re-run.
--
-- Scoring itself happens at query time in the app (lib/ranking.ts) — no cron,
-- no materialised score column. This file only exposes the inputs it needs and
-- adds the Fresh Push recency rule.

-- ---------------------------------------------------------------------------
-- public_profiles: expose account age for the new-maker bonus
-- ---------------------------------------------------------------------------
-- Still no email and no credit_balance. created_at is account age only.

drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = false) as
select id, username, profile_photo, created_at
from public.users;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpful indexes for the candidate pull
-- ---------------------------------------------------------------------------

create index if not exists posts_active_created_at_idx
  on public.posts (created_at desc)
  where status = 'active';

create index if not exists posts_creator_created_at_idx
  on public.posts (creator_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Fresh Push: only posts published in the last 24 hours are eligible
-- ---------------------------------------------------------------------------
-- Enforced at purchase time so nobody spends credits on a boost that could
-- never show. The Explore strip applies the same 24h window when rendering.

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

  if coalesce(length(trim(v_post.product_title)), 0) < 3
     or coalesce(length(trim(v_post.description)), 0) < 20
     or coalesce(length(trim(v_post.product_link)), 0) = 0 then
    raise exception 'BOOST_POST_INCOMPLETE';
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

notify pgrst, 'reload schema';
