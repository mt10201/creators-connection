import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { BOOST_CAPS, loadBoostProducts } from "@/lib/boosts";

const howItWorksDescription =
  "Learn how Creators Connection works — create an account, post your products, browse for inspiration, and use credits to grow.";

export const metadata: Metadata = {
  title: "How It Works",
  description: howItWorksDescription,
  openGraph: {
    title: `How It Works | ${SITE_NAME}`,
    description: howItWorksDescription,
    url: "/how-it-works",
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

const postIncludes = [
  "Clear photos or visuals of your product",
  "A short description of what you made and why",
  "Materials, tools, or process notes others can learn from",
  "Tags or categories so the right people can find your work",
];

const earnCredits = [
  "+5 credits once when you create an account (signup bonus)",
  "+1 credit the first time you post a given product URL",
  "+1 credit to you when someone likes your post (max +10 per post from likes)",
  "+2 credits to you when someone saves your post (max +10 per post from saves)",
  "Credits become spendable after 24 hours",
  "Up to 10 product posts per day",
];

const spendRules = [
  `Boosts are bought with vested credits only — ${BOOST_CAPS.purchasesPer24h} purchases per 24 hours`,
  `${BOOST_CAPS.activePerPost} active boost per post, ${BOOST_CAPS.concurrentPerAccount} running at a time per account`,
  "Every boosted item carries a visible “Boosted” or “Featured” label",
  "The first four Explore results are always organic and can’t be bought",
  "Explore Spotlight slots are coming later and are switched off today",
];

const creditsCannotBuy = [
  "A higher position in Explore, search, or any organic feed",
  "Likes, saves, followers, or engagement of any kind",
  "Removal of the boost label, or a hidden/undisclosed placement",
  "Anything with real money — credits are earned, never sold",
];

function StepNumber({ value }: { value: string }) {
  return (
    <span className="font-display text-4xl font-normal leading-none text-clay">
      {value}
    </span>
  );
}

export default async function HowItWorksPage() {
  const supabase = await createClient();
  // Prices live in boost_products so this page can never drift from the RPC.
  const boostProducts = await loadBoostProducts(supabase);

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
                tool, a piece of art, or anything original. The first time you
                post a given product link you earn 1 credit; likes and saves
                from others earn more. Great posts help other makers learn from
                your process and discover your work.
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

          <article id="credits" className="grid scroll-mt-24 gap-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
            <StepNumber value="04" />
            <div className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                The credit system
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                Credits are earned by contributing, never bought with money. New
                credits vest for 24 hours before they become spendable, which
                keeps quick throwaway posting from turning into instant reach.
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
                    {boostProducts.map((product) => (
                      <li
                        key={product.slug}
                        className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage"
                        />
                        <span>
                          <span className="font-medium text-ink">
                            {product.name}
                          </span>{" "}
                          — {product.cost_credits} credits for{" "}
                          {product.duration_hours} hours. {product.description}
                        </span>
                      </li>
                    ))}
                    {spendRules.map((item) => (
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

              <div className="mt-4 rounded-[1.25rem] border border-sand bg-parchment/70 p-6">
                <h3 className="eyebrow text-ink-faint">
                  What credits cannot buy
                </h3>
                <ul className="mt-4 space-y-3">
                  {creditsCannotBuy.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-relaxed text-ink-muted"
                    >
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  Boosts only fill reserved, labeled slots — the Just landed
                  strip on Explore and the homepage banner. The first four
                  Explore results always stay organic, organic ranking never
                  takes a boost into account, and when nobody has boosted, the
                  Just landed strip simply doesn’t appear.
                </p>
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
