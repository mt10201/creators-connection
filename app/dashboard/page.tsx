import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countCollection, loadCollection } from "@/lib/collections";
import ProductCard, {
  type ProductCardPost,
} from "@/app/components/ProductCard";
import EmptyState from "@/app/components/EmptyState";
import OnboardingSteps, {
  firstPostSteps,
  firstSaveSteps,
} from "@/app/components/OnboardingSteps";
import DashboardTabs, {
  parseDashboardView,
  type DashboardView,
} from "./DashboardTabs";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your credits, posts, likes, and saved products at a glance.",
};

type OwnPost = ProductCardPost & {
  like_count: number | null;
  save_count: number | null;
};

const headings: Record<
  DashboardView,
  { eyebrow: string; title: string; note: string }
> = {
  posts: {
    eyebrow: "Your posts",
    title: "Work you’ve shared",
    note: "Everything you've published, newest first.",
  },
  liked: {
    eyebrow: "Posts you’ve liked",
    title: "Work that caught your eye",
    note: "The posts you've liked, most recent first.",
  },
  saved: {
    eyebrow: "Posts you’ve saved",
    title: "Your shelf",
    note: "Only you can see what you've saved.",
  },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const activeView = parseDashboardView(rawView);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const [{ data: profile }, { data: postRows }, likedCount, savedCount] =
    await Promise.all([
      supabase
        .from("users")
        .select("username, credit_balance")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("posts")
        .select(
          "id, product_title, description, category, media_urls, video_url, like_count, save_count"
        )
        .eq("creator_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      countCollection(supabase, user.id, "likes"),
      countCollection(supabase, user.id, "saves"),
    ]);

  const posts = (postRows ?? []) as OwnPost[];
  const credits = profile?.credit_balance ?? 0;
  const username =
    profile?.username?.trim() ||
    (user.user_metadata?.username as string | undefined) ||
    "Creator";

  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.like_count ?? 0),
    0
  );
  const totalSaves = posts.reduce(
    (sum, post) => sum + (post.save_count ?? 0),
    0
  );

  // Only the visible list is fetched in full; the other tabs just need counts.
  const collection =
    activeView === "posts"
      ? null
      : await loadCollection(
          supabase,
          user.id,
          activeView === "liked" ? "likes" : "saves"
        );

  const ownLikedIds = new Set<string>();
  const ownSavedIds = new Set<string>();

  if (activeView === "posts" && posts.length > 0) {
    const postIds = posts.map((post) => post.id);
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

    for (const row of likes ?? []) ownLikedIds.add(row.post_id);
    for (const row of saves ?? []) ownSavedIds.add(row.post_id);
  }

  const isNewCreator = posts.length === 0;
  const heading = headings[activeView];
  // The empty state below carries its own explanation, so the "newest first"
  // note would only contradict it.
  const visibleCount = collection ? collection.posts.length : posts.length;

  const stats = [
    {
      label: "Posts",
      value: posts.length,
      hint: "active in the feed",
    },
    {
      label: "Likes received",
      value: totalLikes,
      hint: "across your work",
    },
    {
      label: "Saves received",
      value: totalSaves,
      hint: "kept by others",
    },
  ];

  const counts: Record<DashboardView, number> = {
    posts: posts.length,
    liked: likedCount,
    saved: savedCount,
  };

  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow text-sage">Your studio</span>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Dashboard
              </h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">
                {isNewCreator
                  ? `Welcome, ${username}. Your studio is ready — the only thing left is sharing your first product.`
                  : `Welcome back, ${username}. Track credits, see how your work is landing, and revisit what you've liked and saved.`}
              </p>
            </div>

            <Link href="/upload" className="btn-primary btn-lg shrink-0">
              {isNewCreator ? "Upload your first product" : "Upload new product"}
            </Link>
          </div>

          {/* Credits hero */}
          <div className="mt-10 rounded-[2rem] border border-ochre/25 bg-gradient-to-br from-ochre/15 via-parchment/80 to-cream p-8 shadow-soft sm:p-10">
            <span className="eyebrow text-ochre">Credit balance</span>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
              {credits}
              <span className="ml-2 text-2xl font-medium text-ink-muted sm:text-3xl">
                {credits === 1 ? "credit" : "credits"}
              </span>
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
              {credits === 0
                ? "Publish your first product and 5 credits land here straight away. Use them to boost visibility as the system grows."
                : "Earn 5 credits each time you publish. Use them to boost visibility as the system grows."}
            </p>
          </div>

          {/* Quick stats */}
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="rounded-[1.5rem] border border-sand bg-parchment/60 px-6 py-5 shadow-soft"
              >
                <span className="eyebrow text-sage">{stat.label}</span>
                <p className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-ink-faint">{stat.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rule-double mb-8" />

          <DashboardTabs active={activeView} counts={counts} />

          <div className="mb-6 mt-8 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-sage">{heading.eyebrow}</span>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {activeView === "posts" && isNewCreator
                  ? "Your first post"
                  : heading.title}
              </h2>
              {visibleCount > 0 && (
                <p className="mt-1.5 text-sm text-ink-muted">{heading.note}</p>
              )}
            </div>
            {activeView === "posts" && posts.length > 0 && profile?.username && (
              <Link
                href={`/profile/${encodeURIComponent(profile.username)}`}
                className="hidden shrink-0 text-sm text-terracotta underline-offset-4 transition hover:underline sm:inline"
              >
                View public profile →
              </Link>
            )}
          </div>

          {activeView === "posts" ? (
            isNewCreator ? (
              <EmptyState
                mark="post"
                eyebrow="Nothing posted yet"
                title="Your first product is waiting"
                description="Upload something you've made to earn credits and show up in the Explore feed. There's no bar to clear here — work in progress is welcome."
                footer={<OnboardingSteps steps={firstPostSteps} />}
              >
                <Link href="/upload" className="btn-primary">
                  Upload your first product
                </Link>
                <Link href="/explore" className="btn-secondary">
                  Browse for inspiration
                </Link>
              </EmptyState>
            ) : (
              <div className="animate-fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
                {posts.map((post, index) => (
                  <ProductCard
                    key={post.id}
                    post={post}
                    showCreator={false}
                    isLoggedIn
                    liked={ownLikedIds.has(post.id)}
                    saved={ownSavedIds.has(post.id)}
                    priority={index < 4}
                  />
                ))}
              </div>
            )
          ) : collection && collection.posts.length === 0 ? (
            activeView === "liked" ? (
              <EmptyState
                mark="heart"
                eyebrow="Nothing liked yet"
                title="No likes given out yet"
                description="When a piece resonates, tap ♡ — it tells the maker their work landed, and it keeps the post here so you can find it again."
              >
                <Link href="/explore" className="btn-primary">
                  Start Exploring
                </Link>
              </EmptyState>
            ) : (
              <EmptyState
                mark="star"
                eyebrow="Nothing saved yet"
                title="Your shelf is empty"
                description="Tap the star on any product and it will wait for you here — a private collection of the work you want to come back to."
                footer={
                  <OnboardingSteps
                    eyebrow="How saving works"
                    steps={firstSaveSteps}
                  />
                }
              >
                <Link href="/explore" className="btn-primary">
                  Start Exploring
                </Link>
                <Link href="/upload" className="btn-secondary">
                  Share Your Work
                </Link>
              </EmptyState>
            )
          ) : (
            <div className="animate-fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
              {collection?.posts.map((post, index) => (
                <ProductCard
                  key={post.id}
                  post={post}
                  creatorName={
                    post.creator_id
                      ? collection.creatorNames.get(post.creator_id)
                      : null
                  }
                  isLoggedIn
                  liked={collection.likedIds.has(post.id)}
                  saved={collection.savedIds.has(post.id)}
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
