"use client";

import { useState } from "react";
import {
  formatBoostTimeLeft,
  type ActiveBoost,
  type BoostProduct,
} from "@/lib/boosts";
import BoostDialog from "./BoostDialog";

type Props = {
  postId: string;
  products: BoostProduct[];
  spendable: number;
  activeBoost: ActiveBoost | null;
};

export default function OwnerBoostPanel({
  postId,
  products,
  spendable,
  activeBoost,
}: Props) {
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="mt-5 rounded-2xl border border-ochre/30 bg-ochre/5 px-5 py-4">
      {banner && (
        <div
          role="status"
          className="form-alert-success mb-4 flex items-start justify-between gap-3"
        >
          <p className="text-sm leading-relaxed">{banner}</p>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="shrink-0 text-xs font-medium underline-offset-4 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeBoost ? (
        <>
          <span className="inline-flex items-center rounded-full bg-ochre px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-cream">
            {activeBoost.label}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            This post is running a boost —{" "}
            {formatBoostTimeLeft(activeBoost.ends_at)}. Buyers see the label
            too, and organic ranking is unchanged.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-ink-muted">
            Spend earned credits to place this post in a labeled, reserved slot
            for a fixed window. You have{" "}
            <span className="font-semibold text-ink">
              {spendable} spendable {spendable === 1 ? "credit" : "credits"}
            </span>
            .
          </p>
          <div className="mt-3">
            <BoostDialog
              postId={postId}
              products={products}
              spendable={spendable}
              onPurchased={({ productName, durationHours, label }) => {
                setBanner(
                  `${productName} is live for ${durationHours} hours (labeled “${label}”).`
                );
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
