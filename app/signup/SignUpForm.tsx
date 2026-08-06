"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { authErrorMessage } from "@/lib/auth-errors";
import { validateNewPassword } from "@/lib/password";
import {
  USERNAME_HINT,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import Spinner from "@/app/components/Spinner";
import AuthCard from "@/app/components/AuthCard";

export default function SignUpForm({
  referrer = null,
}: {
  referrer?: string | null;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Set only when the project requires email confirmation, so we never tell
  // people to check their inbox when nothing was sent.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<
    string | null
  >(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = normalizeUsername(username);
    const usernameError = validateUsername(trimmedUsername);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordError = validateNewPassword(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const trimmedEmail = email.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          username: trimmedUsername,
          // Resolved to a real account (or dropped) by handle_new_user.
          ...(referrer ? { referred_by: referrer } : {}),
        },
        // Only used when email confirmation is turned on for the project.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fexplore`,
      },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Unable to create account. Please try again.");
      setLoading(false);
      return;
    }

    // No session means Supabase is holding the account until the emailed
    // confirmation link is opened.
    if (!data.session) {
      setAwaitingConfirmation(trimmedEmail);
      setLoading(false);
      return;
    }

    // The public.users profile row is created by the on_auth_user_created
    // trigger, so there is nothing to insert here.

    await trackEvent(supabase, {
      event_name: "sign_up",
      user_id: data.user.id,
    });

    setSuccess("Account created successfully! Redirecting…");
    router.push("/explore");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <ConfirmEmailNotice
        email={awaitingConfirmation}
        onStartOver={() => setAwaitingConfirmation(null)}
      />
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join a community of independent makers"
    >
      {referrer && (
        <div className="form-alert-success mb-5">
          Invited by{" "}
          <span className="font-semibold">{referrer}</span> — publish your first
          product and you both earn credits.
        </div>
      )}

      {error && (
        <div role="alert" className="form-alert-error mb-5">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="form-alert-success mb-5">
          {success}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="janemakes"
            disabled={loading}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="username-hint"
            className="form-input"
          />
          <p id="username-hint" className="form-hint">
            {USERNAME_HINT}
          </p>
        </div>

        <div>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary btn-lg w-full"
        >
          {loading && <Spinner />}
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="rule-double mt-9 pt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-terracotta underline-offset-4 transition hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}

function ConfirmEmailNotice({
  email,
  onStartOver,
}: {
  email: string;
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fexplore`,
      },
    });

    if (resendError) {
      setError(authErrorMessage(resendError));
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  return (
    <AuthCard
      title="Confirm your email"
      subtitle={`We sent a confirmation link to ${email}. Open it to finish creating your account.`}
    >
      {error && (
        <div role="alert" className="form-alert-error mb-5">
          {error}
        </div>
      )}

      {status === "sent" ? (
        <div role="status" className="form-alert-success">
          Sent again. Give it a minute, then check spam if it still hasn’t
          arrived.
        </div>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={status === "sending"}
          className="btn-secondary w-full"
        >
          {status === "sending" && <Spinner />}
          {status === "sending" ? "Sending…" : "Resend confirmation email"}
        </button>
      )}

      <p className="mt-5 text-sm leading-relaxed text-ink-muted">
        Typed the wrong address?{" "}
        <button
          type="button"
          onClick={onStartOver}
          className="font-medium text-terracotta underline-offset-4 transition hover:underline"
        >
          Sign up again
        </button>
        .
      </p>

      <p className="rule-double mt-9 pt-6 text-center text-sm text-ink-muted">
        Already confirmed?{" "}
        <Link
          href="/login"
          className="font-medium text-terracotta underline-offset-4 transition hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
