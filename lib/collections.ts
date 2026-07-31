import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCardPost } from "@/app/components/ProductCard";

/** The two engagement tables share a shape, so they share a loader. */
export type CollectionTable = "likes" | "saves";

export type CollectionPost = ProductCardPost & {
  creator_id: string | null;
};

export type Collection = {
  /** Newest engagement first, matching the order the user built the list in. */
  posts: CollectionPost[];
  creatorNames: Map<string, string>;
  likedIds: Set<string>;
  savedIds: Set<string>;
};

const POST_COLUMNS =
  "id, product_title, description, category, media_urls, video_url, like_count, save_count, creator_id";

/** Total rows a user has in `likes` or `saves`, for the dashboard tab counts. */
export async function countCollection(
  supabase: SupabaseClient,
  userId: string,
  table: CollectionTable
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("post_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error(`Failed to count ${table}:`, error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Loads the posts a user has liked or saved, along with the creator names and
 * the like/save flags every card needs. Both flag sets are always fetched, so a
 * card in the liked list still shows whether it is also on the user's shelf.
 */
export async function loadCollection(
  supabase: SupabaseClient,
  userId: string,
  table: CollectionTable
): Promise<Collection> {
  const empty: Collection = {
    posts: [],
    creatorNames: new Map(),
    likedIds: new Set(),
    savedIds: new Set(),
  };

  const { data: rows, error } = await supabase
    .from(table)
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Failed to load ${table}:`, error.message);
    return empty;
  }

  const orderedIds = (rows ?? []).map((row) => row.post_id as string);
  if (orderedIds.length === 0) return empty;

  const { data: postRows, error: postsError } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .in("id", orderedIds)
    .eq("status", "active");

  if (postsError) {
    console.error("Failed to load collection posts:", postsError.message);
    return empty;
  }

  const posts = (postRows ?? []) as CollectionPost[];

  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  posts.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  const visibleIds = posts.map((post) => post.id);
  const creatorIds = [
    ...new Set(posts.map((post) => post.creator_id).filter(Boolean)),
  ] as string[];

  const [{ data: profiles }, { data: likes }, { data: saves }] =
    await Promise.all([
      creatorIds.length > 0
        ? supabase
            .from("public_profiles")
            .select("id, username")
            .in("id", creatorIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", visibleIds),
      supabase
        .from("saves")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", visibleIds),
    ]);

  const creatorNames = new Map<string, string>();
  for (const profile of profiles ?? []) {
    const name = profile.username?.trim();
    if (name) creatorNames.set(profile.id, name);
  }

  return {
    posts,
    creatorNames,
    likedIds: new Set((likes ?? []).map((row) => row.post_id as string)),
    savedIds: new Set((saves ?? []).map((row) => row.post_id as string)),
  };
}
