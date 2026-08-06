-- Referral rewards (MVP) for Creators Connection.
-- Run in the Supabase SQL Editor AFTER credits_hybrid.sql and fairness_caps.sql
-- (it redefines handle_new_user and is_earn_reason, which those files also
-- define — this file must be the last of the three to run).
-- Safe to re-run.
--
-- Rules:
--   • Share link is /signup?ref=<username> (a raw user id also works)
--   • On signup the ref is resolved server-side into users.referred_by
--   • Self-referral and unknown refs store NULL
--   • The first post a referred user publishes pays the referrer +10 once,
--     ever, and gives the new maker +2
--   • Both grants go through grant_credits, so 24h vesting and the daily earn
--     cap apply exactly as they do everywhere else
--
-- Referral rewards are strictly ADDITIVE. A referred account still gets the
-- normal +5 signup_bonus and the normal +1 post_created for a first-time
-- product URL; nothing here removes, replaces or short-circuits those.
--
-- Ledger reasons written by this file (public.credit_transactions.reason):
--   'referral_bonus'   +10, user_id = referrer,      source_user_id = new maker
--   'referral_welcome'  +2, user_id = new maker,     source_user_id = referrer
-- Both carry post_id = the first post. There is no 'referred_signup' reason —
-- the referred user's signup credit is the standard 'signup_bonus'.
--
-- Boost pricing and organic ranking are untouched.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.users
  add column if not exists referred_by uuid references public.users (id) on delete set null;

create index if not exists users_referred_by_idx
  on public.users (referred_by);

-- One row per referred user, inserted when their first post pays out. Keyed on
-- the referred user so the bonus can never repeat, even if that post is later
-- deleted and another is published.
create table if not exists public.referral_credit_claims (
  referred_user_id uuid primary key references public.users (id) on delete cascade,
  referrer_id uuid not null references public.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists referral_credit_claims_referrer_idx
  on public.referral_credit_claims (referrer_id);

alter table public.referral_credit_claims enable row level security;

drop policy if exists "Referrers can view own referral claims" on public.referral_credit_claims;
create policy "Referrers can view own referral claims"
  on public.referral_credit_claims for select
  to authenticated
  using (auth.uid() = referrer_id);

-- No insert/update/delete policies: only security definer functions write claims.

-- ---------------------------------------------------------------------------
-- Referral payouts count toward the daily earn cap
-- ---------------------------------------------------------------------------
-- Redefines the fairness_caps.sql version with the two referral reasons added.

create or replace function public.is_earn_reason(p_reason text)
returns boolean
language sql
immutable
as $$
  select p_reason in (
    'signup_bonus',
    'post_created',
    'engagement_like',
    'engagement_save',
    'referral_bonus',
    'referral_welcome'
  )
$$;

grant execute on function public.is_earn_reason(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Resolve ?ref= at signup
-- ---------------------------------------------------------------------------
-- The client only ever sends the raw string from the URL; the referrer is
-- looked up here so a caller cannot set referred_by to an arbitrary id.

create or replace function public.resolve_referrer(p_ref text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ref text := nullif(trim(coalesce(p_ref, '')), '');
  v_referrer uuid;
begin
  if v_ref is null then
    return null;
  end if;

  if v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into v_referrer
    from public.users
    where id = v_ref::uuid;
  else
    select id into v_referrer
    from public.users
    where lower(username) = lower(v_ref)
    limit 1;
  end if;

  return v_referrer;
end;
$$;

revoke all on function public.resolve_referrer(text) from public;

-- Signup bonus (+5) plus referral attribution. Mirrors credits_hybrid.sql and
-- adds referred_by.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
begin
  v_referrer := public.resolve_referrer(new.raw_user_meta_data ->> 'referred_by');

  -- A brand new account cannot be its own referrer, but guard anyway.
  if v_referrer = new.id then
    v_referrer := null;
  end if;

  insert into public.users (id, username, email, credit_balance, referred_by)
  values (
    new.id,
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'username',
        new.raw_user_meta_data ->> 'full_name'
      ),
      ''
    ),
    new.email,
    0,
    v_referrer
  )
  on conflict (id) do nothing;

  -- Unique index on signup_bonus makes a double claim impossible.
  perform public.grant_credits(new.id, 5, 'signup_bonus', null, null);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- First post by a referred user pays the referrer
-- ---------------------------------------------------------------------------
-- Separate from award_post_credits so the +1-per-new-URL logic stays in one
-- place. Postgres runs per-row triggers in alphabetical order by name, and
-- 'on_post_created_award_credits' sorts before 'on_post_created_award_referral',
-- so the referred maker banks their normal post credit first and the referral
-- top-up can never consume the daily cap ahead of it.

create or replace function public.award_referral_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
begin
  if new.creator_id is null then
    return new;
  end if;

  select referred_by into v_referrer
  from public.users
  where id = new.creator_id;

  if v_referrer is null or v_referrer = new.creator_id then
    return new;
  end if;

  begin
    insert into public.referral_credit_claims (referred_user_id, referrer_id, post_id)
    values (new.creator_id, v_referrer, new.id);
  exception
    when unique_violation then
      -- This maker's first post already paid out.
      return new;
  end;

  perform public.grant_credits(
    v_referrer,
    10,
    'referral_bonus',
    new.id,
    new.creator_id
  );

  perform public.grant_credits(
    new.creator_id,
    2,
    'referral_welcome',
    new.id,
    v_referrer
  );

  return new;
end;
$$;

drop trigger if exists on_post_created_award_referral on public.posts;
create trigger on_post_created_award_referral
  after insert on public.posts
  for each row
  execute function public.award_referral_credits();

-- ---------------------------------------------------------------------------
-- Referral summary for the signed-in user
-- ---------------------------------------------------------------------------

create or replace function public.my_referral_summary()
returns table (
  signed_up integer,
  activated integer,
  credits_earned integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::integer
      from public.users
      where referred_by = auth.uid()
    ) as signed_up,
    (
      select count(*)::integer
      from public.referral_credit_claims
      where referrer_id = auth.uid()
    ) as activated,
    (
      select coalesce(sum(amount), 0)::integer
      from public.credit_transactions
      where user_id = auth.uid()
        and reason = 'referral_bonus'
    ) as credits_earned;
$$;

revoke all on function public.my_referral_summary() from public;
grant execute on function public.my_referral_summary() to authenticated;

notify pgrst, 'reload schema';
