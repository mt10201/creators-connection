import Link from "next/link";
import PostActions from "./PostActions";
import ProductCardMedia from "./ProductCardMedia";
import ImpressionTracker from "./ImpressionTracker";
import { isBoostedSurface, type TrackingSurface } from "@/lib/tracking";

export type ProductCardPost = {
  id: string;
  product_title: string | null;
  description: string | null;
  category: string | null;
  media_urls: string[] | null;
  video_url?: string | null;
  like_count: number | null;
  save_count: number | null;
};

type Props = {
  post: ProductCardPost;
  creatorName?: string | null;
  /** Omitted on a profile page, where every card has the same creator. */
  showCreator?: boolean;
  isLoggedIn: boolean;
  liked: boolean;
  saved: boolean;
  priority?: boolean;
  /** "Boosted" / "Featured" — always shown when the card sits in a paid rail. */
  boostLabel?: string | null;
  /** Set on discovery feeds to count impressions; omitted elsewhere. */
  impressionSurface?: TrackingSurface | null;
};

export default function ProductCard({
  post,
  creatorName,
  showCreator = true,
  isLoggedIn,
  liked,
  saved,
  priority = false,
  boostLabel = null,
  impressionSurface = null,
}: Props) {
  const coverImage = post.media_urls?.[0] ?? null;
  const extraImages = (post.media_urls?.length ?? 0) - 1;
  const videoUrl = post.video_url ?? null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-sand bg-cream shadow-soft transition duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:border-clay hover:shadow-lift focus-within:border-clay focus-within:shadow-lift">
      {impressionSurface && post.id && (
        <ImpressionTracker
          postId={post.id}
          surface={impressionSurface}
          isBoosted={isBoostedSurface(impressionSurface)}
        />
      )}

      <div className="p-2.5 pb-0">
        <ProductCardMedia
          href={`/products/${post.id}`}
          title={post.product_title ?? "Product image"}
          coverImage={coverImage}
          videoUrl={videoUrl}
          category={post.category}
          extraImages={extraImages}
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-4 pt-4 sm:pb-5">
        <div className="flex flex-wrap items-center gap-2">
          {boostLabel && (
            <span
              title="Paid with earned credits. Organic ranking is unaffected."
              className="inline-flex items-center rounded-full bg-ochre px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-cream"
            >
              {boostLabel}
            </span>
          )}
          {post.category && (
            <span className="eyebrow text-sage">{post.category}</span>
          )}
        </div>

        <h2 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight">
          <Link
            href={`/products/${post.id}`}
            className="transition duration-200 group-hover:text-terracotta"
          >
            {post.product_title ?? "Untitled product"}
          </Link>
        </h2>

        {showCreator &&
          (creatorName ? (
            <Link
              href={`/profile/${encodeURIComponent(creatorName)}`}
              className="mt-1 w-fit py-0.5 text-sm italic text-ink-muted underline-offset-4 transition duration-200 hover:text-terracotta hover:underline"
            >
              by {creatorName}
            </Link>
          ) : (
            <p className="mt-1 py-0.5 text-sm italic text-ink-faint">
              by an independent creator
            </p>
          ))}

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-muted">
          {post.description}
        </p>

        <div className="rule-double mt-5 flex items-center justify-between gap-3 pt-3">
          <PostActions
            postId={post.id}
            isLoggedIn={isLoggedIn}
            initialLiked={liked}
            initialLikeCount={post.like_count ?? 0}
            initialSaved={saved}
            initialSaveCount={post.save_count ?? 0}
          />

          <Link
            href={`/products/${post.id}`}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-sm text-terracotta underline-offset-4 transition duration-200 hover:bg-terracotta-soft/40 hover:underline"
          >
            View
            <span
              aria-hidden
              className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
            <span className="sr-only">
              {post.product_title ?? "this product"}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
