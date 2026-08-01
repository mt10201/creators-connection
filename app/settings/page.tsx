import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForms from "./SettingsForms";

export const metadata: Metadata = {
  title: "Account Settings | Creators Connection",
  description: "Update your username and password.",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/settings");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, credit_balance")
    .eq("id", user.id)
    .maybeSingle();

  const username =
    profile?.username?.trim() ||
    (user.user_metadata?.username as string | undefined)?.trim() ||
    "";
  const email = user.email?.trim() || "—";
  const credits = profile?.credit_balance ?? 0;
  const profileHref = username
    ? `/profile/${encodeURIComponent(username)}`
    : null;

  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-2xl">
          <span className="eyebrow text-sage">Your account</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Settings
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
            Update the details you show the community, and keep your sign-in
            secure.
          </p>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Read-only account snapshot */}
          <div className="rounded-[2rem] border border-sand bg-cream p-6 shadow-soft sm:p-8">
            <span className="eyebrow text-sage">Overview</span>
            <ul className="mt-5 space-y-5">
              <li>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Email
                </p>
                <p className="mt-1.5 text-base text-ink">{email}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Email can’t be changed from this page yet. Contact support if
                  you need a different address.
                </p>
              </li>
              <li className="border-t border-sand pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Credit balance
                </p>
                <p className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink">
                  {credits}
                  <span className="ml-2 text-base font-medium text-ink-muted">
                    {credits === 1 ? "credit" : "credits"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Earn 5 credits each time you publish a product.
                </p>
              </li>
            </ul>

            {profileHref && (
              <Link
                href={profileHref}
                className="mt-6 inline-flex text-sm text-terracotta underline-offset-4 transition hover:underline"
              >
                View public profile →
              </Link>
            )}
          </div>

          <SettingsForms initialUsername={username} />
        </div>
      </section>
    </div>
  );
}
