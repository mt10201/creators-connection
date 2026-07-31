import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductCard, {
  type ProductCardPost,
} from "@/app/components/ProductCard";
import EmptyState from "@/app/components/EmptyState";
import OnboardingSteps, {
  firstPostSteps,
} from "@/app/components/OnboardingSteps";

type Props = { params: Promise<{ username: string }> };

/** `_` and `%` are LIKE wildcards, and usernames may legitimately contain `_`. */
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function getProfile(rawUsername: string) {
  const username = decodeURIComponent(rawUsername).trim();
  if (!username) return null;

  const supabase = await createClient();

  // Fetch candidates rather than a single row: a case-insensitive match can
  // legitimately return more than one, and maybeSingle() errors on that.
  const { data: matches, error: profileError } = await supabase
    .from("public_profiles")
    .select("id, username, credit_balance")
    .ilike("username", escapeLikePattern(username))
    .order("username", { ascending: true })
    .limit(10);

  if (profileError) {
    console.error("Profile lookup failed:", profileError.message);
    return null;
  }

  const target = username.toLowerCase();
  const profile =
    (matches ?? []).find(
      (row) => row.username?.trim().toLowerCase() === target
    ) ?? null;

  if (!profile) return null;

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, product_title, description, category, media_urls, video_url, like_count, save_count"
    )
    .eq("creator_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return { profile, posts: (posts ?? []) as ProductCardPost[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const result = await getProfile(username);

  if (!result) return { title: "Creator not found | Creators Connection" };

  return {
    title: `${result.profile.username} | Creators Connection`,
    description: `Products shared by ${result.profile.username} on Creators Connection.`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const result = await getProfile(username);

  if (!result) notFound();

  const { profile, posts } = result;
  const credits = profile.credit_balance ?? 0;

  const supabase = await createClient();
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

  const isOwnProfile = user?.id === profile.id;

  return (
    <div>
      {/* Profile header */}
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* Circular monogram in a warm mat — a maker's stamp, not an avatar chip. */}
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-clay bg-terracotta-soft font-display text-2xl font-semibold uppercase text-terracotta-deep">
              {profile.username?.charAt(0) ?? "?"}
            </span>
            <div>
              <span className="eyebrow text-sage">Creator</span>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {profile.username}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-ochre/30 bg-ochre/10 px-3 py-1 text-xs font-semibold text-ochre">
                  {credits} {credits === 1 ? "credit" : "credits"}
                </span>
                <span className="rounded-full border border-sand bg-parchment px-3 py-1 text-xs font-semibold text-ink-muted">
                  {posts.length} {posts.length === 1 ? "product" : "products"}
                </span>
              </div>
            </div>
          </div>
          <div className="rule-double mt-10" />
        </div>
      </section>

      {/* Posts */}
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-7xl">
          {posts.length === 0 ? (
            <EmptyState
              mark={isOwnProfile ? "post" : "spark"}
              eyebrow={isOwnProfile ? "Your portfolio" : "Nothing here yet"}
              title={
                isOwnProfile
                  ? "Your first post is waiting"
                  : `${profile.username} hasn't shared anything yet`
              }
              description={
                isOwnProfile
                  ? "This page is your portfolio — it fills in as you publish. Post a product to start earning credits and put your work in front of other makers."
                  : "Check back soon — new work shows up here as it's published. In the meantime, the feed is full of things worth seeing."
              }
              footer={
                isOwnProfile ? (
                  <OnboardingSteps
                    eyebrow="Your first post, in three steps"
                    steps={firstPostSteps}
                  />
                ) : undefined
              }
            >
              <Link
                href={isOwnProfile ? "/upload" : "/explore"}
                className="btn-primary"
              >
                {isOwnProfile ? "Upload a Product" : "Explore Other Creators"}
              </Link>
            </EmptyState>
          ) : (
            <div className="animate-fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4">
              {posts.map((post, index) => (
                <ProductCard
                  key={post.id}
                  post={post}
                  showCreator={false}
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
