export const MIN_PASSWORD_LENGTH = 6;

/** Returns an error message, or null when the new password pair is valid. */
export function validateNewPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}
