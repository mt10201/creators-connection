import type { WalletTransaction } from "@/lib/wallet";

export default function CreditActivity({
  transactions,
}: {
  transactions: WalletTransaction[];
}) {
  return (
    <section
      aria-label="Recent credit activity"
      className="mt-6 rounded-[1.5rem] border border-sand bg-parchment/60 px-6 py-5 shadow-soft sm:px-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow text-sage">Recent credit activity</span>
        {transactions.length > 0 && (
          <span className="text-xs text-ink-faint">
            Newest first · dates in UTC
          </span>
        )}
      </div>

      {transactions.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          No credit activity yet. Your welcome bonus and anything you earn will
          show up here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-sand">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 flex-1 text-sm text-ink">
                {tx.label}
                {tx.vesting && (
                  <span
                    title={
                      tx.unlocksAt
                        ? `Becomes spendable ${tx.unlocksAt}`
                        : undefined
                    }
                    className="ml-2 inline-flex items-center rounded-full bg-sand/70 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint"
                  >
                    Vesting
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                {tx.when}
              </span>
              <span
                className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${
                  tx.amount >= 0 ? "text-sage" : "text-terracotta"
                }`}
              >
                {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
