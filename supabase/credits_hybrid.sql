-- Hybrid credit system for Creators Connection.
-- Run in the Supabase SQL Editor after schema.sql / likes_saves.sql / post_delete_credits.sql.
-- Safe to re-run.
--
-- Rules:
--   • Signup +5 once (24h vesting)
--   • Post +1 only the first time a user posts a normalized product URL
--   • Like → +1 to owner (max +10/post); Save → +2 to owner (max +10/post)
--   • No self-engagement credits; no duplicate engagement grants
--   • Credits spendable only after available_at (24h vesting)
--   • Max 10 posts per user per day (same limit for new and existing accounts)

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

alter table public.credit_transactions
  add column if not exists available_at timestamptz;

alter table public.credit_transactions
  add column if not exists source_user_id uuid references public.users (id) on delete set null;

-- Existing ledger rows are already "earned"; treat them as immediately spendable.
update public.credit_transactions
set available_at = created_at
where available_at is null;

alter table public.credit_transactions
  alter column available_at set not null;

alter table public.credit_transactions
  alter column available_at set default now();

alter table public.posts
  add column if not exists product_link_normalized text;

create index if not exists posts_creator_normalized_url_idx
  on public.posts (creator_id, product_link_normalized);

create index if not exists credit_transactions_post_id_idx
  on public.credit_transactions (post_id);

create index if not exists credit_transactions_available_at_idx
  on public.credit_transactions (user_id, available_at);

-- Survives post delete so the same URL never pays out again.
create table if not exists public.post_url_credit_claims (
  user_id uuid not null references public.users (id) on delete cascade,
  normalized_url text not null,
  post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, normalized_url)
);

alter table public.post_url_credit_claims enable row level security;

drop policy if exists "Users can view own url credit claims" on public.post_url_credit_claims;
create policy "Users can view own url credit claims"
  on public.post_url_credit_claims for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies: only security definer functions write claims.

create unique index if not exists credit_transactions_signup_bonus_once
  on public.credit_transactions (user_id)
  where reason = 'signup_bonus';

create unique index if not exists credit_transactions_engagement_once
  on public.credit_transactions (post_id, reason, source_user_id)
  where reason in ('engagement_like', 'engagement_save')
    and source_user_id is not null
    and post_id is not null;

-- ---------------------------------------------------------------------------
-- URL normalization (trim, lowercase host, strip common tracking params)
-- ---------------------------------------------------------------------------

create or replace function public.normalize_product_url(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  v_raw text;
  v_scheme text;
  v_rest text;
  v_authority text;
  v_host text;
  v_port text;
  v_path text := '';
  v_query text := '';
  v_path_pos int;
  v_query_pos int;
  v_param text;
  v_key text;
  v_kept text[] := '{}';
begin
  if p_url is null then
    return null;
  end if;

  v_raw := trim(p_url);
  if v_raw = '' then
    return null;
  end if;

  if v_raw !~* '^https?://[^[:space:]]+$' then
    return null;
  end if;

  -- Drop fragment.
  if position('#' in v_raw) > 0 then
    v_raw := left(v_raw, position('#' in v_raw) - 1);
  end if;

  v_scheme := lower(split_part(v_raw, '://', 1));
  if v_scheme not in ('http', 'https') then
    return null;
  end if;

  v_rest := substr(v_raw, length(v_scheme) + 4);
  if v_rest is null or v_rest = '' then
    return null;
  end if;

  v_path_pos := position('/' in v_rest);
  v_query_pos := position('?' in v_rest);

  if v_path_pos = 0 and v_query_pos = 0 then
    v_authority := v_rest;
  elsif v_query_pos > 0 and (v_path_pos = 0 or v_query_pos < v_path_pos) then
    v_authority := left(v_rest, v_query_pos - 1);
    v_query := substr(v_rest, v_query_pos + 1);
  else
    v_authority := left(v_rest, v_path_pos - 1);
    v_rest := substr(v_rest, v_path_pos);
    v_query_pos := position('?' in v_rest);
    if v_query_pos > 0 then
      v_path := left(v_rest, v_query_pos - 1);
      v_query := substr(v_rest, v_query_pos + 1);
    else
      v_path := v_rest;
    end if;
  end if;

  if position('@' in v_authority) > 0 then
    v_authority := split_part(v_authority, '@', 2);
  end if;

  if v_authority is null or v_authority = '' then
    return null;
  end if;

  if v_authority ~ ':\d+$' then
    v_host := lower(regexp_replace(v_authority, ':\d+$', ''));
    v_port := substring(v_authority from ':(\d+)$');
    if (v_scheme = 'http' and v_port = '80')
       or (v_scheme = 'https' and v_port = '443') then
      v_port := null;
    end if;
  else
    v_host := lower(v_authority);
    v_port := null;
  end if;

  if v_host is null or v_host = '' or position(':' in v_host) > 0 then
    return null;
  end if;

  if v_path = '/' then
    v_path := '';
  elsif length(v_path) > 1 and right(v_path, 1) = '/' then
    v_path := left(v_path, length(v_path) - 1);
  end if;

  if v_query <> '' then
    foreach v_param in array string_to_array(v_query, '&')
    loop
      if v_param is null or v_param = '' then
        continue;
      end if;

      v_key := lower(split_part(v_param, '=', 1));
      if v_key = '' then
        continue;
      end if;

      if v_key like 'utm_%'
         or v_key in (
           'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid',
           'li_fat_id', 'mc_eid', 'mc_cid', '_ga', '_gl', 'igshid',
           'ref', 'referrer', 'fb_action_ids', 'fb_action_types', 'fb_source'
         ) then
        continue;
      end if;

      v_kept := array_append(v_kept, v_param);
    end loop;
  end if;

  return v_scheme
    || '://'
    || v_host
    || case when v_port is not null then ':' || v_port else '' end
    || coalesce(v_path, '')
    || case
         when cardinality(v_kept) > 0 then '?' || array_to_string(v_kept, '&')
         else ''
       end;
end;
$$;

revoke all on function public.normalize_product_url(text) from public;
grant execute on function public.normalize_product_url(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Core ledger write (security definer only)
-- ---------------------------------------------------------------------------

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
begin
  if p_user_id is null or p_amount is null or p_amount = 0 then
    return false;
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'CREDIT_INVALID_REASON';
  end if;

  -- Positive grants vest for 24h; clawbacks/spends affect spendable immediately.
  if p_amount > 0 then
    v_available_at := now() + interval '24 hours';
  else
    v_available_at := now();
  end if;

  insert into public.credit_transactions (
    user_id, amount, reason, post_id, source_user_id, available_at
  )
  values (
    p_user_id, p_amount, p_reason, p_post_id, p_source_user_id, v_available_at
  );

  update public.users
  set credit_balance = coalesce(credit_balance, 0) + p_amount
  where id = p_user_id;

  return true;
exception
  when unique_violation then
    -- Signup / engagement uniqueness — treat as already granted.
    return false;
end;
$$;

revoke all on function public.grant_credits(uuid, integer, text, uuid, uuid) from public;

-- Spendable = ledger rows whose available_at has passed (includes negative spends).
create or replace function public.my_spendable_credits()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_transactions
  where user_id = auth.uid()
    and available_at <= now();
$$;

revoke all on function public.my_spendable_credits() from public;
grant execute on function public.my_spendable_credits() to authenticated;

-- Future boost/spend path: only spendable credits may be used.
create or replace function public.spend_credits(
  p_amount integer,
  p_reason text,
  p_post_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_spendable integer;
begin
  if v_user_id is null then
    raise exception 'CREDIT_NOT_AUTHENTICATED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'CREDIT_INVALID_AMOUNT';
  end if;

  select coalesce(sum(amount), 0)::integer
  into v_spendable
  from public.credit_transactions
  where user_id = v_user_id
    and available_at <= now();

  if v_spendable < p_amount then
    raise exception 'CREDIT_INSUFFICIENT_SPENDABLE';
  end if;

  return public.grant_credits(v_user_id, -p_amount, p_reason, p_post_id, null);
end;
$$;

revoke all on function public.spend_credits(integer, text, uuid) from public;
grant execute on function public.spend_credits(integer, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Signup bonus (+5 once)
-- ---------------------------------------------------------------------------

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
-- Post create: validate URL, rate limits, normalize, award +1 once per URL
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_create_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_posts_today integer;
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;

  -- Never trust client-supplied creator_id over the session.
  if auth.uid() is null or new.creator_id is distinct from auth.uid() then
    raise exception 'CREDIT_CREATOR_MISMATCH';
  end if;

  v_normalized := public.normalize_product_url(new.product_link);
  if v_normalized is null then
    raise exception 'CREDIT_PRODUCT_URL_REQUIRED';
  end if;

  new.product_link := trim(new.product_link);
  new.product_link_normalized := v_normalized;

  select count(*)::integer
  into v_posts_today
  from public.posts
  where creator_id = new.creator_id
    and created_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';

  if v_posts_today >= 10 then
    raise exception 'CREDIT_RATE_LIMIT_DAILY: You can post up to 10 products per day. Please try again tomorrow.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_post_before_insert_credit_rules on public.posts;
create trigger on_post_before_insert_credit_rules
  before insert on public.posts
  for each row
  execute function public.enforce_post_create_rules();

-- Keep normalized URL in sync on edit; never awards credits.
create or replace function public.sync_product_link_normalized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  if new.product_link is not distinct from old.product_link
     and new.product_link_normalized is not null then
    return new;
  end if;

  v_normalized := public.normalize_product_url(new.product_link);
  if v_normalized is null then
    raise exception 'CREDIT_PRODUCT_URL_REQUIRED';
  end if;

  new.product_link := trim(new.product_link);
  new.product_link_normalized := v_normalized;
  return new;
end;
$$;

drop trigger if exists on_post_before_update_normalize_url on public.posts;
create trigger on_post_before_update_normalize_url
  before update of product_link on public.posts
  for each row
  execute function public.sync_product_link_normalized();

-- Edits must not re-award; only first qualifying create claims the URL.
create or replace function public.award_post_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  v_normalized := coalesce(
    new.product_link_normalized,
    public.normalize_product_url(new.product_link)
  );

  if v_normalized is null or new.creator_id is null then
    return new;
  end if;

  begin
    insert into public.post_url_credit_claims (user_id, normalized_url, post_id)
    values (new.creator_id, v_normalized, new.id);
  exception
    when unique_violation then
      -- Same user + same normalized URL already claimed.
      return new;
  end;

  perform public.grant_credits(
    new.creator_id,
    1,
    'post_created',
    new.id,
    null
  );

  return new;
end;
$$;

drop trigger if exists on_post_created_award_credits on public.posts;
create trigger on_post_created_award_credits
  after insert on public.posts
  for each row
  execute function public.award_post_credits();

-- ---------------------------------------------------------------------------
-- Engagement credits (like +1 / save +2 to owner, capped, no self-credit)
-- ---------------------------------------------------------------------------

create or replace function public.award_like_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_earned integer;
begin
  select creator_id into v_owner
  from public.posts
  where id = new.post_id;

  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  select coalesce(sum(amount), 0)::integer
  into v_earned
  from public.credit_transactions
  where post_id = new.post_id
    and reason = 'engagement_like';

  if v_earned >= 10 then
    return new;
  end if;

  perform public.grant_credits(
    v_owner,
    least(1, 10 - v_earned),
    'engagement_like',
    new.post_id,
    new.user_id
  );

  return new;
end;
$$;

create or replace function public.award_save_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_earned integer;
  v_grant integer;
begin
  select creator_id into v_owner
  from public.posts
  where id = new.post_id;

  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  select coalesce(sum(amount), 0)::integer
  into v_earned
  from public.credit_transactions
  where post_id = new.post_id
    and reason = 'engagement_save';

  -- Cap is +10 credits from saves (each save normally grants +2).
  if v_earned >= 10 then
    return new;
  end if;

  v_grant := least(2, 10 - v_earned);
  if v_grant <= 0 then
    return new;
  end if;

  perform public.grant_credits(
    v_owner,
    v_grant,
    'engagement_save',
    new.post_id,
    new.user_id
  );

  return new;
end;
$$;

drop trigger if exists likes_award_credits on public.likes;
create trigger likes_award_credits
  after insert on public.likes
  for each row
  execute function public.award_like_credits();

drop trigger if exists saves_award_credits on public.saves;
create trigger saves_award_credits
  after insert on public.saves
  for each row
  execute function public.award_save_credits();

-- ---------------------------------------------------------------------------
-- Clawback on post delete (post + engagement credits tied to the post)
-- ---------------------------------------------------------------------------

create or replace function public.claw_back_post_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outstanding integer;
  v_balance integer;
  v_clawback integer;
begin
  if old.creator_id is null then
    return old;
  end if;

  select coalesce(sum(amount), 0)
  into v_outstanding
  from public.credit_transactions
  where post_id = old.id
    and user_id = old.creator_id
    and reason in (
      'post_created',
      'post_deleted',
      'engagement_like',
      'engagement_save'
    );

  if v_outstanding <= 0 then
    return old;
  end if;

  select coalesce(credit_balance, 0)
  into v_balance
  from public.users
  where id = old.creator_id
  for update;

  if not found then
    return old;
  end if;

  v_clawback := least(v_outstanding, v_balance);
  if v_clawback <= 0 then
    return old;
  end if;

  perform public.grant_credits(
    old.creator_id,
    -v_clawback,
    'post_deleted',
    old.id,
    null
  );

  return old;
end;
$$;

drop trigger if exists on_post_deleted_claw_back_credits on public.posts;
create trigger on_post_deleted_claw_back_credits
  before delete on public.posts
  for each row
  execute function public.claw_back_post_credits();

notify pgrst, 'reload schema';
