import Link from "next/link";
import { formatBoostCountdown, type OwnedBoost } from "@/lib/boosts";

const endsAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export default function BoostManager({ boosts }: { boosts: OwnedBoost[] }) {
  return (
    <section
      aria-label="Your boosts"
      className="mt-6 rounded-[1.5rem] border border-ochre/25 bg-ochre/5 px-6 py-5 sm:px-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow text-ochre">Active boosts</span>
        <Link
          href="/how-explore-ranks"
          className="text-xs text-ink-faint underline-offset-4 hover:text-terracotta hover:underline"
        >
          How boosts work
        </Link>
      </div>

      {boosts.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          No active boosts.{" "}
          <Link
            href="/explore"
            className="text-terracotta underline-offset-4 hover:underline"
          >
            Browse Explore
          </Link>{" "}
          or{" "}
          <Link
            href="/upload"
            className="text-terracotta underline-offset-4 hover:underline"
          >
            share something new
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {boosts.map((boost) => (
            <li
              key={boost.id}
              className="flex flex-col gap-3 rounded-[1.25rem] border border-sand bg-cream px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-ochre px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-cream">
                    {boost.label}
                  </span>
                  <span className="eyebrow text-sage">
                    {boost.productName}
                  </span>
                </div>
                <h3 className="mt-1.5 truncate font-display text-base font-semibold tracking-tight">
                  <Link
                    href={`/products/${boost.postId}`}
                    className="transition duration-200 hover:text-terracotta"
                  >
                    {boost.postTitle ?? "Untitled product"}
                  </Link>
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-6 sm:justify-end">
                <div>
                  <p className="text-sm font-medium tabular-nums text-ink">
                    {formatBoostCountdown(boost.endsAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Ends {endsAtFormatter.format(new Date(boost.endsAt))}
                  </p>
                </div>

                {boost.impressions !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {boost.impressions.toLocaleString("en-US")}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {boost.impressions === 1 ? "view" : "views"} delivered
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
