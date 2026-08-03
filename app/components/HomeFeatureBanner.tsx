import { createClient } from "@/lib/supabase/server";
import { loadCreatorNames, loadHomeFeatureRail } from "@/lib/boosts";
import FeatureCarousel, { type FeatureSlide } from "./FeatureCarousel";

/**
 * Homepage banner. Active Home Feature boosts fill the slots and carry a
 * visible label; empty slots fall back to strong organic posts.
 */
export default async function HomeFeatureBanner({ limit = 5 }: { limit?: number }) {
  const supabase = await createClient();
  const items = await loadHomeFeatureRail(supabase, limit);

  if (items.length === 0) return null;

  const creatorNames = await loadCreatorNames(
    supabase,
    items.map((item) => item.post.creator_id)
  );

  const slides: FeatureSlide[] = items.map(({ post, boostLabel }) => ({
    id: post.id,
    title: post.product_title?.trim() || "Untitled product",
    description: post.description,
    category: post.category,
    image: post.media_urls?.[0] ?? null,
    creatorName: post.creator_id
      ? (creatorNames.get(post.creator_id) ?? null)
      : null,
    boostLabel,
  }));

  return (
    <section className="px-5 pb-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <FeatureCarousel slides={slides} />
      </div>
    </section>
  );
}
