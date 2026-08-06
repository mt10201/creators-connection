import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirrors public.daily_earn_cap() in supabase/fairness_caps.sql. */
export const CREDIT_DAILY_EARN_CAP = 12;

/** Human labels for every reason written to the credit ledger. */
export const CREDIT_REASON_LABELS: Record<string, string> = {
  signup_bonus: "Welcome bonus",
  post_created: "New product link",
  engagement_like: "Like on your post",
  engagement_save: "Save on your post",
  post_deleted: "Post deleted",
  boost_purchase: "Boost purchase",
};

export type WalletTransaction = {
  id: string;
  amount: number;
  label: string;
  /** Preformatted on the server so hydration cannot disagree on locale. */
  when: string;
  vesting: boolean;
  /** When a vesting row becomes spendable; null once it already has. */
  unlocksAt: string | null;
};

export type Wallet = {
  spendable: number;
  vesting: number;
  total: number;
  /** Formatted unlock time of the next vesting batch, null when none. */
  nextVestingAt: string | null;
  transactions: WalletTransaction[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const unlockFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function labelForReason(reason: string): string {
  return CREDIT_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

function formatUnlock(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? unlockFormatter.format(date) : null;
}

/**
 * Spendable = vested rows only. `credit_balance` on users stays the lifetime
 * total, so the wallet reads the ledger instead of the denormalised column.
 */
export async function loadWallet(
  supabase: SupabaseClient,
  fallbackBalance = 0,
  { limit = 6 }: { limit?: number } = {}
): Promise<Wallet> {
  const [{ data: summary, error: summaryError }, { data: rows, error: rowsError }] =
    await Promise.all([
      supabase.rpc("my_credit_summary").maybeSingle(),
      supabase
        .from("credit_transactions")
        .select("id, amount, reason, created_at, available_at")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  if (summaryError) {
    console.error("Failed to load credit summary:", summaryError.message);
  }
  if (rowsError) {
    console.error("Failed to load credit transactions:", rowsError.message);
  }

  const now = Date.now();
  const transactions: WalletTransaction[] = (rows ?? []).map((row) => {
    const amount = (row.amount as number) ?? 0;
    const availableAt = row.available_at as string | null;
    const vesting =
      amount > 0 && new Date(availableAt ?? 0).getTime() > now;

    return {
      id: row.id as string,
      amount,
      label: labelForReason((row.reason as string) ?? ""),
      when: dateFormatter.format(new Date(row.created_at as string)),
      vesting,
      unlocksAt: vesting ? formatUnlock(availableAt) : null,
    };
  });

  const typed = summary as
    | {
        spendable: number;
        vesting: number;
        total: number;
        next_vesting_at: string | null;
      }
    | null;

  return {
    spendable: typed?.spendable ?? fallbackBalance,
    vesting: typed?.vesting ?? 0,
    total: typed?.total ?? fallbackBalance,
    nextVestingAt: formatUnlock(typed?.next_vesting_at ?? null),
    transactions,
  };
}
