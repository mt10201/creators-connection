"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  changePassword,
  deleteAccount,
  updateUsername,
} from "@/app/actions/settings";
import {
  clearProfilePhoto,
  updateProfilePhoto,
} from "@/app/actions/profile-photo";
import {
  USERNAME_HINT,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import { validateNewPassword } from "@/lib/password";
import { validateProfilePhoto } from "@/lib/profile-photo";
import Avatar from "@/app/components/Avatar";
import Spinner from "@/app/components/Spinner";
import CreditActivity from "@/app/components/CreditActivity";
import ReferralInvite from "@/app/components/ReferralInvite";
import type { Wallet } from "@/lib/wallet";
import type { ReferralSummary } from "@/lib/referrals";

type Tab = "profile" | "security" | "credits" | "referrals" | "danger";

const tabs: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "credits", label: "Credits" },
  { id: "referrals", label: "Referrals" },
  { id: "danger", label: "Danger zone" },
];

type Props = {
  initialUsername: string;
  initialPhotoUrl: string | null;
  email: string;
  wallet: Wallet;
  referralToken: string;
  referrals: ReferralSummary;
  profileHref: string | null;
};

export default function SettingsForms({
  initialUsername,
  initialPhotoUrl,
  email,
  wallet,
  referralToken,
  referrals,
  profileHref,
}: Props) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="rounded-2xl border border-sand bg-cream shadow-soft">
      <div className="border-b border-sand px-5 py-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Settings sections"
          // Scrolls rather than wrapping on narrow screens.
          className="-mx-1 overflow-x-auto px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="inline-flex gap-1 rounded-full border border-sand bg-parchment/70 p-1">
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`settings-tab-${item.id}`}
                  aria-selected={active}
                  aria-controls={`settings-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`chip whitespace-nowrap border-transparent ${
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
        </div>
      </div>

      <div
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
      >
        {tab === "profile" && (
          <>
            <PhotoSection
              initialUsername={initialUsername}
              initialPhotoUrl={initialPhotoUrl}
            />
            <div className="px-5 py-5 sm:px-6">
              <UsernameForm initialUsername={initialUsername} />
              {profileHref && (
                <Link
                  href={profileHref}
                  className="mt-5 inline-block text-sm text-terracotta underline-offset-4 transition hover:underline"
                >
                  View public profile →
                </Link>
              )}
            </div>
          </>
        )}

        {tab === "security" && (
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div>
              <p className="form-label">Email</p>
              <p className="mt-1 truncate text-sm text-ink">{email}</p>
              <p className="form-hint">
                Used to sign in. Changing it isn’t supported yet.
              </p>
            </div>

            <div className="border-t border-sand pt-6">
              <p className="form-label">Password</p>
              <div className="mt-3">
                <PasswordForm />
              </div>
            </div>
          </div>
        )}

        {tab === "credits" && <CreditsPanel wallet={wallet} />}

        {tab === "referrals" && (
          <div className="px-5 py-5 sm:px-6">
            <ReferralInvite token={referralToken} summary={referrals} compact />
          </div>
        )}

        {tab === "danger" && (
          <div className="px-5 py-5 sm:px-6">
            <DeleteAccountSection username={initialUsername} />
          </div>
        )}
      </div>
    </div>
  );
}

function CreditsPanel({ wallet }: { wallet: Wallet }) {
  const { spendable, vesting, nextVestingAt, transactions } = wallet;

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="rounded-[1.25rem] border border-ochre/25 bg-ochre/5 px-5 py-4">
        <span className="eyebrow text-ochre">Credit balance</span>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
          {spendable}
          <span className="ml-2 text-base font-medium text-ink-muted">
            spendable {spendable === 1 ? "credit" : "credits"}
          </span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          {vesting > 0
            ? `${vesting} more ${vesting === 1 ? "credit" : "credits"} vesting${
                nextVestingAt ? ` — next unlocks ${nextVestingAt}` : ""
              }.`
            : "Credits become spendable 24 hours after you earn them."}
        </p>
      </div>

      <div className="mt-6 border-t border-sand pt-5">
        <CreditActivity transactions={transactions} bare />
      </div>

      <div className="mt-5 flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard"
          className="text-terracotta underline-offset-4 hover:underline"
        >
          Full activity on your dashboard →
        </Link>
        <Link
          href="/how-it-works#credits"
          className="text-ink-muted underline-offset-4 hover:text-terracotta hover:underline"
        >
          How credits work
        </Link>
      </div>
    </div>
  );
}

function PhotoSection({
  initialUsername,
  initialPhotoUrl,
}: {
  initialUsername: string;
  initialPhotoUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("photo", file);

    startTransition(async () => {
      const result = await updateProfilePhoto(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhotoUrl(result.url);
      setSuccess("Profile photo updated.");
      router.refresh();
    });
  }

  function onRemovePhoto() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await clearProfilePhoto();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhotoUrl(null);
      setSuccess("Profile photo removed.");
      router.refresh();
    });
  }

  return (
    <div className="border-b border-sand px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar
          name={initialUsername || "Creator"}
          photoUrl={photoUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="form-label">Profile picture</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Shown on your profile, in the navbar, and on your posts. Square
            images work best · max 2 MB.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              id="settings-profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onPhotoSelected}
              disabled={pending}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              {pending && <Spinner />}
              {photoUrl ? "Replace photo" : "Upload photo"}
            </button>
            {photoUrl && (
              <button
                type="button"
                disabled={pending}
                onClick={onRemovePhoto}
                className="btn-secondary"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="form-alert-error mt-4">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-alert-success mt-4">
          {success}
        </p>
      )}
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
      <p className="text-sm leading-relaxed text-ink-muted">
        Enter your current password to confirm it’s you. Password changes aren’t
        allowed with only the new password fields.
      </p>

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
          aria-describedby="current-password-hint"
          className="form-input"
        />
        <p id="current-password-hint" className="form-hint">
          Required to change your password.
        </p>
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

      <button
        type="submit"
        disabled={pending || !currentPassword.trim()}
        className="btn-primary"
      >
        {pending && <Spinner />}
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

function DeleteAccountSection({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasUsername = Boolean(username.trim());
  const confirmLabel = hasUsername ? username : "DELETE";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await deleteAccount(confirmation);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="form-label">Delete account</p>
      <p className="form-hint">
        Permanently removes your account, posts, and credits. This can’t be
        undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 text-xs text-ink-faint underline-offset-4 transition duration-200 hover:text-ink-muted hover:underline"
        >
          Delete account
        </button>
      ) : (
        <form className="mt-4 max-w-sm space-y-3" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="delete-account-confirm"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              {hasUsername
                ? `Type “${username}” to confirm`
                : "Type DELETE to confirm"}
            </label>
            <input
              id="delete-account-confirm"
              name="confirmation"
              type="text"
              autoComplete="off"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              placeholder={confirmLabel}
              aria-describedby="delete-account-hint"
              className="form-input py-2 text-sm"
            />
            <p id="delete-account-hint" className="mt-1.5 text-[0.7rem] text-ink-faint">
              {hasUsername
                ? "Enter your username exactly."
                : "Enter DELETE in all caps."}
            </p>
          </div>

          {error && (
            <p role="alert" className="form-alert-error text-xs">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending || !confirmation.trim()}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-sand bg-cream px-3.5 text-xs font-medium text-ink-muted transition duration-200 hover:border-terracotta/40 hover:text-terracotta-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <Spinner />}
              {pending ? "Deleting…" : "Delete account"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setError(null);
              }}
              className="text-xs text-ink-faint underline-offset-4 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
