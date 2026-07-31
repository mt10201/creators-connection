-- Credit clawback when a post is deleted.
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Creating a post awards +5 credits (see award_post_credits in schema.sql), so
-- deleting one has to give them back. This lives in a trigger rather than the
-- delete server action for two reasons: credit_transactions has no insert
-- policy, so only a security definer function may write to it, and a trigger
-- fires on every delete path, including someone calling the REST API directly.

-- The clawback looks up the post's own ledger rows, so make that cheap.
create index if not exists credit_transactions_post_id_idx
  on public.credit_transactions (post_id);

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

  -- Net of what this post earned and anything already taken back, so posts that
  -- predate the award trigger (no ledger row) are left alone. Restricted to the
  -- two post lifecycle reasons: other spend tied to a post must not shrink it.
  select coalesce(sum(amount), 0)
  into v_outstanding
  from public.credit_transactions
  where post_id = old.id
    and reason in ('post_created', 'post_deleted');

  if v_outstanding <= 0 then
    return old;
  end if;

  -- Locks the profile so two deletes in flight at once can't both read the same
  -- balance and each subtract from it.
  select coalesce(credit_balance, 0)
  into v_balance
  from public.users
  where id = old.creator_id
  for update;

  if not found then
    return old;
  end if;

  -- Balances never go negative. If the credits were already spent, take back
  -- whatever is left so the ledger still sums to the stored balance, and skip
  -- the transaction entirely at zero rather than recording a no-op.
  v_clawback := least(v_outstanding, v_balance);

  if v_clawback <= 0 then
    return old;
  end if;

  -- post_id is set for the audit trail; the foreign key nulls it out a moment
  -- later when the post row goes, exactly as it does for the post_created row.
  insert into public.credit_transactions (user_id, amount, reason, post_id)
  values (old.creator_id, -v_clawback, 'post_deleted', old.id);

  update public.users
  set credit_balance = v_balance - v_clawback
  where id = old.creator_id;

  return old;
end;
$$;

-- Must be BEFORE DELETE: after the row is gone the post_id foreign key on the
-- new transaction would have nothing to point at.
drop trigger if exists on_post_deleted_claw_back_credits on public.posts;
create trigger on_post_deleted_claw_back_credits
  before delete on public.posts
  for each row
  execute function public.claw_back_post_credits();

notify pgrst, 'reload schema';
