import { MIN_PASSWORD_LENGTH } from "@/lib/password";

/**
 * Supabase auth errors are written for developers. Everything the user sees
 * goes through this mapper so a raw API string never reaches the UI.
 */

export const AUTH_GENERIC_ERROR =
  "Something went wrong on our end. Please try again in a moment.";

export const AUTH_LINK_INVALID =
  "That link is invalid or has expired. Request a new one and open it on the same device you requested it from.";

/** Supabase error codes → copy. Codes are stable across message rewordings. */
const BY_CODE: Record<string, string> = {
  invalid_credentials: "That email and password don’t match an account.",
  email_not_confirmed:
    "Confirm your email address first — check your inbox for the confirmation link.",
  email_address_invalid: "That email address doesn’t look valid.",
  email_address_not_authorized:
    "We can’t send email to that address right now.",
  user_already_exists:
    "An account with that email already exists. Log in instead, or reset your password.",
  email_exists:
    "An account with that email already exists. Log in instead, or reset your password.",
  weak_password: `Choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters.`,
  same_password:
    "Choose a new password that’s different from your current one.",
  over_email_send_rate_limit:
    "We’ve sent a few emails already. Wait a minute before requesting another.",
  over_request_rate_limit:
    "Too many attempts. Wait a minute and try again.",
  otp_expired: AUTH_LINK_INVALID,
  flow_state_expired: AUTH_LINK_INVALID,
  flow_state_not_found: AUTH_LINK_INVALID,
  bad_code_verifier: AUTH_LINK_INVALID,
  session_not_found: AUTH_LINK_INVALID,
  signup_disabled: "New sign-ups are paused right now. Check back soon.",
  validation_failed: "Check the details you entered and try again.",
  reauthentication_needed:
    "For security, log in again before changing your password.",
};

/** Fallbacks for older errors that arrive without a `code`. */
const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, BY_CODE.user_already_exists],
  [/password should be at least|password is too weak/i, BY_CODE.weak_password],
  [/different from the old password/i, BY_CODE.same_password],
  [/for security purposes|rate limit|too many requests/i,
    BY_CODE.over_request_rate_limit],
  [/expired|invalid flow state|code verifier/i, AUTH_LINK_INVALID],
  [/unable to validate email|invalid format/i, BY_CODE.email_address_invalid],
];

type AuthErrorish = {
  code?: string | null;
  message?: string | null;
};

/**
 * Turns a Supabase auth error into copy we're happy to show. Unrecognised
 * errors fall back rather than leaking the raw message.
 */
export function authErrorMessage(
  error: unknown,
  fallback: string = AUTH_GENERIC_ERROR
): string {
  const { code, message } = (error ?? {}) as AuthErrorish;

  if (code && BY_CODE[code]) return BY_CODE[code];

  if (message) {
    for (const [pattern, copy] of BY_MESSAGE) {
      if (pattern.test(message)) return copy;
    }
    // Log the original so it's still debuggable from the console.
    console.error("Unmapped auth error:", code ?? "no-code", message);
  }

  return fallback;
}
