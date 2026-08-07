import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  RECOVERY_COOKIE,
  RESET_PASSWORD_PATH,
  RESET_PENDING_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth-recovery";

const DEFAULT_NEXT = "/explore";

/** Only same-origin paths, so an email link can't become an open redirect. */
function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_NEXT;
}

function absolute(request: NextRequest, path: string) {
  const url = new URL(path, request.nextUrl.origin);
  // Behind a proxy, request.url can carry the internal host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost && process.env.NODE_ENV === "production") {
    url.protocol = "https:";
    url.host = forwardedHost;
  }
  return url;
}

/**
 * Lands every Supabase email link (signup confirmation, password recovery).
 * Handles both the PKCE `code` flow and the `token_hash` flow that custom
 * email templates use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let verified = false;

  if (code || (tokenHash && type)) {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      verified = !error;
      if (error) console.error("Auth callback exchange failed:", error.message);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      verified = !error;
      if (error) console.error("Auth callback verify failed:", error.message);
    }
  }

  if (!verified) {
    return NextResponse.redirect(
      absolute(request, "/login?notice=link_invalid")
    );
  }

  if (next === RESET_PASSWORD_PATH || type === "recovery") {
    const cookieStore = await cookies();
    cookieStore.set(RECOVERY_COOKIE, "1", recoveryCookieOptions);
    cookieStore.delete(RESET_PENDING_COOKIE);
    return NextResponse.redirect(absolute(request, RESET_PASSWORD_PATH));
  }

  return NextResponse.redirect(absolute(request, next));
}
