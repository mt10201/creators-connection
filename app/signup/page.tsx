import type { Metadata } from "next";
import { REFERRAL_PARAM } from "@/lib/referrals";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your free account and join a community of independent makers.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params[REFERRAL_PARAM];
  const referrer = (Array.isArray(raw) ? raw[0] : raw)?.trim() || null;

  // The value is resolved to a real account server-side in handle_new_user.
  return <SignUpForm referrer={referrer} />;
}
