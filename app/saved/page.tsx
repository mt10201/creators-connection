import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductCard, {
  type ProductCardPost,
} from "@/app/components/ProductCard";
import EmptyState from "@/app/components/EmptyState";

export const metadata: Metadata = {
  title: "Saved | Creators Connection",
  description: "Products you've saved for inspiration.",
};

export default async function SavedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already guards this route; this keeps the page safe on its own.
  if (!user) {
    redirect("/login?redirectTo=/saved");
  }

  const { data: saves, error: savesError } = await supabase
    .from("saves")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (savesError) {
    console.error("Failed to load saves:", savesError.message);
  }

  const savedIds = (saves ?? []).map((row) => row.post_id as string);

  let posts: ProductCardPost[] = [];
  const creatorNames = new Map<string, string>();
  const likedIds = new Set<string>();

  if (savedIds.length > 0) {
    const { data: postRows } = await supabase
      .from("posts")
      .select(
        "id, product_title, description, category, media_urls, video_url, like_count, save_count, creator_id"
      )
      .in("id", savedIds)
      .eq("status", "active");

    const rows = (postRows ?? []) as (ProductCardPost & {
      creator_id: string | null;
    })[];

    // Preserve the order the user saved them in.
    const order = new Map(savedIds.map((id, index) => [id, index]));
    rows.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
    posts = rows;

    const creatorIds = [
      ...new Set(rows.map((row) => row.creator_id).filter(Boolean)),
    ] as string[];

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, username")
        .in("id", creatorIds);

      for (const profile of profiles ?? []) {
        const name = profile.username?.trim();
        if (name) creatorNames.set(profile.id, name);
      }
    }

    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in(
        "post_id",
        rows.map((row) => row.id)
      );

    for (const row of likes ?? []) likedIds.add(row.post_id);
  }

  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow text-sage">Your collection</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Saved
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
            {posts.length > 0
              ? `${posts.length} ${posts.length === 1 ? "product" : "products"} you've saved for inspiration.`
              : "Products you save will collect here."}
          </p>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          {posts.length === 0 ? (
            <EmptyState
              eyebrow="Nothing saved yet"
              title="Your shelf is empty"
              description="Tap the star on any product and it will wait for you here — a private collection of the work you want to come back to."
            >
              <Link href="/explore" className="btn-primary">
                Start Exploring
              </Link>
              <Link href="/upload" className="btn-secondary">
                Share Your Work
              </Link>
            </EmptyState>
          ) : (
            <div className="animate-fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
              {posts.map((post, index) => (
                <ProductCard
                  key={post.id}
                  post={post}
                  creatorName={creatorNames.get(
                    (post as ProductCardPost & { creator_id: string | null })
                      .creator_id ?? ""
                  )}
                  isLoggedIn
                  liked={likedIds.has(post.id)}
                  saved
                  priority={index < 4}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
