import Link from "next/link";
import {
  REFERRAL_NEW_MAKER_CREDITS,
  REFERRAL_REFERRER_CREDITS,
  type ReferralSummary,
} from "@/lib/referrals";
import { CREDIT_DAILY_EARN_CAP } from "@/lib/wallet";
import ReferralLinkField from "./ReferralLinkField";

/**
 * The invite UI, shared by /referrals (full) and Settings → Referrals
 * (compact, which links out to the full page instead of repeating it).
 */
export default function ReferralInvite({
  token,
  summary,
  compact = false,
}: {
  token: string;
  summary: ReferralSummary;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div>
        <p className="form-label">Your referral link</p>
        <p className="form-hint">
          Anyone who signs up through this link is credited to you.
        </p>

        <div className="mt-3">
          <ReferralLinkField token={token} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink">
            +{REFERRAL_REFERRER_CREDITS} to you
          </span>{" "}
          and{" "}
          <span className="font-semibold text-ink">
            +{REFERRAL_NEW_MAKER_CREDITS} to them
          </span>{" "}
          when someone you invited publishes their first product.
        </p>

        <div className="mt-5 border-t border-sand pt-5">
          <ReferralStats summary={summary} />
        </div>

        <Link
          href="/referrals"
          className="mt-5 inline-block text-sm text-terracotta underline-offset-4 transition hover:underline"
        >
          Referral details →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sand bg-cream p-6 shadow-soft sm:p-7">
      <p className="form-label">Your referral link</p>
      <p className="form-hint">
        Anyone who signs up through this link is credited to you.
      </p>

      <div className="mt-3">
        <ReferralLinkField token={token} />
      </div>

      <div className="mt-7 rounded-[1.25rem] border border-sage/25 bg-sage-soft/40 px-5 py-4">
        <span className="eyebrow text-sage">How it pays out</span>
        <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>
            <span className="font-semibold text-ink">
              +{REFERRAL_REFERRER_CREDITS} to you
            </span>{" "}
            when someone you invited publishes their first product — once per
            person.
          </li>
          <li>
            <span className="font-semibold text-ink">
              +{REFERRAL_NEW_MAKER_CREDITS} to them
            </span>{" "}
            on that same first post, on top of the welcome bonus and post credit
            every new maker gets.
          </li>
          <li>
            Referral credits vest for 24 hours and count toward the{" "}
            {CREDIT_DAILY_EARN_CAP}-credit daily earn cap, like everything else.
          </li>
        </ul>
      </div>

      <div className="mt-7 border-t border-sand pt-6">
        <ReferralStats summary={summary} />
        {summary.signedUp === 0 && (
          <p className="form-hint">
            No sign-ups yet — share your link with makers you know.
          </p>
        )}
      </div>
    </div>
  );
}

function ReferralStats({ summary }: { summary: ReferralSummary }) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      <Stat label="Signed up" value={summary.signedUp} />
      <Stat label="Published" value={summary.activated} />
      <Stat label="Credits earned" value={summary.creditsEarned} />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}
