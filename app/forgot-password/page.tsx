import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Get a link to set a new password for your account.",
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
