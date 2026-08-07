"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RECOVERY_API_PATH,
  RESET_PASSWORD_PATH,
  isRecoveryHash,
  recoveryHashError,
} from "@/lib/auth-recovery";

/**
 * Catches a password-recovery link that arrives in the URL fragment.
 *
 * Projects on the implicit flow send tokens as `#access_token=...&type=recovery`
 * instead of `?code=`. A fragment never reaches the server, so middleware can't
 * help: only the browser can see it. Mounted globally because Supabase drops
 * recovery links on the Site URL whenever `redirect_to` isn't allow-listed,
 * which means this can land on any route.
 *
 * The `?code=` flow is handled server-side in /auth/callback and never gets
 * here.
 */
export default function RecoveryLinkCatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const hash = window.location.hash;

    const failure = recoveryHashError(hash);
    if (failure) {
      handled.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      router.replace("/login?notice=link_invalid");
      return;
    }

    if (!isRecoveryHash(hash)) return;
    handled.current = true;

    // Instantiating the client lets supabase-js exchange the fragment for a
    // session and write it to cookies, which is what the server then reads.
    const supabase = createClient();

    async function claim() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?notice=link_invalid");
        return;
      }

      const response = await fetch(RECOVERY_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "confirm" }),
      });

      // Drop the tokens from the address bar either way.
      window.history.replaceState(null, "", window.location.pathname);

      if (!response.ok) {
        router.replace("/forgot-password?notice=link_unverified");
        return;
      }

      if (pathname === RESET_PASSWORD_PATH) {
        // Already in the right place; re-render so the server sees the cookie.
        router.refresh();
      } else {
        router.replace(RESET_PASSWORD_PATH);
      }
    }

    void claim();
  }, [pathname, router]);

  return null;
}
