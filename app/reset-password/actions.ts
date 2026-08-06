"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage, AUTH_LINK_INVALID } from "@/lib/auth-errors";
import { RECOVERY_COOKIE } from "@/lib/auth-recovery";
import { validateNewPassword } from "@/lib/password";

type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Sets a new password for a session that arrived through a recovery link.
 * The recovery cookie is required so an ordinary signed-in session can't skip
 * the current-password check that Settings enforces.
 */
export async function completePasswordReset(
  password: string,
  confirmPassword: string
): Promise<ResetResult> {
  const cookieStore = await cookies();

  if (cookieStore.get(RECOVERY_COOKIE)?.value !== "1") {
    return { ok: false, error: AUTH_LINK_INVALID };
  }

  const validationError = validateNewPassword(password, confirmPassword);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: AUTH_LINK_INVALID };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, error: authErrorMessage(error) };
  }

  cookieStore.delete(RECOVERY_COOKIE);

  return { ok: true };
}
