"use client";

import Link from "next/link";
import { useState } from "react";
import { login } from "./actions";
import Spinner from "@/app/components/Spinner";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // On success the action redirects, so nothing is returned here.
    const result = await login(identifier, password, redirectTo);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Log in to continue sharing and discovering
            </p>
          </div>

          {error && (
            <div role="alert" className="form-alert-error mb-5">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="identifier"
                className="form-label"
              >
                Username or Email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="janemakes or you@example.com"
                disabled={loading}
                aria-invalid={Boolean(error) || undefined}
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                aria-invalid={Boolean(error) || undefined}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading && <Spinner />}
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="rule-double mt-9 pt-6 text-center text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-terracotta underline-offset-4 transition hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
