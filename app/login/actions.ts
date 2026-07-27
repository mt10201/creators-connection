"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const GENERIC_FAILURE =
  "That username/email and password combination doesn't match an account.";

function looksLikeEmail(value: string) {
  return value.includes("@");
}

export async function login(
  identifier: string,
  password: string,
  redirectTo?: string
): Promise<{ error: string } | void> {
  const trimmed = identifier.trim();

  if (!trimmed || !password) {
    return { error: "Please enter your username or email and password." };
  }

  const supabase = await createClient();
  let email = trimmed;

  if (!looksLikeEmail(trimmed)) {
    const { data, error } = await supabase.rpc("email_for_username", {
      p_username: trimmed,
    });

    if (error) {
      console.error("Username lookup failed:", error.message);
      return { error: "Could not sign you in right now. Please try again." };
    }

    if (!data) {
      // Same message as a bad password so usernames can't be probed.
      return { error: GENERIC_FAILURE };
    }

    email = data as string;
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      error:
        signInError.message === "Invalid login credentials"
          ? GENERIC_FAILURE
          : signInError.message,
    };
  }

  // Only allow same-origin paths so the query param can't be used as an open redirect.
  const destination =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/explore";

  redirect(destination);
}
