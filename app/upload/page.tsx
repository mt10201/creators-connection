import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadBoostProducts } from "@/lib/boosts";
import UploadForm from "./UploadForm";

export const metadata: Metadata = {
  title: "Upload Product",
  description: "Share your work with the Creators Connection community.",
};

export default async function UploadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route; this is a second check so the page is
  // never rendered without a user id to attach the post to.
  if (!user) {
    redirect("/login?redirectTo=/upload");
  }

  const [boostProducts, { data: summary }] = await Promise.all([
    loadBoostProducts(supabase),
    supabase.rpc("my_credit_summary").maybeSingle(),
  ]);

  return (
    <UploadForm
      userId={user.id}
      freshPush={
        boostProducts.find((product) => product.slug === "fresh_push") ?? null
      }
      spendable={(summary as { spendable: number } | null)?.spendable ?? 0}
    />
  );
}
