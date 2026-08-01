/** Shared site identity for metadata and Open Graph. */
export const SITE_NAME = "Creators Connection";

export const SITE_TITLE =
  "Creators Connection — Share and discover independent maker products";

export const SITE_DESCRIPTION =
  "Where independent makers share their products for inspiration and discovery.";

/**
 * Absolute origin used by metadataBase so relative OG/canonical URLs resolve.
 * Prefer NEXT_PUBLIC_SITE_URL in production (e.g. https://www.creators-connection.com).
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
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
