/**
 * A recovery link signs the visitor in, which would otherwise let anyone with
 * an open session load /reset-password and set a new password without knowing
 * the old one. This short-lived cookie marks the session as "arrived via a
 * password-reset link" so only that path can skip the current-password check.
 */
export const RECOVERY_COOKIE = "cc-password-recovery";

export const RECOVERY_COOKIE_MAX_AGE = 60 * 15;

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: RECOVERY_COOKIE_MAX_AGE,
} as const;

export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * Set when this browser asks for a reset email, and read when the link comes
 * back. Supabase drops `redirect_to` entirely if it isn't on the project's
 * allow list and falls back to the Site URL, so a recovery link can arrive on
 * the homepage carrying only `?code=` — indistinguishable from a signup
 * confirmation. This cookie supplies the missing intent.
 *
 * It is a hint, not an authorisation: the code exchange in /auth/callback is
 * what actually proves the link was genuine.
 */
export const RESET_PENDING_COOKIE = "cc-reset-pending";

export const resetPendingCookieOptions = {
  ...recoveryCookieOptions,
  maxAge: 60 * 60, // Matches how long Supabase recovery links stay valid.
} as const;

/** Endpoints the client uses to record reset intent and claim a hash session. */
export const RECOVERY_API_PATH = "/auth/recovery";

export type RecoveryIntent = "pending" | "confirm";

/**
 * True when a URL fragment carries a Supabase recovery result. Projects on the
 * implicit flow deliver tokens in the hash, which never reaches the server, so
 * this is detectable only in the browser.
 */
export function isRecoveryHash(hash: string): boolean {
  if (!hash || hash.length < 2) return false;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    params.get("type") === "recovery" ||
    (params.has("access_token") && params.has("refresh_token"))
  );
}

/** An expired or already-used link comes back as an error in the fragment. */
export function recoveryHashError(hash: string): string | null {
  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_code") ?? params.get("error") ?? null;
}
