import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadReferralSummary, referralToken } from "@/lib/referrals";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo";
import ReferralInvite from "@/app/components/ReferralInvite";

export const metadata: Metadata = {
  title: "Referrals",
  description:
    "Invite makers to Creators Connection and earn credits when they publish their first product.",
  // Signed-in only, so keep it out of search results.
  robots: PRIVATE_PAGE_ROBOTS,
};

export default async function ReferralsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/referrals");
  }

  const [{ data: profile }, summary] = await Promise.all([
    supabase.from("users").select("username").eq("id", user.id).maybeSingle(),
    loadReferralSummary(supabase),
  ]);

  const token = referralToken(profile?.username ?? null, user.id);

  return (
    <div>
      <section className="px-5 pb-10 pt-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-sage">Invite a maker</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Bring someone <em className="italic text-terracotta">good</em> along
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted">
            Share your link with a maker whose work belongs here. When they
            publish their first product, you both earn credits you can spend on
            boosts.
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <ReferralInvite token={token} summary={summary} />
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-ink-muted">
            Want the full picture on credits and boosts?
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/how-it-works#credits" className="btn-secondary">
              How It Works
            </Link>
            <Link href="/settings" className="btn-secondary">
              Settings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
