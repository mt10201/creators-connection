"use client";

import { useEffect, useState } from "react";
import { buildReferralLink, configuredReferralOrigin } from "@/lib/referrals";

/**
 * Read-only referral URL with a copy button. Shared by /referrals and Settings.
 *
 * Origin resolution: NEXT_PUBLIC_SITE_URL wins when set, otherwise the current
 * browser origin. Deployed builds therefore never surface a localhost URL, and
 * a dev build without the env var still copies something that works locally.
 */
export default function ReferralLinkField({
  token,
  size = "md",
}: {
  token: string;
  size?: "md" | "sm";
}) {
  // Starts with the configured origin only, so server and client first render
  // agree; the effect fills in window.location.origin when there is no env var.
  const [origin, setOrigin] = useState<string | null>(configuredReferralOrigin);
  const [copied, setCopied] = useState(false);
  const small = size === "sm";

  useEffect(() => {
    setOrigin((current) => current ?? window.location.origin);
  }, []);

  const link = buildReferralLink(token, origin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        buildReferralLink(token, origin ?? window.location.origin)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the input stays selectable instead.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        readOnly
        value={link}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Your referral link"
        className={`form-input mt-0 sm:flex-1 ${small ? "py-2 text-xs" : ""}`}
      />
      <button
        type="button"
        onClick={copy}
        className={`btn-secondary shrink-0 ${
          small ? "px-4 text-xs" : "sm:min-w-[7.5rem]"
        }`}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Referral link copied" : ""}
      </span>
    </div>
  );
}
