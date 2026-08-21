import { Resend } from "resend";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

/**
 * Resend wrapper. Server-only: RESEND_API_KEY must never reach the client.
 *
 * Email is optional infrastructure — if the key isn't configured (local dev,
 * a fork), sending is skipped rather than throwing, so signup still works.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function fromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  // Must be a verified sender on the Resend domain, hence the site inbox.
  return `${SITE_NAME} <${CONTACT_EMAIL}>`;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
