import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Log in to continue sharing and discovering with independent makers.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return <LoginForm redirectTo={redirectTo} />;
}
