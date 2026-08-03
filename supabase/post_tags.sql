-- Optional product tags for search.
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- tags_search is a plain text column (not GENERATED) kept in sync by trigger,
-- because array_to_string() is not IMMUTABLE and cannot be used in a
-- generated-column expression on Postgres/Supabase.

alter table public.posts
  add column if not exists tags text[] not null default '{}';

-- Drop a failed/previous generated column if present, then use a normal column.
alter table public.posts
  drop column if exists tags_search;

alter table public.posts
  add column tags_search text not null default '';

create or replace function public.sync_post_tags_search()
returns trigger
language plpgsql
as $$
begin
  new.tags := coalesce(new.tags, '{}'::text[]);
  new.tags_search := lower(array_to_string(new.tags, ' '));
  return new;
end;
$$;

drop trigger if exists on_posts_sync_tags_search on public.posts;
create trigger on_posts_sync_tags_search
  before insert or update of tags on public.posts
  for each row
  execute function public.sync_post_tags_search();

-- Backfill existing rows (including empty tag arrays → '').
update public.posts
set tags_search = lower(array_to_string(coalesce(tags, '{}'::text[]), ' '))
where tags_search is distinct from lower(array_to_string(coalesce(tags, '{}'::text[]), ' '));

create index if not exists posts_tags_gin_idx
  on public.posts using gin (tags);

create index if not exists posts_tags_search_idx
  on public.posts (tags_search);

notify pgrst, 'reload schema';
