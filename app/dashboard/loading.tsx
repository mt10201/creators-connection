import { ProductGridSkeleton } from "@/app/components/ProductCardSkeleton";

export default function DashboardLoading() {
  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow text-sage">Your studio</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Dashboard
          </h1>
          <div
            aria-hidden
            className="skeleton mt-10 h-40 w-full rounded-[2rem]"
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden
                className="skeleton h-28 rounded-[1.5rem]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
