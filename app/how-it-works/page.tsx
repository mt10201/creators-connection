import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | Creators Connection",
  description:
    "Learn how Creators Connection works — create an account, post your products, browse for inspiration, and use credits to grow.",
};

const postIncludes = [
  "Clear photos or visuals of your product",
  "A short description of what you made and why",
  "Materials, tools, or process notes others can learn from",
  "Tags or categories so the right people can find your work",
];

const earnCredits = [
  "Post a new product to the community",
  "Complete your creator profile",
  "Engage thoughtfully with other makers' work",
  "Refer a fellow creator who joins and posts",
];

const spendCredits = [
  "Boost a product post for extra visibility",
  "Unlock premium placement in discovery feeds",
  "Save and organize inspiration collections",
  "Access featured creator spotlights",
];

function StepNumber({ value }: { value: string }) {
  return (
    <span className="font-display text-4xl font-normal leading-none text-clay">
      {value}
    </span>
  );
}

export default function HowItWorksPage() {
  return (
    <div>
      {/* Page header */}
      <section className="px-5 pb-14 pt-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-sage">The basics</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            How it <em className="italic text-terracotta">works</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted sm:text-lg">
            Creators Connection is where independent makers share their products
            for inspiration and discovery — a focused space for original
            creators to get ideas and grow. Here&apos;s everything you need to
            know to get started.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-14">
          <article className="grid gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="01" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Create your free account
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Sign up in seconds with your email — no credit card required.
                Add a profile photo, a short bio, and what kind of work you
                create. Your account is your home base for sharing products,
                saving inspiration, and tracking your credits.
              </p>
            </div>
          </article>

          <article className="grid gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="02" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Post your product
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Share something you&apos;ve made — a physical product, a digital
                tool, a piece of art, or anything original. Great posts help
                other makers learn from your process and discover your work.
              </p>
              <div className="mt-6 rounded-[1.25rem] border border-sand bg-parchment/70 p-6">
                <span className="eyebrow text-terracotta">
                  What a strong post includes
                </span>
                <ul className="mt-4 space-y-3">
                  {postIncludes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted"
                    >
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="grid gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="03" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Browse and discover
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Explore a curated feed of original work from independent
                creators. Filter by category, save posts that inspire you, and
                follow makers whose approach resonates with yours. Discovery
                here is intentional — no endless scrolling, just focused
                inspiration.
              </p>
            </div>
          </article>

          <article className="grid gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="04" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                The credit system
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Credits keep Creators Connection balanced — rewarding people who
                contribute to the community while giving everyone access to
                powerful discovery tools.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-terracotta/15 bg-terracotta-soft/40 p-6">
                  <h3 className="eyebrow text-terracotta-deep">
                    How to earn credits
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {earnCredits.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.25rem] border border-sage/20 bg-sage-soft/50 p-6">
                  <h3 className="eyebrow text-sage">How to spend credits</h3>
                  <ul className="mt-4 space-y-3">
                    {spendCredits.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>

          <article className="grid gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="05" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Why both posting and browsing matter
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Creators Connection works best when everyone participates on
                both sides. Posting puts your work in front of people who
                genuinely care about craft — not vanity metrics. Browsing
                exposes you to ideas, techniques, and makers you wouldn&apos;t
                find anywhere else.
              </p>
              <p className="mt-4 text-[0.95rem] leading-[1.85] text-ink-muted">
                The makers who grow the most here are the ones who share openly
                and explore curiously. Give inspiration, receive inspiration —
                that&apos;s how the community thrives.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2.25rem] bg-ink px-8 py-16 text-center shadow-lift sm:px-12">
          <span className="eyebrow text-ochre">Join free</span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-sand/80">
            Join a community of independent makers. Share your work, find
            inspiration, and grow — completely free.
          </p>
          <Link href="/signup" className="btn-primary btn-lg mt-9 w-full sm:w-auto">
            Create Your Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
