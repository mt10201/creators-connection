import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirrors public.daily_earn_cap() in supabase/fairness_caps.sql. */
export const CREDIT_DAILY_EARN_CAP = 12;

/** Human labels for every reason written to the credit ledger. */
export const CREDIT_REASON_LABELS: Record<string, string> = {
  signup_bonus: "Welcome bonus",
  post_created: "New product link",
  engagement_like: "Someone liked your post",
  engagement_save: "Someone saved your post",
  post_deleted: "Post deleted",
  boost_purchase: "Boost purchased",
};

export type WalletTransaction = {
  id: string;
  amount: number;
  label: string;
  /** Preformatted on the server so hydration cannot disagree on locale. */
  when: string;
  vesting: boolean;
};

export type Wallet = {
  spendable: number;
  vesting: number;
  total: number;
  transactions: WalletTransaction[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function labelForReason(reason: string): string {
  return CREDIT_REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

/**
 * Spendable = vested rows only. `credit_balance` on users stays the lifetime
 * total, so the wallet reads the ledger instead of the denormalised column.
 */
export async function loadWallet(
  supabase: SupabaseClient,
  fallbackBalance = 0
): Promise<Wallet> {
  const [{ data: summary, error: summaryError }, { data: rows, error: rowsError }] =
    await Promise.all([
      supabase.rpc("my_credit_summary").maybeSingle(),
      supabase
        .from("credit_transactions")
        .select("id, amount, reason, created_at, available_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  if (summaryError) {
    console.error("Failed to load credit summary:", summaryError.message);
  }
  if (rowsError) {
    console.error("Failed to load credit transactions:", rowsError.message);
  }

  const now = Date.now();
  const transactions: WalletTransaction[] = (rows ?? []).map((row) => ({
    id: row.id as string,
    amount: (row.amount as number) ?? 0,
    label: labelForReason((row.reason as string) ?? ""),
    when: dateFormatter.format(new Date(row.created_at as string)),
    vesting:
      (row.amount as number) > 0 &&
      new Date(row.available_at as string).getTime() > now,
  }));

  const typed = summary as
    | { spendable: number; vesting: number; total: number }
    | null;

  return {
    spendable: typed?.spendable ?? fallbackBalance,
    vesting: typed?.vesting ?? 0,
    total: typed?.total ?? fallbackBalance,
    transactions,
  };
}
