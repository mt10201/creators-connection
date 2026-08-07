import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  RESET_PASSWORD_PATH,
  RESET_PENDING_COOKIE,
} from "@/lib/auth-recovery";
import { isAuthRoute, isProtectedRoute } from "./routes";

const CALLBACK_PATH = "/auth/callback";

/**
 * Supabase ignores `redirect_to` unless the exact URL is on the project's
 * redirect allow list, falling back to the Site URL — so a recovery link can
 * land on the homepage with its `?code=` intact and nothing to handle it.
 *
 * This forwards any stray verification params to /auth/callback, which does the
 * real exchange. Intent comes from `type=recovery` when present, or from the
 * cookie set when this browser requested the reset email.
 */
function rescueAuthParams(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === CALLBACK_PATH || pathname.startsWith("/api/")) return null;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!code && !(tokenHash && type)) return null;

  const target = request.nextUrl.clone();
  target.pathname = CALLBACK_PATH;
  target.search = "";

  if (code) target.searchParams.set("code", code);
  if (tokenHash) target.searchParams.set("token_hash", tokenHash);
  if (type) target.searchParams.set("type", type);

  const isRecovery =
    type === "recovery" ||
    request.cookies.get(RESET_PENDING_COOKIE)?.value === "1";

  if (isRecovery) target.searchParams.set("next", RESET_PASSWORD_PATH);

  return NextResponse.redirect(target);
}

export async function updateSession(request: NextRequest) {
  const rescued = rescueAuthParams(request);
  if (rescued) return rescued;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token and keeps the cookie in sync. Do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/explore";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
