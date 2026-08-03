-- Credit clawback when a post is deleted.
-- Prefer running credits_hybrid.sql, which replaces this with the full hybrid
-- clawback (post + engagement credits). This file remains safe to re-run and
-- installs a compatible clawback if credits_hybrid.sql has not been applied.

create index if not exists credit_transactions_post_id_idx
  on public.credit_transactions (post_id);

alter table public.credit_transactions
  add column if not exists available_at timestamptz;

alter table public.credit_transactions
  add column if not exists source_user_id uuid references public.users (id) on delete set null;

update public.credit_transactions
set available_at = created_at
where available_at is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_transactions'
      and column_name = 'available_at'
  ) then
    execute 'alter table public.credit_transactions alter column available_at set default now()';
    begin
      execute 'alter table public.credit_transactions alter column available_at set not null';
    exception
      when others then null;
    end;
  end if;
end
$$;

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

  insert into public.credit_transactions (
    user_id, amount, reason, post_id, available_at
  )
  values (
    old.creator_id,
    -v_clawback,
    'post_deleted',
    old.id,
    now()
  );

  update public.users
  set credit_balance = v_balance - v_clawback
  where id = old.creator_id;

  return old;
end;
$$;

drop trigger if exists on_post_deleted_claw_back_credits on public.posts;
create trigger on_post_deleted_claw_back_credits
  before delete on public.posts
  for each row
  execute function public.claw_back_post_credits();

notify pgrst, 'reload schema';
