import Link from "next/link";
import type { Wallet } from "@/lib/wallet";

type Props = {
  wallet: Wallet;
  className?: string;
};

function creditWord(count: number) {
  return Math.abs(count) === 1 ? "credit" : "credits";
}

export default function CreditWallet({ wallet, className = "" }: Props) {
  const { spendable, vesting, nextVestingAt, transactions } = wallet;

  return (
    <details className={`group relative ${className}`}>
      <summary
        title={`${spendable} spendable ${creditWord(spendable)}`}
        className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-full border border-ochre/30 bg-ochre/10 px-2.5 py-1 text-xs font-semibold text-ochre transition duration-200 hover:border-ochre/60 [&::-webkit-details-marker]:hidden"
      >
        {spendable} {creditWord(spendable)}
        <span
          aria-hidden
          className="text-[0.6rem] transition-transform duration-200 group-open:rotate-180"
        >
          ▾
        </span>
        <span className="sr-only">Open wallet</span>
      </summary>

      <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-sand bg-cream shadow-lift">
        <div className="border-b border-sand px-4 py-3">
          <span className="eyebrow text-ink-faint">Wallet</span>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {spendable}{" "}
            <span className="text-sm font-normal text-ink-muted">
              spendable {creditWord(spendable)}
            </span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {vesting > 0
              ? `${vesting} more ${creditWord(vesting)} vesting${
                  nextVestingAt ? ` — next unlocks ${nextVestingAt}` : ""
                }.`
              : "Credits become spendable 24 hours after you earn them."}
          </p>
        </div>

        <div className="px-4 py-3">
          <span className="eyebrow text-ink-faint">Recent activity</span>
          {transactions.length === 0 ? (
            <p className="mt-2 text-xs text-ink-faint">
              Nothing yet — earnings show up here.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-ink-muted">
                    {tx.label}
                    {tx.vesting && (
                      <span
                        title={
                          tx.unlocksAt
                            ? `Becomes spendable ${tx.unlocksAt}`
                            : undefined
                        }
                        className="ml-1 text-ink-faint"
                      >
                        · vesting
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-ink-faint">{tx.when}</span>
                  <span
                    className={`w-9 shrink-0 text-right font-semibold ${
                      tx.amount >= 0 ? "text-sage" : "text-terracotta"
                    }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-sand px-4 py-3">
          <Link
            href="/how-it-works#credits"
            className="text-xs text-terracotta underline-offset-4 hover:underline"
          >
            How credits work →
          </Link>
        </div>
      </div>
    </details>
  );
}
