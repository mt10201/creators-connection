import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME, truncateMeta } from "@/lib/site";
import {
  loadActiveBoostForPost,
  loadBoostProducts,
  type ActiveBoost,
  type BoostProduct,
} from "@/lib/boosts";
import Avatar from "@/app/components/Avatar";
import PostActions from "@/app/components/PostActions";
import OwnerBoostPanel from "@/app/components/OwnerBoostPanel";
import DeletePostButton from "@/app/components/DeletePostButton";
import ImpressionTracker from "@/app/components/ImpressionTracker";
import OutboundProductLink from "@/app/components/OutboundProductLink";
import ProductGallery from "./ProductGallery";

type Props = { params: Promise<{ id: string }> };

async function getPost(id: string) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, product_title, description, category, product_link, media_urls, video_url, creator_id, created_at, like_count, save_count"
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liked = false;
  let saved = false;

  if (user) {
    const [{ data: like }, { data: save }] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", id)
        .maybeSingle(),
      supabase
        .from("saves")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", id)
        .maybeSingle(),
    ]);
    liked = Boolean(like);
    saved = Boolean(save);
  }

  let creatorName: string | null = null;
  let creatorPhoto: string | null = null;
  if (post.creator_id) {
    const { data: profile, error: profileError } = await supabase
      .from("public_profiles")
      .select("username, profile_photo")
      .eq("id", post.creator_id)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load creator profile:", profileError.message);
    }

    creatorName = profile?.username?.trim() || null;
    creatorPhoto = profile?.profile_photo?.trim() || null;
  }

  const isOwner = Boolean(user && post.creator_id === user.id);

  // The boost panel is owner-only, so skip the extra reads for everyone else.
  let boostProducts: BoostProduct[] = [];
  let activeBoost: ActiveBoost | null = null;
  let spendable = 0;

  if (isOwner) {
    const [products, boost, { data: summary }] = await Promise.all([
      loadBoostProducts(supabase),
      loadActiveBoostForPost(supabase, id),
      supabase.rpc("my_credit_summary").maybeSingle(),
    ]);

    boostProducts = products;
    activeBoost = boost;
    spendable = (summary as { spendable: number } | null)?.spendable ?? 0;
  }

  return {
    post,
    creatorName,
    creatorPhoto,
    isLoggedIn: Boolean(user),
    isOwner,
    liked,
    saved,
    boostProducts,
    activeBoost,
    spendable,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getPost(id);

  if (!result) return { title: "Product not found" };

  const title = result.post.product_title?.trim() || "Product";
  const rawDescription = result.post.description?.trim();
  const description = rawDescription
    ? truncateMeta(rawDescription)
    : `Discover ${title} on Creators Connection.`;
  const image = ((result.post.media_urls ?? []) as unknown[])
    .find((url): url is string => typeof url === "string" && url.trim().length > 0);
  const path = `/products/${id}`;

  const shareTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: shareTitle,
      description,
      url: path,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: shareTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const result = await getPost(id);

  if (!result) notFound();

  const {
    post,
    creatorName,
    creatorPhoto,
    isLoggedIn,
    isOwner,
    liked,
    saved,
    boostProducts,
    activeBoost,
    spendable,
  } = result;
  const images = (post.media_urls ?? []).filter(Boolean) as string[];
  const videoUrl = post.video_url ?? null;
  const postedOn = post.created_at
    ? new Date(post.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`px-5 py-10 sm:px-8 sm:py-12 ${
        post.product_link ? "pb-28 lg:pb-12" : ""
      }`}
    >
      <div className="mx-auto max-w-5xl">
        <Link
          href="/explore"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-muted underline-offset-4 transition duration-200 hover:text-terracotta hover:underline"
        >
          <span aria-hidden>←</span> Back to Explore
        </Link>

        <div className="mt-6 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
          <div className="min-w-0">
            {images.length > 0 || videoUrl ? (
              <ProductGallery
                images={images}
                videoUrl={videoUrl}
                title={post.product_title ?? "Product"}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-card border border-sand bg-parchment">
                <span className="eyebrow text-ink-faint">
                  No media for this product
                </span>
              </div>
            )}
          </div>

          {/* Sticky on desktop so the buy action stays reachable beside a tall gallery. */}
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <ImpressionTracker postId={post.id} surface="product" />

            {post.category && (
              <span className="eyebrow text-sage">{post.category}</span>
            )}

            <h1 className="mt-3 min-w-0 break-words font-display text-[2rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.5rem]">
              {post.product_title ?? "Untitled product"}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <Avatar
                name={creatorName}
                photoUrl={creatorPhoto}
                size="md"
              />
              <div className="min-w-0">
                {creatorName ? (
                  <Link
                    href={`/profile/${encodeURIComponent(creatorName)}`}
                    className="block truncate font-medium text-ink underline-offset-4 transition duration-200 hover:text-terracotta hover:underline"
                  >
                    {creatorName}
                  </Link>
                ) : (
                  <span className="block text-ink">An independent creator</span>
                )}
                {postedOn && (
                  <span className="text-xs text-ink-faint">
                    Posted {postedOn}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PostActions
                postId={post.id}
                isLoggedIn={isLoggedIn}
                initialLiked={liked}
                initialLikeCount={post.like_count ?? 0}
                initialSaved={saved}
                initialSaveCount={post.save_count ?? 0}
                size="md"
              />
              {isOwner && (
                <>
                  <Link
                    href={`/edit/${post.id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-clay bg-cream px-4 text-sm font-medium text-ink transition duration-200 hover:border-terracotta hover:text-terracotta"
                  >
                    Edit
                  </Link>
                  <DeletePostButton
                    postId={post.id}
                    title={post.product_title}
                  />
                </>
              )}
            </div>

            {isOwner && (
              <OwnerBoostPanel
                postId={post.id}
                products={boostProducts}
                spendable={spendable}
                activeBoost={activeBoost}
                post={{
                  product_title: post.product_title,
                  description: post.description,
                  product_link: post.product_link,
                  media_urls: images,
                  created_at: post.created_at,
                }}
              />
            )}

            {post.description && (
              <div className="rule-double mt-7 pt-7">
                <span className="eyebrow text-ink-faint">About this piece</span>
                <p className="mt-3 min-w-0 break-words whitespace-pre-line text-[0.95rem] leading-[1.85] text-ink-muted">
                  {post.description}
                </p>
              </div>
            )}

            {post.product_link && (
              <OutboundProductLink
                postId={post.id}
                href={post.product_link}
                className="btn-primary btn-lg mt-9 w-full max-lg:hidden"
              >
                Visit Product Page
                <span aria-hidden>↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </OutboundProductLink>
            )}
          </aside>
        </div>
      </div>

      {/* Keep the primary action reachable on long mobile pages. */}
      {post.product_link && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-cream/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <OutboundProductLink
            postId={post.id}
            href={post.product_link}
            className="btn-primary btn-lg w-full"
          >
            Visit Product Page
            <span aria-hidden>↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </OutboundProductLink>
        </div>
      )}
    </div>
  );
}
