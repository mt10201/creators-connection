import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free client for public data such as the sitemap.
 *
 * The cookie-backed server client opts a route into dynamic rendering, which
 * would stop the sitemap from being cached and make it depend on whoever
 * happened to request it. This reads exactly what an anonymous visitor can
 * read, so RLS still applies.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
