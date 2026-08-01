import type { Metadata } from "next";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your free account and join a community of independent makers.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
