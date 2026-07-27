import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductCard, {
  type ProductCardPost,
} from "@/app/components/ProductCard";
import EmptyState from "@/app/components/EmptyState";

export const metadata: Metadata = {
  title: "Dashboard | Creators Connection",
  description: "Your credits, posts, and creator activity at a glance.",
};

type OwnPost = ProductCardPost & {
  like_count: number | null;
  save_count: number | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const [{ data: profile }, { data: postRows }] = await Promise.all([
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

  const postIds = posts.map((post) => post.id);
  const likedIds = new Set<string>();
  const savedIds = new Set<string>();

  if (postIds.length > 0) {
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
                Welcome back, {username}. Track credits, see how your work is
                landing, and share something new.
              </p>
            </div>

            <Link href="/upload" className="btn-primary btn-lg shrink-0">
              Upload new product
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
              Earn 5 credits each time you publish. Use them to boost visibility
              as the system grows.
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
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-sage">Your posts</span>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Work you&apos;ve shared
              </h2>
            </div>
            {posts.length > 0 && profile?.username && (
              <Link
                href={`/profile/${encodeURIComponent(profile.username)}`}
                className="hidden text-sm text-terracotta underline-offset-4 transition hover:underline sm:inline"
              >
                View public profile →
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <EmptyState
              eyebrow="Nothing posted yet"
              title="Your first product is waiting"
              description="Upload something you've made to earn credits and show up in the Explore feed."
            >
              <Link href="/upload" className="btn-primary">
                Upload new product
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
