import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { absoluteUrl } from "@/lib/site";

/**
 * Marketing pages, then active product posts, then public profiles.
 *
 * Caps exist so the response stays quick and well under the 50k-URL limit; if
 * the catalog outgrows them, split into a sitemap index rather than raising the
 * numbers indefinitely. Recent posts come first because they matter most.
 */
const POST_LIMIT = 5000;
const PROFILE_LIMIT = 2000;

/**
 * Rebuilt hourly rather than per request: crawlers hit this often, and new
 * posts don't need to appear within seconds. Requires the anonymous Supabase
 * client — a cookie-reading one would force dynamic rendering and drop the
 * cache entirely.
 */
export const revalidate = 3600;

type StaticEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const staticPages: StaticEntry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explore", changeFrequency: "hourly", priority: 0.9 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.6 },
  { path: "/how-explore-ranks", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const supabase = createPublicClient();

    const [{ data: posts, error: postsError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase
          .from("posts")
          .select("id, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(POST_LIMIT),
        supabase
          .from("public_profiles")
          .select("username, created_at")
          .not("username", "is", null)
          .order("created_at", { ascending: false })
          .limit(PROFILE_LIMIT),
      ]);

    if (postsError) console.error("Sitemap posts failed:", postsError.message);
    if (profilesError) {
      console.error("Sitemap profiles failed:", profilesError.message);
    }

    for (const post of posts ?? []) {
      entries.push({
        url: absoluteUrl(`/products/${post.id}`),
        lastModified: post.created_at ? new Date(post.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const profile of profiles ?? []) {
      const username = profile.username?.trim();
      if (!username) continue;

      entries.push({
        url: absoluteUrl(`/profile/${encodeURIComponent(username)}`),
        lastModified: profile.created_at ? new Date(profile.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    // A database hiccup should still leave a valid sitemap of static pages
    // rather than returning a 500 to the crawler.
    console.error("Sitemap dynamic entries failed:", error);
  }

  return entries;
}
