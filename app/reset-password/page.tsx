import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "@/lib/auth-recovery";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a New Password",
  description: "Choose a new password for your account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /auth/callback sets the cookie only after a recovery link checks out.
  const fromRecoveryLink =
    cookieStore.get(RECOVERY_COOKIE)?.value === "1" && Boolean(user);

  return <ResetPasswordForm fromRecoveryLink={fromRecoveryLink} />;
}
