import { ProductGridSkeleton } from "@/app/components/ProductCardSkeleton";

export default function ExploreLoading() {
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
          <div
            aria-hidden
            className="skeleton mt-8 h-12 max-w-xl rounded-xl"
          />
        </div>
      </section>

      <section className="sticky top-[69px] z-40 border-y border-sand bg-cream/85 px-5 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-hidden">
          {[64, 78, 96, 84, 72, 90].map((width, index) => (
            <div
              key={index}
              aria-hidden
              className="skeleton h-10 shrink-0 rounded-full"
              style={{ width }}
            />
          ))}
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <ProductGridSkeleton />
        </div>
      </section>
    </div>
  );
}
