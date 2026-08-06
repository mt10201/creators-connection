import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Get a link to set a new password for your account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
