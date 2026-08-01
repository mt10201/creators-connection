"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changePassword, updateUsername } from "@/app/actions/settings";
import {
  USERNAME_HINT,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import { validateNewPassword } from "@/lib/password";
import Spinner from "@/app/components/Spinner";

type Tab = "profile" | "password";

type Props = {
  initialUsername: string;
  email: string;
  credits: number;
  profileHref: string | null;
};

export default function SettingsForms({
  initialUsername,
  email,
  credits,
  profileHref,
}: Props) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="rounded-2xl border border-sand bg-cream shadow-soft">
      {/* Compact account snapshot */}
      <div className="grid gap-4 border-b border-sand px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <dl className="grid gap-3 sm:grid-cols-2 sm:gap-6">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Email
            </dt>
            <dd className="mt-1 truncate text-sm text-ink">{email}</dd>
            <dd className="mt-0.5 text-xs text-ink-muted">
              Can’t be changed here yet.
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Credits
            </dt>
            <dd className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
              {credits}
              <span className="ml-1.5 text-sm font-medium text-ink-muted">
                {credits === 1 ? "credit" : "credits"}
              </span>
            </dd>
          </div>
        </dl>
        {profileHref && (
          <Link
            href={profileHref}
            className="shrink-0 text-sm text-terracotta underline-offset-4 transition hover:underline"
          >
            Public profile →
          </Link>
        )}
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Settings sections"
          className="inline-flex gap-1 rounded-full border border-sand bg-parchment/70 p-1"
        >
          {(
            [
              { id: "profile", label: "Profile" },
              { id: "password", label: "Password" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`chip border-transparent ${
                  active
                    ? "bg-terracotta font-medium text-cream shadow-soft"
                    : "text-ink-muted hover:bg-cream hover:text-terracotta"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5" role="tabpanel">
          {tab === "profile" ? (
            <UsernameForm initialUsername={initialUsername} />
          ) : (
            <PasswordForm />
          )}
        </div>
      </div>
    </div>
  );
}

function UsernameForm({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await updateUsername(username);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsername(normalizeUsername(username));
      setSuccess(result.message);
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor="settings-username" className="form-label">
          Username
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            id="settings-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={pending}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby="settings-username-hint"
            className="form-input mt-0 sm:flex-1"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-primary shrink-0 sm:min-w-[8.5rem]"
          >
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <p id="settings-username-hint" className="form-hint">
          {USERNAME_HINT}
        </p>
      </div>

      {error && (
        <p role="alert" className="form-alert-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-alert-success">
          {success}
        </p>
      )}
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }

    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(result.message);
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor="current-password" className="form-label">
          Current password
        </label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={pending}
          className="form-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={pending}
            aria-describedby="new-password-hint"
            className="form-input"
          />
          <p id="new-password-hint" className="form-hint">
            At least 6 characters.
          </p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="form-label">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={pending}
            className="form-input"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="form-alert-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-alert-success">
          {success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending && <Spinner />}
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
