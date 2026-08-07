import type { Metadata } from "next";
import { AUTH_LINK_INVALID } from "@/lib/auth-errors";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Get a link to set a new password for your account.",
  robots: PRIVATE_PAGE_ROBOTS,
};

/** Set when a recovery link arrived but couldn't be tied to this browser. */
const NOTICES: Record<string, string> = {
  link_unverified: AUTH_LINK_INVALID,
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  return (
    <ForgotPasswordForm
      notice={notice ? (NOTICES[notice] ?? null) : null}
    />
  );
}
