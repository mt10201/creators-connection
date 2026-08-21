-- One-time welcome email bookkeeping for Creators Connection.
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- The row is the send lock, not a log: /api/welcome-email inserts it with
-- `on conflict do nothing` before calling Resend, so two concurrent requests
-- (double-submitted signup, retried fetch) can never both send. If the send
-- itself fails, the route deletes the row again so a later attempt can retry.
--
-- Writes come only from the service-role key in the API route, so there are no
-- client policies here at all.

create table if not exists public.welcome_email_claims (
  user_id uuid primary key references public.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);

alter table public.welcome_email_claims enable row level security;

-- No policies: anon and authenticated get nothing. Service role bypasses RLS.
revoke all on table public.welcome_email_claims from anon, authenticated;
