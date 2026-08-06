"use client";

import Link from "next/link";
import { useState } from "react";
import { login } from "./actions";
import Spinner from "@/app/components/Spinner";
import AuthCard from "@/app/components/AuthCard";

export default function LoginForm({
  redirectTo,
  notice,
}: {
  redirectTo?: string;
  notice?: string | null;
}) {
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
    <AuthCard
      title="Welcome back"
      subtitle="Log in to continue sharing and discovering"
    >
      {notice && !error && (
        <div role="status" className="form-alert-error mb-5">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="form-alert-error mb-5">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="identifier" className="form-label">
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
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-ink-muted underline-offset-4 transition hover:text-terracotta hover:underline"
            >
              Forgot password?
            </Link>
          </div>
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
    </AuthCard>
  );
}
