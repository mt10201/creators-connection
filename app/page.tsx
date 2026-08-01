import type { Metadata } from "next";
import Link from "next/link";
import {
  getDefaultOgImageUrl,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";

const ogImageUrl = getDefaultOgImageUrl();
const siteUrl = getSiteUrl().toString();

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImageUrl],
  },
};

const steps = [
  {
    number: "01",
    title: "Share your work",
    description:
      "Post your products, projects, and creative process in a space built for makers — not algorithms.",
  },
  {
    number: "02",
    title: "Discover inspiration",
    description:
      "Browse original work from independent creators across disciplines and find ideas that spark your next project.",
  },
  {
    number: "03",
    title: "Connect & grow",
    description:
      "Follow creators you admire, save what inspires you, and build momentum alongside a community that gets it.",
  },
];

const posterBenefits = [
  "Showcase your work to people who care about craft",
  "Get discovered by fellow makers, not just followers",
  "Build a focused portfolio without the noise",
  "Learn from how other creators present and iterate",
];

const browserBenefits = [
  "Curated feed of original, independent work",
  "Save ideas and references for your own projects",
  "Discover makers before they hit the mainstream",
  "A calm space to explore without endless scrolling",
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow inline-flex items-center gap-2 text-sage">
            <span aria-hidden className="h-px w-8 bg-sage/50" />
            A focused space for independent makers
            <span aria-hidden className="h-px w-8 bg-sage/50" />
          </p>

          <h1 className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Where original
            <br className="hidden sm:block" />{" "}
            <em className="italic text-terracotta">creators</em> connect
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
            Share your work. Find inspiration. Grow together.
          </p>

          <div className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="btn-primary btn-lg">
              Join Free
            </Link>
            <Link href="/explore" className="btn-secondary btn-lg">
              Start Exploring
            </Link>
          </div>

          {/* A small hand-set detail: the disciplines, as a typographic line. */}
          <p className="mt-14 text-sm italic leading-relaxed text-ink-faint">
            Jewelry · Home Décor · Clothing · Painting · Sculpting · Woodworking
            · Furniture · Electronics · Toys · Designs
          </p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-24 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-sand bg-parchment/70 px-6 py-12 text-center shadow-soft sm:px-14 sm:py-14">
          <span className="eyebrow text-terracotta">Our intent</span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for makers, not metrics
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted sm:text-lg">
            Creators Connection is where independent makers share their products
            for inspiration and discovery — a focused space for original
            creators to get ideas and grow. No noise, no pressure — just real
            work from people doing things their own way.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <span className="eyebrow text-sage">How it works</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Three simple steps to share, discover, and grow
            </h2>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="group">
                <span className="font-display text-4xl font-normal text-clay transition duration-300 group-hover:text-terracotta">
                  {step.number}
                </span>
                <div className="rule-double mt-4 pt-5">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[0.95rem] leading-[1.8] text-ink-muted">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section
        id="benefits"
        className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <span className="eyebrow text-sage">Why join</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Whether you share your work or explore others&apos;, everyone wins
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-terracotta/15 bg-terracotta-soft/40 p-7 sm:p-9">
              <span className="eyebrow text-terracotta-deep">For posters</span>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
                Share your craft with the right audience
              </h3>
              <ul className="mt-7 space-y-4">
                {posterBenefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-ink-muted"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] border border-sage/20 bg-sage-soft/50 p-7 sm:p-9">
              <span className="eyebrow text-sage">For browsers</span>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">
                Find inspiration that actually moves you
              </h3>
              <ul className="mt-7 space-y-4">
                {browserBenefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-ink-muted"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-[2.25rem] bg-ink px-6 py-14 text-center shadow-lift sm:px-14 sm:py-16">
          <span className="eyebrow text-ochre">Join free</span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
            Ready to connect with original creators?
          </h2>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-sand/80">
            Join a community of independent makers sharing work, finding
            inspiration, and growing together — for free.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="btn-primary btn-lg">
              Join Free
            </Link>
            <Link href="/explore" className="btn-on-ink btn-lg">
              Start Exploring
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
