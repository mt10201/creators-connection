import type { Metadata } from "next";
import { AUTH_LINK_INVALID } from "@/lib/auth-errors";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Log in to continue sharing and discovering with independent makers.",
};

/** Set by /auth/callback so an email link never dumps a raw error on screen. */
const NOTICES: Record<string, string> = {
  link_invalid: AUTH_LINK_INVALID,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; notice?: string }>;
}) {
  const { redirectTo, notice } = await searchParams;

  return (
    <LoginForm
      redirectTo={redirectTo}
      notice={notice ? (NOTICES[notice] ?? null) : null}
    />
  );
}
