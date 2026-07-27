"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/app/components/Spinner";

export default function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim();

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmedUsername)) {
      setError(
        "Username must be 3–24 characters, using letters, numbers, or underscores."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUsername,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Unable to create account. Please try again.");
      setLoading(false);
      return;
    }

    // The public.users profile row is created by the on_auth_user_created
    // trigger, so there is nothing to insert here.

    setSuccess("Account created successfully! Redirecting…");
    router.push("/explore");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-sand bg-parchment/70 p-8 shadow-soft sm:p-10">
          <div className="mb-9 text-center">
            <Link href="/" className="mb-6 inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta font-display text-sm font-semibold text-cream">
                cc
              </span>
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Join a community of independent makers
            </p>
          </div>

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
              <label
                htmlFor="username"
                className="form-label"
              >
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
                3–24 characters — letters, numbers, or underscores.
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="form-label"
              >
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
              <label
                htmlFor="password"
                className="form-label"
              >
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
              <label
                htmlFor="confirmPassword"
                className="form-label"
              >
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
        </div>
      </div>
    </div>
  );
}
