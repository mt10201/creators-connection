import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RECOVERY_COOKIE,
  RESET_PENDING_COOKIE,
  recoveryCookieOptions,
  resetPendingCookieOptions,
  type RecoveryIntent,
} from "@/lib/auth-recovery";

/**
 * Two small steps of the password-reset flow that the browser has to drive.
 *
 * - `pending`: remembers that this browser asked for a reset email, so a link
 *   that comes back without its `next` param can still be recognised.
 * - `confirm`: for projects on the implicit flow, where the recovery tokens
 *   arrive in the URL fragment and /auth/callback never runs. The Supabase
 *   client has already turned that fragment into a session by the time this is
 *   called; we only mark it as recovery-derived.
 */
export async function POST(request: NextRequest) {
  let intent: RecoveryIntent | null = null;

  try {
    const body = (await request.json()) as { intent?: RecoveryIntent };
    intent = body.intent ?? null;
  } catch {
    intent = null;
  }

  const cookieStore = await cookies();

  if (intent === "pending") {
    cookieStore.set(RESET_PENDING_COOKIE, "1", resetPendingCookieOptions);
    return NextResponse.json({ ok: true });
  }

  if (intent === "confirm") {
    // Requires both a live session and proof this browser requested the reset.
    // Without the second check, any signed-in session could claim recovery
    // status and bypass the current-password check. A reset triggered from the
    // Supabase dashboard therefore won't satisfy this — request the link from
    // /forgot-password instead.
    if (cookieStore.get(RESET_PENDING_COOKIE)?.value !== "1") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    cookieStore.set(RECOVERY_COOKIE, "1", recoveryCookieOptions);
    cookieStore.delete(RESET_PENDING_COOKIE);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
