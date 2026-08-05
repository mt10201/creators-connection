import type { SupabaseClient } from "@supabase/supabase-js";

/** Ledger reason used for every boost debit. */
export const BOOST_LEDGER_REASON = "boost_purchase";

export const BOOST_CAPS = {
  concurrentPerAccount: 2,
  activePerPost: 1,
  purchasesPer24h: 3,
} as const;

export type BoostProduct = {
  slug: string;
  name: string;
  description: string;
  cost_credits: number;
  duration_hours: number;
  scope: string;
  label: string;
};

export type ActiveBoost = {
  id: string;
  post_id: string;
  product_slug: string;
  scope: string;
  label: string;
  ends_at: string;
};

export type BoostedPost = {
  id: string;
  product_title: string | null;
  description: string | null;
  category: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  creator_id: string | null;
  created_at: string | null;
  like_count: number | null;
  save_count: number | null;
};

const POST_COLUMNS =
  "id, product_title, description, category, media_urls, video_url, creator_id, created_at, like_count, save_count";

/** Fresh Push is a launch window: only posts under 24h old may show. */
export const FRESH_PUSH_SLUG = "fresh_push";
export const FRESH_PUSH_MAX_POST_AGE_HOURS = 24;

export const FRESH_PUSH_TOO_OLD_REASON =
  "Only for posts under 24 hours old";

export const FRESH_PUSH_TOO_OLD_MESSAGE =
  "Fresh Push is only available on posts less than 24 hours old. Use Home Feature for older posts, or boost a newer listing.";

const BOOST_ERRORS: Record<string, string> = {
  BOOST_NOT_AUTHENTICATED: "Please log in again to boost this post.",
  BOOST_PRODUCT_UNAVAILABLE: "That boost isn’t available right now.",
  BOOST_SLOTS_DISABLED: "Spotlight slots aren’t open yet.",
  BOOST_POST_NOT_FOUND: "We couldn’t find that post.",
  BOOST_NOT_POST_OWNER: "You can only boost your own posts.",
  BOOST_POST_NOT_ACTIVE: "This post isn’t live, so it can’t be boosted.",
  BOOST_POST_NEEDS_IMAGE: "Add at least one image to this post before boosting it.",
  BOOST_POST_INCOMPLETE:
    "Add a title, a description of at least 20 characters, and a product link before boosting.",
  BOOST_POST_TOO_OLD: FRESH_PUSH_TOO_OLD_MESSAGE,
  BOOST_POST_ALREADY_BOOSTED:
    "This post already has an active boost. Wait for it to finish before buying another.",
  BOOST_TOO_MANY_ACTIVE: `You can run ${BOOST_CAPS.concurrentPerAccount} boosts at a time. Wait for one to end.`,
  BOOST_DAILY_LIMIT: `You can buy ${BOOST_CAPS.purchasesPer24h} boosts per 24 hours. Try again later.`,
  BOOST_INSUFFICIENT_CREDITS:
    "You don’t have enough spendable credits yet. Credits vest 24 hours after you earn them.",
};

/** True when a post is still inside the Fresh Push launch window. */
export function isFreshPushEligible(
  postCreatedAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!postCreatedAt) return false;
  const published = new Date(postCreatedAt).getTime();
  if (!Number.isFinite(published)) return false;
  return now - published < FRESH_PUSH_MAX_POST_AGE_HOURS * 3_600_000;
}

export function getBoostErrorMessage(raw: string | null | undefined): string {
  const haystack = raw ?? "";
  for (const [code, message] of Object.entries(BOOST_ERRORS)) {
    if (haystack.includes(code)) return message;
  }
  // Never surface raw BOOST_* codes if an unknown one slips through.
  if (/BOOST_[A-Z0-9_]+/.test(haystack)) {
    return "Could not buy that boost. Please try again.";
  }
  return haystack.trim() || "Could not buy that boost.";
}

/** Enabled catalog entries, cheapest first. */
export async function loadBoostProducts(
  supabase: SupabaseClient
): Promise<BoostProduct[]> {
  const { data, error } = await supabase
    .from("boost_products")
    .select("slug, name, description, cost_credits, duration_hours, scope, label")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load boost products:", error.message);
    return [];
  }

  return (data ?? []) as BoostProduct[];
}

export async function loadActiveBoostForPost(
  supabase: SupabaseClient,
  postId: string
): Promise<ActiveBoost | null> {
  const { data, error } = await supabase
    .from("active_boosts")
    .select("id, post_id, product_slug, scope, label, ends_at")
    .eq("post_id", postId)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load active boost:", error.message);
    return null;
  }

  return (data as ActiveBoost | null) ?? null;
}

export async function loadActiveBoostsForPosts(
  supabase: SupabaseClient,
  postIds: string[]
): Promise<Map<string, ActiveBoost>> {
  const byPost = new Map<string, ActiveBoost>();
  if (postIds.length === 0) return byPost;

  const { data, error } = await supabase
    .from("active_boosts")
    .select("id, post_id, product_slug, scope, label, ends_at")
    .in("post_id", postIds);

  if (error) {
    console.error("Failed to load active boosts:", error.message);
    return byPost;
  }

  for (const row of (data ?? []) as ActiveBoost[]) {
    byPost.set(row.post_id, row);
  }

  return byPost;
}

async function loadPostsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<BoostedPost[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .in("id", ids)
    .eq("status", "active");

  if (error) {
    console.error("Failed to load boosted posts:", error.message);
    return [];
  }

  const byId = new Map((data ?? []).map((post) => [post.id, post as BoostedPost]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as BoostedPost[];
}

export type BoostRailItem = {
  post: BoostedPost;
  boostLabel: string | null;
};

/**
 * Every post with an active Fresh Push, most recently boosted first. Used by
 * the Just landed strip above the Explore grid. Boost-only by design: with no
 * active Fresh Push the strip is empty and organic results keep the whole page.
 */
export async function loadExploreBoostedPosts(
  supabase: SupabaseClient,
  { category }: { category?: string | null } = {}
): Promise<BoostRailItem[]> {
  const { data, error } = await supabase
    .from("active_boosts")
    .select("post_id, label, starts_at")
    .eq("scope", "explore_first_page")
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("Failed to load Explore boosts:", error.message);
    return [];
  }

  const rows = (data ?? []) as { post_id: string; label: string }[];
  if (rows.length === 0) return [];

  const labelByPost = new Map(rows.map((row) => [row.post_id, row.label]));
  // loadPostsByIds preserves the id order, so boost recency carries through.
  const posts = await loadPostsByIds(
    supabase,
    rows.map((row) => row.post_id)
  );

  const minPublishedAt =
    Date.now() - FRESH_PUSH_MAX_POST_AGE_HOURS * 3_600_000;

  return posts
    .filter((post) => !category || post.category === category)
    .filter((post) => {
      if (!post.created_at) return false;
      const published = new Date(post.created_at).getTime();
      return Number.isFinite(published) && published >= minPublishedAt;
    })
    .map((post) => ({
      post,
      boostLabel: labelByPost.get(post.id) ?? "Boosted",
    }));
}

/**
 * Homepage banner: active Home Feature boosts fill the slots and are labeled;
 * remaining slots fall back to strong organic posts.
 */
export async function loadHomeFeatureRail(
  supabase: SupabaseClient,
  limit = 5
): Promise<BoostRailItem[]> {
  const { data: boostRows, error } = await supabase
    .from("active_boosts")
    .select("post_id, label, ends_at")
    .eq("scope", "home_banner")
    .order("ends_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load home banner boosts:", error.message);
  }

  const boosted = (boostRows ?? []) as { post_id: string; label: string }[];
  const labelByPost = new Map(boosted.map((row) => [row.post_id, row.label]));
  const boostedPosts = await loadPostsByIds(
    supabase,
    boosted.map((row) => row.post_id)
  );

  const items: BoostRailItem[] = boostedPosts.map((post) => ({
    post,
    boostLabel: labelByPost.get(post.id) ?? "Featured",
  }));

  const remaining = limit - items.length;
  if (remaining <= 0) return items;

  const excludeIds = items.map((item) => item.post.id);
  const { data, error: organicError } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("status", "active")
    .order("like_count", { ascending: false })
    .order("save_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(remaining + excludeIds.length);

  if (organicError) {
    console.error("Failed to load organic banner posts:", organicError.message);
    return items;
  }

  const fallback = ((data ?? []) as BoostedPost[])
    .filter((post) => !excludeIds.includes(post.id))
    .slice(0, remaining);

  items.push(...fallback.map((post) => ({ post, boostLabel: null })));

  return items;
}

export type CreatorProfile = {
  name: string | null;
  createdAt: string | null;
};

/** Names plus account age (for the new-maker ranking bonus), in one read. */
export async function loadCreatorProfiles(
  supabase: SupabaseClient,
  creatorIds: (string | null)[]
): Promise<Map<string, CreatorProfile>> {
  const profiles = new Map<string, CreatorProfile>();
  const ids = [...new Set(creatorIds.filter(Boolean))] as string[];
  if (ids.length === 0) return profiles;

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username, created_at")
    .in("id", ids);

  if (error) {
    console.error("Failed to load creator profiles:", error.message);
    return profiles;
  }

  for (const profile of data ?? []) {
    profiles.set(profile.id, {
      name: profile.username?.trim() || null,
      createdAt: (profile.created_at as string | null) ?? null,
    });
  }

  return profiles;
}

export async function loadCreatorNames(
  supabase: SupabaseClient,
  creatorIds: (string | null)[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const ids = [...new Set(creatorIds.filter(Boolean))] as string[];
  if (ids.length === 0) return names;

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username")
    .in("id", ids);

  if (error) {
    console.error("Failed to load creator profiles:", error.message);
    return names;
  }

  for (const profile of data ?? []) {
    const name = profile.username?.trim();
    if (name) names.set(profile.id, name);
  }

  return names;
}

export function formatBoostTimeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "ending now";

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min left`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} left`;

  return `${Math.round(hours / 24)} days left`;
}
