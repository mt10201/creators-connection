import type { Metadata } from "next";
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
      <section className="px-5 pb-6 pt-10 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-xl">
          <span className="eyebrow text-sage">Your account</span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            Update your public details and sign-in password.
          </p>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto max-w-xl">
          <SettingsForms
            initialUsername={username}
            email={email}
            credits={credits}
            profileHref={profileHref}
          />
        </div>
      </section>
    </div>
  );
}
