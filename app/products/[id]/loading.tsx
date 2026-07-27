export default function ProductLoading() {
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-12">
      <div
        role="status"
        aria-label="Loading product"
        className="mx-auto max-w-5xl"
      >
        <div aria-hidden className="skeleton h-3.5 w-32 rounded-full" />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
          <div className="rounded-card border border-sand bg-parchment p-3 shadow-soft sm:p-4">
            <div aria-hidden className="skeleton aspect-[4/3] rounded-[1rem]" />
          </div>

          <div aria-hidden className="lg:pt-1">
            <div className="skeleton h-2.5 w-20 rounded-full" />
            <div className="skeleton mt-4 h-8 w-full rounded-full" />
            <div className="skeleton mt-2.5 h-8 w-2/3 rounded-full" />
            <div className="skeleton mt-5 h-3.5 w-40 rounded-full" />

            <div className="mt-7 flex gap-2">
              <div className="skeleton h-9 w-20 rounded-full" />
              <div className="skeleton h-9 w-20 rounded-full" />
            </div>

            <div className="rule-double mt-7 space-y-2.5 pt-7">
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-full rounded-full" />
              <div className="skeleton h-3 w-4/5 rounded-full" />
            </div>

            <div className="skeleton mt-9 h-13 w-full rounded-full" />
          </div>
        </div>

        <span className="sr-only">Loading product…</span>
      </div>
    </div>
  );
}
