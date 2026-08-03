import { createClient } from "@/lib/supabase/server";
import { loadCreatorNames, loadExploreBoostedPosts } from "@/lib/boosts";
import ProductCard from "./ProductCard";

type Props = {
  /** Posts already visible above this strip, so nothing appears twice. */
  excludeIds?: string[];
  category?: string | null;
  limit?: number;
};

/**
 * Reserved Just landed strip on Explore (Fresh Push). Sits below the opening
 * organic row and renders nothing when no boost is running, so organic results
 * are never displaced or reordered.
 */
export default async function ExploreBoostedSlots({
  excludeIds = [],
  category = null,
  limit = 4,
}: Props) {
  const supabase = await createClient();
  const items = await loadExploreBoostedPosts(supabase, {
    limit,
    category,
    excludeIds,
  });

  if (items.length === 0) return null;

  const postIds = items.map((item) => item.post.id);

  const [
    creatorNames,
    {
      data: { user },
    },
  ] = await Promise.all([
    loadCreatorNames(
      supabase,
      items.map((item) => item.post.creator_id)
    ),
    supabase.auth.getUser(),
  ]);

  const likedIds = new Set<string>();
  const savedIds = new Set<string>();

  if (user) {
    const [{ data: likes }, { data: saves }] = await Promise.all([
      supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("saves")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
    ]);

    for (const row of likes ?? []) likedIds.add(row.post_id);
    for (const row of saves ?? []) savedIds.add(row.post_id);
  }

  return (
    <section
      aria-label="Boosted posts"
      className="my-8 rounded-[1.5rem] border border-ochre/25 bg-ochre/5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="inline-flex items-center rounded-full bg-ochre px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-cream">
            Boosted
          </span>
          Just landed
        </h2>
        <p className="text-xs text-ink-faint">
          Labeled boosts paid for with earned credits. Organic ranking is
          unaffected.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {items.map(({ post, boostLabel }) => (
          <ProductCard
            key={post.id}
            post={post}
            creatorName={
              post.creator_id ? creatorNames.get(post.creator_id) : null
            }
            isLoggedIn={Boolean(user)}
            liked={likedIds.has(post.id)}
            saved={savedIds.has(post.id)}
            boostLabel={boostLabel ?? "Boosted"}
          />
        ))}
      </div>
    </section>
  );
}
