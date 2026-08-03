-- Account self-deletion support.
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- posts.creator_id previously had no ON DELETE clause (NO ACTION), which blocks
-- deleting public.users / auth.users while posts remain. Cascade lets auth
-- deletion clean up posts if the app path is interrupted after auth delete.
-- Prefer deleting posts first in the app so storage cleanup and credit clawback
-- still run normally.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'posts'
      and constraint_name = 'posts_creator_id_fkey'
  ) then
    alter table public.posts drop constraint posts_creator_id_fkey;
  end if;
end
$$;

alter table public.posts
  add constraint posts_creator_id_fkey
  foreign key (creator_id)
  references public.users (id)
  on delete cascade;

notify pgrst, 'reload schema';
