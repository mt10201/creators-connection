import Link from "next/link";
import type { Metadata } from "next";
import { productCategories } from "@/lib/categories";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/app/components/ProductCard";
import EmptyState from "@/app/components/EmptyState";
import OnboardingSteps, {
  firstPostSteps,
  joinSteps,
} from "@/app/components/OnboardingSteps";
import CategoryFilters from "@/app/components/CategoryFilters";
import ExploreSearch from "@/app/components/ExploreSearch";

const exploreDescription =
  "Discover original work from independent creators — browse product posts for inspiration.";

export const metadata: Metadata = {
  title: "Explore",
  description: exploreDescription,
  openGraph: {
    title: `Explore | ${SITE_NAME}`,
    description: exploreDescription,
    url: "/explore",
  },
  alternates: {
    canonical: "/explore",
  },
};

const categories = ["All", ...productCategories] as const;

type Category = (typeof categories)[number];

type PostRow = {
  id: string;
  product_title: string | null;
  description: string | null;
  category: string | null;
  product_link: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  creator_id: string | null;
  like_count: number | null;
  save_count: number | null;
};

/** Escape `%` / `_` so user input is treated as a literal in ILIKE. */
function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category: rawCategory, q: rawQuery } = await searchParams;
  const activeCategory: Category = categories.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : "All";
  const searchQuery = (rawQuery ?? "").trim().slice(0, 120);

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(
      "id, product_title, description, category, product_link, media_urls, video_url, creator_id, like_count, save_count"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (activeCategory !== "All") {
    query = query.eq("category", activeCategory);
  }

  if (searchQuery) {
    const pattern = `%${escapeIlike(searchQuery).replace(/"/g, "")}%`;

    // Usernames live on a separate view, so resolve them to creator ids first
    // and fold those into the same OR filter.
    const { data: matchedCreators, error: creatorMatchError } = await supabase
      .from("public_profiles")
      .select("id")
      .ilike("username", pattern)
      .limit(60);

    if (creatorMatchError) {
      console.error(
        "Failed to search creator usernames:",
        creatorMatchError.message
      );
    }

    const filters = [
      `product_title.ilike."${pattern}"`,
      `description.ilike."${pattern}"`,
    ];

    const matchedCreatorIds = (matchedCreators ?? []).map((row) => row.id);
    if (matchedCreatorIds.length > 0) {
      filters.push(`creator_id.in.(${matchedCreatorIds.join(",")})`);
    }

    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  const posts = (data ?? []) as PostRow[];

  const creatorIds = [
    ...new Set(posts.map((post) => post.creator_id).filter(Boolean)),
  ] as string[];

  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, username")
      .in("id", creatorIds);

    if (profilesError) {
      console.error("Failed to load creator profiles:", profilesError.message);
    }

    for (const profile of profiles ?? []) {
      const name = profile.username?.trim();
      if (name) creatorNames.set(profile.id, name);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const postIds = posts.map((post) => post.id);
  const likedIds = new Set<string>();
  const savedIds = new Set<string>();

  if (user && postIds.length > 0) {
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

  const clearSearchHref =
    activeCategory === "All"
      ? "/explore"
      : `/explore?category=${encodeURIComponent(activeCategory)}`;

  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow text-sage">The feed</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Explore
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
            Discover original work from independent creators.
          </p>

          <ExploreSearch
            initialQuery={searchQuery}
            category={activeCategory}
          />

          {searchQuery && (
            <p className="mt-3 text-sm text-ink-muted">
              {posts.length === 0
                ? "No matches for "
                : `${posts.length} ${posts.length === 1 ? "result" : "results"} for `}
              <span className="font-medium text-ink">“{searchQuery}”</span>
              {activeCategory !== "All" && (
                <>
                  {" "}
                  in{" "}
                  <span className="font-medium text-ink">{activeCategory}</span>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <CategoryFilters
        categories={categories}
        active={activeCategory}
        query={searchQuery}
      />

      <section className="px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          {error ? (
            <EmptyState
              tone="error"
              eyebrow="Something went wrong"
              title="Couldn't load products"
              description={error.message}
            >
              <Link href="/explore" className="btn-primary">
                Try Again
              </Link>
            </EmptyState>
          ) : posts.length === 0 ? (
            searchQuery ? (
              <EmptyState
                eyebrow="No matches"
                title="Nothing turned up"
                description={
                  activeCategory === "All"
                    ? `We couldn’t find products or creators matching “${searchQuery}”. Try a shorter phrase, check the username spelling, or browse by category.`
                    : `No ${activeCategory.toLowerCase()} posts match “${searchQuery}”. Try another term, or clear the search to see this category.`
                }
              >
                <Link href={clearSearchHref} className="btn-primary">
                  Clear search
                </Link>
                {activeCategory !== "All" && (
                  <Link
                    href={`/explore?q=${encodeURIComponent(searchQuery)}`}
                    className="btn-secondary"
                  >
                    Search all categories
                  </Link>
                )}
              </EmptyState>
            ) : (
              <EmptyState
                mark="spark"
                eyebrow={
                  activeCategory === "All" ? "Empty feed" : activeCategory
                }
                title={
                  activeCategory === "All"
                    ? "Nothing here yet"
                    : `No ${activeCategory.toLowerCase()} yet`
                }
                description={
                  activeCategory === "All"
                    ? "This feed fills up as makers share their work. Yours could be the first piece here."
                    : `Nobody has shared work in ${activeCategory} yet — post yours and set the tone for this category.`
                }
                footer={
                  <OnboardingSteps
                    eyebrow={user ? "How to get started" : "Joining takes a minute"}
                    steps={user ? firstPostSteps : joinSteps}
                  />
                }
              >
                {user ? (
                  <Link href="/upload" className="btn-primary">
                    Upload a Product
                  </Link>
                ) : (
                  <Link href="/signup" className="btn-primary">
                    Join to Post
                  </Link>
                )}
                {activeCategory !== "All" && (
                  <Link href="/explore" className="btn-secondary">
                    Browse Everything
                  </Link>
                )}
              </EmptyState>
            )
          ) : (
            <div className="animate-fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
              {posts.map((post, index) => (
                <ProductCard
                  key={post.id}
                  post={post}
                  creatorName={
                    post.creator_id ? creatorNames.get(post.creator_id) : null
                  }
                  isLoggedIn={Boolean(user)}
                  liked={likedIds.has(post.id)}
                  saved={savedIds.has(post.id)}
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
