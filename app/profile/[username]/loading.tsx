import { ProductGridSkeleton } from "@/app/components/ProductCardSkeleton";

export default function ProfileLoading() {
  return (
    <div>
      <section className="px-5 pb-8 pt-14 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div
              aria-hidden
              className="skeleton h-20 w-20 shrink-0 rounded-full"
            />
            <div className="w-full">
              <span className="eyebrow text-sage">Creator</span>
              <div
                aria-hidden
                className="skeleton mt-3 h-9 w-52 rounded-full sm:h-11"
              />
              <div className="mt-4 flex gap-2">
                <div aria-hidden className="skeleton h-7 w-24 rounded-full" />
                <div aria-hidden className="skeleton h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>
          <div className="rule-double mt-10" />
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
