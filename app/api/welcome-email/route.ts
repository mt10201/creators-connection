import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/welcome";

/**
 * Sends the welcome email once per account.
 *
 * The recipient is taken from the caller's own session, never from the request
 * body, so this can't be used to mail arbitrary addresses. The claim row in
 * welcome_email_claims is the lock: inserting it is what wins the right to
 * send, which makes a double-fired signup harmless.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Both are required: one to send, one to write the send lock past RLS.
  if (!emailConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    // Nothing configured locally; treat as a no-op so signup isn't noisy.
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }

  const admin = createAdminClient();

  // Claim first. An existing row means someone already sent it.
  const { data: claim, error: claimError } = await admin
    .from("welcome_email_claims")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true })
    .select("user_id")
    .maybeSingle();

  if (claimError) {
    console.error("Welcome email claim failed:", claimError.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (!claim) {
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { subject, text, html } = welcomeEmail(profile?.username ?? null);
  const result = await sendEmail({ to: user.email, subject, text, html });

  if (!result.ok) {
    // Release the claim so a later attempt can retry.
    await admin.from("welcome_email_claims").delete().eq("user_id", user.id);
    console.error("Welcome email send failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
