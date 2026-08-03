"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBoostErrorMessage } from "@/lib/boosts";

export type PurchaseBoostResult =
  | {
      ok: true;
      label: string;
      costCredits: number;
      endsAt: string;
      spendableAfter: number;
    }
  | { ok: false; error: string };

type PurchaseBoostPayload = {
  boost_id: string;
  product_slug: string;
  label: string;
  cost_credits: number;
  ends_at: string;
  spendable_after: number;
};

/**
 * Spending is enforced entirely inside purchase_boost(): ownership, caps,
 * eligibility, and the vested-balance check all run in one transaction.
 */
export async function purchaseBoost(
  postId: string,
  productSlug: string
): Promise<PurchaseBoostResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to boost a post." };
  }

  const { data, error } = await supabase.rpc("purchase_boost", {
    p_post_id: postId,
    p_product_slug: productSlug,
  });

  if (error) {
    return {
      ok: false,
      error: getBoostErrorMessage(
        [error.message, error.details, error.hint].filter(Boolean).join(" ")
      ),
    };
  }

  const payload = data as PurchaseBoostPayload | null;
  if (!payload) {
    return { ok: false, error: "Could not buy that boost. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath(`/products/${postId}`);

  return {
    ok: true,
    label: payload.label,
    costCredits: payload.cost_credits,
    endsAt: payload.ends_at,
    spendableAfter: payload.spendable_after,
  };
}
