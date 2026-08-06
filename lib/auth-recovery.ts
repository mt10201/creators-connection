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
