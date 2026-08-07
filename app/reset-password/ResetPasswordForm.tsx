"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { isRecoveryHash } from "@/lib/auth-recovery";
import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import Spinner from "@/app/components/Spinner";
import AuthCard from "@/app/components/AuthCard";
import { completePasswordReset } from "./actions";

export default function ResetPasswordForm({
  fromRecoveryLink,
}: {
  fromRecoveryLink: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // The server can't see a URL fragment, so a link landing here on the implicit
  // flow renders as expired for a moment while RecoveryLinkCatcher claims the
  // session and refreshes. Hold the "expired" copy back until that settles.
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!fromRecoveryLink && isRecoveryHash(window.location.hash)) {
      setClaiming(true);
    }
  }, [fromRecoveryLink]);

  if (!fromRecoveryLink && claiming) {
    return (
      <AuthCard
        title="Checking your link…"
        subtitle="One moment while we verify your reset link."
      >
        <div className="flex justify-center py-2 text-ink-muted">
          <Spinner />
        </div>
      </AuthCard>
    );
  }

  if (!fromRecoveryLink) {
    return (
      <AuthCard
        title="This link has expired"
        subtitle="Password reset links work once, and only on the device that requested them."
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          Request a fresh link and open it in this browser to finish setting a
          new password.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary btn-lg mt-6 w-full"
        >
          Send a new link
        </Link>
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await completePasswordReset(password, confirmPassword);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDone(true);
      router.replace("/explore");
      router.refresh();
    });
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="You’re signed in from your reset link — choose a password and you’re done."
    >
      {error && (
        <div role="alert" className="form-alert-error mb-5">
          {error}
        </div>
      )}

      {done && (
        <div role="status" className="form-alert-success mb-5">
          Password updated. Taking you to Explore…
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className="form-label">
            New password
          </label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={pending || done}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="new-password-hint"
            className="form-input"
          />
          <p id="new-password-hint" className="form-hint">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        <div>
          <label htmlFor="confirm-new-password" className="form-label">
            Confirm new password
          </label>
          <input
            id="confirm-new-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={pending || done}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={pending || done}
          className="btn-primary btn-lg w-full"
        >
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
