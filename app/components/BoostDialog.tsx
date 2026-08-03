"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseBoost } from "@/app/actions/boosts";
import type { BoostProduct } from "@/lib/boosts";
import Spinner from "./Spinner";

type Props = {
  postId: string;
  products: BoostProduct[];
  /** Vested credits only — the RPC enforces the same number server-side. */
  spendable: number;
  triggerLabel?: string;
  triggerClassName?: string;
};

function hoursLabel(hours: number) {
  if (hours < 24) return `${hours} hours`;
  const days = hours / 24;
  return days === 1 ? "24 hours" : `${days} days`;
}

export default function BoostDialog({
  postId,
  products,
  spendable,
  triggerLabel = "Boost this post",
  triggerClassName = "inline-flex min-h-11 items-center rounded-full border border-ochre/40 bg-ochre/10 px-4 text-sm font-medium text-ochre transition duration-200 hover:border-ochre hover:bg-ochre/20",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(products[0]?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  if (products.length === 0) return null;

  const product = products.find((item) => item.slug === selected) ?? products[0];
  const canAfford = spendable >= product.cost_credits;

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await purchaseBoost(postId, product.slug);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(
        `${result.label} is live. It runs until ${new Date(
          result.endsAt
        ).toLocaleString()}.`
      );
      router.refresh();
    });
  }

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
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
            if (event.target === event.currentTarget && !pending) close();
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

            {success ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {success}
                </p>
                <div className="mt-7 flex justify-end">
                  <button type="button" onClick={close} className="btn-primary">
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Boosts place your post in clearly labeled, reserved slots for
                  a fixed window. They never change organic ranking or search
                  results.
                </p>

                <p className="mt-3 text-sm text-ink-muted">
                  You have{" "}
                  <span className="font-semibold text-ink">
                    {spendable} spendable {spendable === 1 ? "credit" : "credits"}
                  </span>
                  .
                </p>

                <fieldset className="mt-5 space-y-3">
                  <legend className="sr-only">Choose a boost</legend>
                  {products.map((item) => {
                    const affordable = spendable >= item.cost_credits;
                    return (
                      <label
                        key={item.slug}
                        className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition duration-200 ${
                          selected === item.slug
                            ? "border-ochre bg-ochre/10"
                            : "border-sand bg-parchment/50 hover:border-ochre/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="boost-product"
                          value={item.slug}
                          checked={selected === item.slug}
                          onChange={() => setSelected(item.slug)}
                          disabled={pending}
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
                            Runs for {hoursLabel(item.duration_hours)} · labeled
                            “{item.label}”
                            {!affordable && " · not enough credits yet"}
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
                    onClick={close}
                    disabled={pending}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={pending || !canAfford}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
