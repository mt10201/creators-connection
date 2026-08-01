/** Matches the signup form — the source of truth for public handles. */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

export const USERNAME_HINT =
  "3–24 characters — letters, numbers, or underscores.";

export const USERNAME_ERROR =
  "Username must be 3–24 characters, using letters, numbers, or underscores.";

export function normalizeUsername(raw: string) {
  return raw.trim();
}

/** Returns an error message, or null when the username is valid. */
export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!USERNAME_REGEX.test(username)) return USERNAME_ERROR;
  return null;
}
