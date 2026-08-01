-- Notifications for Creators Connection.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Rows are written only by the triggers at the bottom, never by the app, so a
-- user cannot fabricate a notification. Engagement on a deleted post is
-- meaningless, so notifications follow the post out of the database.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- Who receives it: the post owner.
  user_id uuid not null references public.users (id) on delete cascade,
  -- Who caused it: the person who liked or saved.
  actor_id uuid not null references public.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  type text not null check (type in ('like', 'save')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where not read;

-- One row per person per post per kind. Without this, unliking and liking
-- again would ping the owner over and over.
create unique index if not exists notifications_unique_event
  on public.notifications (user_id, actor_id, post_id, type);

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

-- Deliberately no insert policy: only the triggers below may write here.
--
-- RLS cannot limit *which* columns an update touches, so a column grant does
-- it instead: marking as read is the only change a user may make.
revoke update on public.notifications from anon, authenticated;
grant update (read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Notify the post owner when someone likes or saves their work
-- ---------------------------------------------------------------------------

create or replace function public.notify_post_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select creator_id into v_owner
  from public.posts
  where id = new.post_id;

  -- Nobody gets told about their own likes and saves.
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, post_id, type)
  values (
    v_owner,
    new.user_id,
    new.post_id,
    case tg_table_name when 'likes' then 'like' else 'save' end
  )
  on conflict (user_id, actor_id, post_id, type) do nothing;

  return new;
end;
$$;

drop trigger if exists on_like_notify on public.likes;
create trigger on_like_notify
  after insert on public.likes
  for each row
  execute function public.notify_post_engagement();

drop trigger if exists on_save_notify on public.saves;
create trigger on_save_notify
  after insert on public.saves
  for each row
  execute function public.notify_post_engagement();

notify pgrst, 'reload schema';
