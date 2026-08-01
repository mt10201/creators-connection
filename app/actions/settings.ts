"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateNewPassword } from "@/lib/password";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updateUsername(
  rawUsername: string
): Promise<SettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const username = normalizeUsername(rawUsername);
  const validationError = validateUsername(username);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const { data: current } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const previous = current?.username?.trim() ?? "";
  if (previous === username) {
    return { ok: true, message: "Username is already up to date." };
  }

  const { error } = await supabase
    .from("users")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That username is already taken." };
    }
    return { ok: false, error: error.message };
  }

  // Keep the signup metadata copy in sync so navbar fallbacks stay accurate.
  const { error: metaError } = await supabase.auth.updateUser({
    data: { username },
  });
  if (metaError) {
    console.error("Failed to sync username metadata:", metaError.message);
  }

  if (previous) {
    revalidatePath(`/profile/${encodeURIComponent(previous)}`);
  }
  revalidatePath(`/profile/${encodeURIComponent(username)}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { ok: true, message: "Username updated." };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<SettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const email = user.email?.trim();
  if (!email) {
    return {
      ok: false,
      error: "Your account has no email on file, so the password can’t be changed here.",
    };
  }

  if (!currentPassword) {
    return { ok: false, error: "Enter your current password." };
  }

  const validationError = validateNewPassword(newPassword, confirmPassword);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (currentPassword === newPassword) {
    return {
      ok: false,
      error: "Choose a new password that is different from your current one.",
    };
  }

  // Re-check the current password before allowing a change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, message: "Password updated." };
}
