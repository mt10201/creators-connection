"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "./Spinner";

export default function LogoutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-sand bg-cream px-4 text-sm text-ink-muted transition duration-200 ease-out hover:border-terracotta/40 hover:text-terracotta active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
