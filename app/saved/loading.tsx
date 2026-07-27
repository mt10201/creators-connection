import { ProductGridSkeleton } from "@/app/components/ProductCardSkeleton";

export default function SavedLoading() {
  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow text-sage">Your collection</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Saved
          </h1>
          <div aria-hidden className="skeleton mt-4 h-3.5 w-64 rounded-full" />
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
