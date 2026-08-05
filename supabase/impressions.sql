-- Step B: impression + outbound link-click logging, organic vs boosted split.
-- Run in the Supabase SQL Editor after schema.sql, boosts.sql, ranking.sql.
-- Safe to re-run.
--
-- Boosted impressions are counted in their own column and never feed an
-- organic quality signal. Ranking (lib/ranking.ts) reads likes and saves only.

-- ---------------------------------------------------------------------------
-- Counters on posts
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists organic_impressions bigint not null default 0;
alter table public.posts
  add column if not exists boosted_impressions bigint not null default 0;
alter table public.posts
  add column if not exists link_clicks bigint not null default 0;

alter table public.boosts
  add column if not exists impressions_delivered bigint not null default 0;

-- ---------------------------------------------------------------------------
-- impressions
-- ---------------------------------------------------------------------------
-- viewer_key is the signed-in user id, or an anonymous per-browser key.
-- hour_bucket collapses refresh spam: one row per viewer/post/surface/hour.

create table if not exists public.impressions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_key text not null,
  surface text not null,
  is_boosted boolean not null default false,
  hour_bucket timestamptz not null default date_trunc('hour', now()),
  created_at timestamptz not null default now(),
  constraint impressions_surface_check
    check (surface in ('explore', 'just_landed', 'home_banner', 'product'))
);

create unique index if not exists impressions_dedupe_idx
  on public.impressions (post_id, viewer_key, surface, hour_bucket);

create index if not exists impressions_post_idx
  on public.impressions (post_id, created_at desc);

alter table public.impressions enable row level security;
-- No policies: only the security definer RPCs below may read or write.

-- ---------------------------------------------------------------------------
-- link_clicks
-- ---------------------------------------------------------------------------

create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_key text not null,
  is_boosted boolean not null default false,
  hour_bucket timestamptz not null default date_trunc('hour', now()),
  created_at timestamptz not null default now()
);

create unique index if not exists link_clicks_dedupe_idx
  on public.link_clicks (post_id, viewer_key, hour_bucket);

create index if not exists link_clicks_post_idx
  on public.link_clicks (post_id, created_at desc);

alter table public.link_clicks enable row level security;
-- No policies: only the security definer RPC below may read or write.

-- ---------------------------------------------------------------------------
-- record_impression
-- ---------------------------------------------------------------------------
-- Returns true only when a new row was stored, so counters stay in step with
-- the deduped table. Callers may be anonymous.

create or replace function public.record_impression(
  p_post_id uuid,
  p_viewer_key text,
  p_surface text,
  p_is_boosted boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(p_viewer_key), '');
  v_boosted boolean := coalesce(p_is_boosted, false);
  v_inserted uuid;
begin
  if p_post_id is null or v_key is null then
    return false;
  end if;

  if p_surface not in ('explore', 'just_landed', 'home_banner', 'product') then
    return false;
  end if;

  -- Cheap abuse guard: an oversized key is not a real session id.
  if length(v_key) > 100 then
    return false;
  end if;

  if not exists (select 1 from public.posts where id = p_post_id) then
    return false;
  end if;

  insert into public.impressions (post_id, viewer_key, surface, is_boosted)
  values (p_post_id, v_key, p_surface, v_boosted)
  on conflict (post_id, viewer_key, surface, hour_bucket) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return false;
  end if;

  if v_boosted then
    update public.posts
    set boosted_impressions = coalesce(boosted_impressions, 0) + 1
    where id = p_post_id;

    -- Attribute delivery to the boost that is currently running this surface.
    update public.boosts
    set impressions_delivered = coalesce(impressions_delivered, 0) + 1
    where id = (
      select b.id
      from public.boosts b
      where b.post_id = p_post_id
        and b.status = 'active'
        and b.ends_at > now()
      order by b.starts_at desc
      limit 1
    );
  else
    update public.posts
    set organic_impressions = coalesce(organic_impressions, 0) + 1
    where id = p_post_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_impression(uuid, text, text, boolean) from public;
grant execute on function public.record_impression(uuid, text, text, boolean)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_link_click
-- ---------------------------------------------------------------------------

create or replace function public.record_link_click(
  p_post_id uuid,
  p_viewer_key text,
  p_is_boosted boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := nullif(trim(p_viewer_key), '');
  v_inserted uuid;
begin
  if p_post_id is null or v_key is null or length(v_key) > 100 then
    return false;
  end if;

  if not exists (select 1 from public.posts where id = p_post_id) then
    return false;
  end if;

  insert into public.link_clicks (post_id, viewer_key, is_boosted)
  values (p_post_id, v_key, coalesce(p_is_boosted, false))
  on conflict (post_id, viewer_key, hour_bucket) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return false;
  end if;

  update public.posts
  set link_clicks = coalesce(link_clicks, 0) + 1
  where id = p_post_id;

  return true;
end;
$$;

revoke all on function public.record_link_click(uuid, text, boolean) from public;
grant execute on function public.record_link_click(uuid, text, boolean)
  to anon, authenticated;

notify pgrst, 'reload schema';
