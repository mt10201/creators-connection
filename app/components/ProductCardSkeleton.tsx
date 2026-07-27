/** Mirrors ProductCard's structure so the grid doesn't shift when data lands. */
export default function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col overflow-hidden rounded-card border border-sand bg-cream shadow-soft"
    >
      <div className="p-2.5 pb-0">
        <div className="skeleton aspect-[4/5] w-full rounded-[1rem]" />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <div className="skeleton h-2.5 w-16 rounded-full" />
        <div className="skeleton mt-3.5 h-4 w-4/5 rounded-full" />
        <div className="skeleton mt-2.5 h-3 w-1/3 rounded-full" />
        <div className="skeleton mt-4 h-3 w-full rounded-full" />
        <div className="skeleton mt-2 h-3 w-2/3 rounded-full" />

        <div className="rule-double mt-5 flex items-center justify-between pt-4">
          <div className="flex gap-2">
            <div className="skeleton h-7 w-14 rounded-full" />
            <div className="skeleton h-7 w-14 rounded-full" />
          </div>
          <div className="skeleton h-3 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
