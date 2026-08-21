import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const WELCOME_SUBJECT = `Welcome to ${SITE_NAME}`;

/** Falls back to a greeting that reads fine without a handle. */
export function greetingName(username: string | null): string {
  return username?.trim() || "there";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain text and HTML versions of the welcome email. Links are absolute and
 * built from the configured site origin, so a preview deploy never mails
 * localhost URLs.
 */
export function welcomeEmail(username: string | null) {
  const name = greetingName(username);
  const referralUrl = absoluteUrl("/referral");
  const uploadUrl = absoluteUrl("/upload");
  const exploreUrl = absoluteUrl("/explore");

  const text = `Hi ${name},

Glad you're here.

${SITE_NAME} is a quiet place for independent makers to share what they make and get ideas from other shops — more focused than a big feed, built for people who sell their own work.

How it works:
1. Post a product (photo, short story, link to your shop)
2. Browse what other makers are posting
3. Use credits to give good work a bit more visibility

That's it.

If you like the site, refer a friend. You both earn credits when they join.

Invite someone: ${referralUrl}

Share something: ${uploadUrl}
Look around: ${exploreUrl}

Welcome in.
— ${SITE_NAME}`;

  const safeName = escapeHtml(name);

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2f2a26;line-height:1.6;">
    <div style="max-width:34rem;margin:0 auto;">
      <p>Hi ${safeName},</p>

      <p>Glad you're here.</p>

      <p>${SITE_NAME} is a quiet place for independent makers to share what they
      make and get ideas from other shops — more focused than a big feed, built
      for people who sell their own work.</p>

      <p><strong>How it works:</strong></p>
      <ol>
        <li>Post a product (photo, short story, link to your shop)</li>
        <li>Browse what other makers are posting</li>
        <li>Use credits to give good work a bit more visibility</li>
      </ol>

      <p>That's it.</p>

      <p>If you like the site, refer a friend. You both earn credits when they
      join.</p>

      <p>Invite someone: <a href="${referralUrl}" style="color:#b5563a;">${referralUrl}</a></p>

      <p>
        Share something: <a href="${uploadUrl}" style="color:#b5563a;">${uploadUrl}</a><br />
        Look around: <a href="${exploreUrl}" style="color:#b5563a;">${exploreUrl}</a>
      </p>

      <p>Welcome in.<br />— ${SITE_NAME}</p>
    </div>
  </body>
</html>`;

  return { subject: WELCOME_SUBJECT, text, html };
}
