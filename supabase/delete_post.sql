-- Post deletion for Creators Connection.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Owners delete their own post row; everything hanging off it has to go with it.
-- RLS only lets a user delete their *own* likes/saves, so the post owner can
-- never clear other people's engagement rows directly — the cascade does it.

alter table public.likes drop constraint if exists likes_post_id_fkey;
alter table public.likes
  add constraint likes_post_id_fkey
  foreign key (post_id) references public.posts (id) on delete cascade;

alter table public.saves drop constraint if exists saves_post_id_fkey;
alter table public.saves
  add constraint saves_post_id_fkey
  foreign key (post_id) references public.posts (id) on delete cascade;

-- Credit history is kept for the audit trail; it just loses the post reference.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_post_id_fkey;
alter table public.credit_transactions
  add constraint credit_transactions_post_id_fkey
  foreign key (post_id) references public.posts (id) on delete set null;

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = creator_id);

notify pgrst, 'reload schema';
