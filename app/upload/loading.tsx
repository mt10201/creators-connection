export default function UploadLoading() {
  return (
    <div className="px-5 py-16 sm:px-8">
      <div
        role="status"
        aria-label="Loading upload form"
        className="mx-auto max-w-2xl"
      >
        <div className="mb-9 text-center">
          <span className="eyebrow text-sage">New post</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Share your <em className="italic text-terracotta">product</em>
          </h1>
          <div
            aria-hidden
            className="skeleton mx-auto mt-5 h-3.5 w-72 max-w-full rounded-full"
          />
        </div>

        <div className="rounded-[2rem] border border-sand bg-parchment/70 p-6 shadow-soft sm:p-9">
          <div className="space-y-6" aria-hidden>
            <div>
              <div className="skeleton h-3 w-24 rounded-full" />
              <div className="skeleton mt-3 h-11 w-full rounded-xl" />
            </div>
            <div>
              <div className="skeleton h-3 w-28 rounded-full" />
              <div className="skeleton mt-3 h-28 w-full rounded-xl" />
            </div>
            <div>
              <div className="skeleton h-3 w-32 rounded-full" />
              <div className="skeleton mt-3 h-11 w-full rounded-xl" />
            </div>
            <div>
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton mt-3 h-11 w-full rounded-xl" />
            </div>
            <div className="skeleton h-36 w-full rounded-xl" />
            <div className="skeleton h-13 w-full rounded-full" />
          </div>
        </div>

        <span className="sr-only">Loading upload form…</span>
      </div>
    </div>
  );
}
