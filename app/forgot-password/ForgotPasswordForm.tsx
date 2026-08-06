"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { RESET_PASSWORD_PATH } from "@/lib/auth-recovery";
import Spinner from "@/app/components/Spinner";
import AuthCard from "@/app/components/AuthCard";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter the email address you signed up with.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmed,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          RESET_PASSWORD_PATH
        )}`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }

    // Supabase succeeds for unknown addresses too, which is what we want:
    // the confirmation below never reveals whether an account exists.
    setSentTo(trimmed);
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle={`If an account uses ${sentTo}, we just sent it a link to set a new password.`}
      >
        <div className="form-alert-success" role="status">
          The link works once and expires in about an hour. Open it on this
          device so we can finish signing you in.
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink-muted">
          Nothing there? Check spam, or{" "}
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setError(null);
            }}
            className="font-medium text-terracotta underline-offset-4 transition hover:underline"
          >
            try a different email
          </button>
          .
        </p>

        <p className="rule-double mt-9 pt-6 text-center text-sm text-ink-muted">
          <Link
            href="/login"
            className="font-medium text-terracotta underline-offset-4 transition hover:underline"
          >
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We’ll email you a link to set a new one."
    >
      {error && (
        <div role="alert" className="form-alert-error mb-5">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reset-email" className="form-label">
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="reset-email-hint"
            className="form-input"
          />
          <p id="reset-email-hint" className="form-hint">
            Use the address you signed up with — usernames won’t work here.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary btn-lg w-full"
        >
          {loading && <Spinner />}
          {loading ? "Sending link…" : "Send reset link"}
        </button>
      </form>

      <p className="rule-double mt-9 pt-6 text-center text-sm text-ink-muted">
        Remembered it?{" "}
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
