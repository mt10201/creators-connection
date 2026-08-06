import type { SupabaseClient } from "@supabase/supabase-js";

/** Query param on /signup that carries the referrer. */
export const REFERRAL_PARAM = "ref";

/** Mirrors the grants in supabase/referrals.sql. */
export const REFERRAL_REFERRER_CREDITS = 10;
export const REFERRAL_NEW_MAKER_CREDITS = 2;

export type ReferralSummary = {
  /** Accounts that signed up through the link. */
  signedUp: number;
  /** Of those, how many published a first post and paid out. */
  activated: number;
  creditsEarned: number;
};

/**
 * What goes in `?ref=`. Prefers the username; falls back to the user id so an
 * account without a handle still has a working link (the SQL resolves both).
 */
export function referralToken(username: string | null, userId: string): string {
  return username?.trim() || userId;
}

/**
 * The configured public origin, or null when NEXT_PUBLIC_SITE_URL is unset.
 * Inlined at build time, so this is safe in client components.
 */
export function configuredReferralOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    // A malformed env var shouldn't break the share UI.
    return null;
  }
}

/**
 * The share link. Without an origin this returns a root-relative path, which
 * is still a valid link — the field upgrades it to absolute once mounted.
 */
export function buildReferralLink(
  token: string,
  origin?: string | null
): string {
  const path = `/signup?${REFERRAL_PARAM}=${encodeURIComponent(token)}`;
  return origin ? `${origin}${path}` : path;
}

export async function loadReferralSummary(
  supabase: SupabaseClient
): Promise<ReferralSummary> {
  const { data, error } = await supabase
    .rpc("my_referral_summary")
    .maybeSingle();

  if (error) {
    console.error("Failed to load referral summary:", error.message);
  }

  const typed = data as
    | { signed_up: number; activated: number; credits_earned: number }
    | null;

  return {
    signedUp: typed?.signed_up ?? 0,
    activated: typed?.activated ?? 0,
    creditsEarned: typed?.credits_earned ?? 0,
  };
}
