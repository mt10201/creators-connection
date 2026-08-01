"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword, updateUsername } from "@/app/actions/settings";
import {
  USERNAME_HINT,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import { validateNewPassword } from "@/lib/password";
import Spinner from "@/app/components/Spinner";

type Props = {
  initialUsername: string;
};

export default function SettingsForms({ initialUsername }: Props) {
  return (
    <div className="space-y-8">
      <UsernameForm initialUsername={initialUsername} />
      <PasswordForm />
    </div>
  );
}

function UsernameForm({ initialUsername }: Props) {
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
    <section className="rounded-[2rem] border border-sand bg-parchment/70 p-6 shadow-soft sm:p-8">
      <span className="eyebrow text-sage">Public handle</span>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        Username
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        This is how you appear across Explore, profiles, and notifications.
      </p>

      {error && (
        <p role="alert" className="form-alert-error mt-5">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-alert-success mt-5">
          {success}
        </p>
      )}

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <div>
          <label htmlFor="settings-username" className="form-label">
            Username
          </label>
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
            className="form-input"
          />
          <p id="settings-username-hint" className="form-hint">
            {USERNAME_HINT}
          </p>
        </div>

        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save username"}
        </button>
      </form>
    </section>
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
    <section className="rounded-[2rem] border border-sand bg-parchment/70 p-6 shadow-soft sm:p-8">
      <span className="eyebrow text-sage">Security</span>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        Password
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Confirm your current password, then choose a new one.
      </p>

      {error && (
        <p role="alert" className="form-alert-error mt-5">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-alert-success mt-5">
          {success}
        </p>
      )}

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
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

        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <Spinner />}
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
