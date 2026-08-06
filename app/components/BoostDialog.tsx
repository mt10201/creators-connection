"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseBoost } from "@/app/actions/boosts";
import {
  FRESH_PUSH_SLUG,
  FRESH_PUSH_TOO_OLD_REASON,
  getBoostBlockers,
  getBoostErrorMessage,
  isFreshPushEligible,
  type BoostablePost,
  type BoostProduct,
} from "@/lib/boosts";
import Spinner from "./Spinner";

export type BoostPurchaseInfo = {
  productName: string;
  durationHours: number;
  label: string;
  endsAt: string;
};

type Props = {
  postId: string;
  products: BoostProduct[];
  /** Vested credits only — the RPC enforces the same number server-side. */
  spendable: number;
  /** Drives the quality check and the Fresh Push 24h window. */
  post?: BoostablePost | null;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Called on success so the parent can keep a dismissible banner after refresh. */
  onPurchased?: (info: BoostPurchaseInfo) => void;
};

function hoursLabel(hours: number) {
  if (hours < 24) return `${hours} hours`;
  const days = hours / 24;
  return days === 1 ? "24 hours" : `${days} days`;
}

function productDisabledReason(
  item: BoostProduct,
  freshPushOk: boolean
): string | null {
  if (item.slug === FRESH_PUSH_SLUG && !freshPushOk) {
    return FRESH_PUSH_TOO_OLD_REASON;
  }
  return null;
}

export default function BoostDialog({
  postId,
  products,
  spendable,
  post = null,
  triggerLabel = "Boost this post",
  triggerClassName = "inline-flex min-h-11 items-center rounded-full border border-ochre/40 bg-ochre/10 px-4 text-sm font-medium text-ochre transition duration-200 hover:border-ochre hover:bg-ochre/20",
  onPurchased,
}: Props) {
  const router = useRouter();
  const blockers = post ? getBoostBlockers(post) : [];
  const freshPushOk = isFreshPushEligible(post?.created_at);
  const firstSelectable =
    products.find((item) => !productDisabledReason(item, freshPushOk)) ??
    products[0];

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(firstSelectable?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, pending]);

  // If Fresh Push becomes ineligible while selected, move the radio to the
  // next available product so the user isn't stuck on a disabled option.
  useEffect(() => {
    const current = products.find((item) => item.slug === selected);
    if (current && !productDisabledReason(current, freshPushOk)) return;
    if (firstSelectable?.slug) setSelected(firstSelectable.slug);
  }, [selected, products, freshPushOk, firstSelectable?.slug]);

  if (products.length === 0) return null;

  const product = products.find((item) => item.slug === selected) ?? products[0];
  const selectedDisabledReason = productDisabledReason(product, freshPushOk);
  const canAfford = spendable >= product.cost_credits;
  const canBuy = canAfford && !selectedDisabledReason && blockers.length === 0;

  function confirm() {
    if (blockers.length > 0) {
      setError(blockers[0]);
      return;
    }

    if (selectedDisabledReason) {
      setError(getBoostErrorMessage("BOOST_POST_TOO_OLD"));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await purchaseBoost(postId, product.slug);

      if (!result.ok) {
        setError(getBoostErrorMessage(result.error));
        return;
      }

      // The confirmation lives in the parent's banner, which stays mounted
      // across router.refresh() — the dialog itself unmounts once the post
      // shows an active boost, so it can't own the message.
      onPurchased?.({
        productName: product.name,
        durationHours: product.duration_hours,
        label: result.label,
        endsAt: result.endsAt,
      });
      setOpen(false);
      // Refresh in place — never navigate away from the current page.
      router.refresh();
    });
  }

  function closeChooser() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="boost-dialog-title"
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeChooser();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-card border border-sand bg-cream p-6 shadow-lift sm:p-7">
            <span className="eyebrow text-ochre">Spend credits</span>
            <h2
              id="boost-dialog-title"
              className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight"
            >
              Boost this post
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Boosts place your post in clearly labeled, reserved slots for a
              fixed window. They never change organic ranking or search results.
            </p>

            <p className="mt-3 text-sm text-ink-muted">
              You have{" "}
              <span className="font-semibold text-ink">
                {spendable} spendable {spendable === 1 ? "credit" : "credits"}
              </span>
              .
            </p>

            {blockers.length > 0 && (
              <div className="mt-5 rounded-2xl border border-clay/40 bg-parchment/70 p-4">
                <p className="text-sm font-medium text-ink">
                  Finish this post before boosting it
                </p>
                <ul className="mt-2 space-y-1.5">
                  {blockers.map((blocker) => (
                    <li
                      key={blocker}
                      className="flex items-start gap-2 text-sm leading-relaxed text-ink-muted"
                    >
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay"
                      />
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">Choose a boost</legend>
              {products.map((item) => {
                const affordable = spendable >= item.cost_credits;
                const disabledReason = productDisabledReason(item, freshPushOk);
                const disabled = Boolean(disabledReason) || pending;

                return (
                  <label
                    key={item.slug}
                    className={`flex gap-3 rounded-2xl border p-4 transition duration-200 ${
                      disabled
                        ? "cursor-not-allowed border-sand bg-parchment/30 opacity-70"
                        : selected === item.slug
                          ? "cursor-pointer border-ochre bg-ochre/10"
                          : "cursor-pointer border-sand bg-parchment/50 hover:border-ochre/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="boost-product"
                      value={item.slug}
                      checked={selected === item.slug}
                      onChange={() => {
                        if (!disabledReason) setSelected(item.slug);
                      }}
                      disabled={disabled}
                      className="mt-1 h-4 w-4 accent-ochre"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-base font-semibold text-ink">
                          {item.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-ochre">
                          {item.cost_credits}{" "}
                          {item.cost_credits === 1 ? "credit" : "credits"}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                        {item.description}
                      </span>
                      <span className="mt-1 block text-xs text-ink-faint">
                        Runs for {hoursLabel(item.duration_hours)} · labeled “
                        {item.label}”
                        {disabledReason
                          ? ` · ${disabledReason}`
                          : !affordable
                            ? " · not enough credits yet"
                            : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {error && (
              <p role="alert" className="form-alert-error mt-5">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeChooser}
                disabled={pending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending || !canBuy}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending
                  ? "Buying…"
                  : `Spend ${product.cost_credits} ${
                      product.cost_credits === 1 ? "credit" : "credits"
                    }`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
