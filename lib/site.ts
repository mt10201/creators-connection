/** Shared site identity for metadata and Open Graph. */
export const SITE_NAME = "Creators Connection";

export const SITE_TITLE =
  "Creators Connection — Share your products, find inspiration";

export const SITE_DESCRIPTION =
  "Where independent makers share their products for inspiration and discovery.";

/** Inbox for site and account issues (not product questions). */
export const CONTACT_EMAIL = "tim@creators-connection.com";

/**
 * Where the site really lives. Used when nothing else identifies the origin, so
 * a production deploy can never publish canonicals pointing at a per-deployment
 * vercel.app hostname (which would split ranking signals across domains).
 */
export const PRODUCTION_SITE_URL = "https://www.creators-connection.com";

/**
 * Absolute origin used by metadataBase so relative OG/canonical URLs resolve.
 * Set NEXT_PUBLIC_SITE_URL to override; everything else is a fallback.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      // Malformed env var shouldn't break every page's metadata.
    }
  }

  // Production deploys canonicalise to the real domain. Previews keep their own
  // hostname so a preview never claims to be the live site.
  if (process.env.VERCEL_ENV === "production") {
    return new URL(PRODUCTION_SITE_URL);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

/** Absolute URL for a root-relative path, for sitemaps and JSON-LD. */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

/** Absolute URL for the static default Open Graph / Twitter share image. */
export function getDefaultOgImageUrl(): string {
  return new URL("/og.png", getSiteUrl()).toString();
}

/** Collapse whitespace and cap length for meta descriptions. */
export function truncateMeta(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}
