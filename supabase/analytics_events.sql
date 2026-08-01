-- Product analytics events for Creators Connection.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Clients may insert their own rows only. There is no select/update/delete
-- policy for anon/authenticated — query this table in the dashboard with the
-- service role (or a future admin path).

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references public.users (id) on delete set null,
  -- No FK to posts: delete events should keep the post id after the row is gone.
  post_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check check (
    event_name in (
      'sign_up',
      'log_in',
      'post_upload',
      'post_like',
      'post_save',
      'post_delete'
    )
  )
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_name_created_at_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

alter table public.analytics_events enable row level security;

drop policy if exists "Users can insert own analytics events" on public.analytics_events;
create policy "Users can insert own analytics events"
  on public.analytics_events for insert
  to authenticated
  with check (auth.uid() = user_id);

grant insert on public.analytics_events to authenticated;

notify pgrst, 'reload schema';
