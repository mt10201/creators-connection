import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

const description =
  "What Creators Connection is, who it's for, and why it isn't a marketplace — a quiet place for independent makers to share work and find ideas.";

export const metadata: Metadata = {
  title: "About",
  description,
  openGraph: {
    title: `About | ${SITE_NAME}`,
    description,
    url: "/about",
  },
  alternates: {
    canonical: "/about",
  },
};

const sections = [
  {
    title: "What this is",
    body: "Creators Connection is a public shelf for the things independent makers actually make. You post the work — a photo or two, what it is, and a link to wherever it lives — and it joins a feed people browse for ideas. That's the whole shape of it. It exists because good work from small makers is easy to miss when it's buried in feeds built to sell ads.",
  },
  {
    title: "Who it's for",
    body: "Makers of physical and digital things: jewelry, furniture, clothing, ceramics, prints, illustration, small electronics, toys, tools, designs. Hobbyists figuring out whether to take it further, and people who've been at it for years. It's equally for browsers who aren't selling anything — anyone hunting for a gift, a reference, or the nudge that starts their own next project.",
  },
  {
    title: "It isn't a marketplace",
    body: "There's no cart, no checkout, and no commission. We never touch a payment or take a cut of a sale. Every post links out to wherever the maker already sells or shows their work — their shop, their site, their studio page — and that's deliberate. The point here is discovery and inspiration, not transactions. If a listing sends you somewhere to buy, that's between you and the maker.",
  },
  {
    title: "Credits and boosts, kept honest",
    body: "Credits are earned by taking part — posting, and having your work liked or saved — and you can spend them on short, clearly labeled placements. They're optional; the feed works fine if you never spend one. What credits can't buy is a higher organic rank, an unlabeled slot, or the removal of a Boosted label. Discovery stays earned.",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/how-explore-ranks", label: "How Explore Ranks" },
    ],
  },
  {
    title: "Who's behind it",
    body: "A small independent project rather than a company with a growth team — built and maintained by one person who wanted this to exist. That means it moves at a human pace, and it also means feedback actually reaches someone who can act on it.",
    links: [{ href: "/contact", label: "Get in touch" }],
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="px-5 pb-14 pt-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-sage">About</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            What this place <em className="italic text-terracotta">is</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted sm:text-lg">
            A calm corner of the internet where independent makers put their work
            on a shelf, and other people come looking for ideas.
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {sections.map((section) => (
            <article key={section.title} className="rule-double pt-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {section.title}
              </h2>
              <p className="mt-3 text-[0.95rem] leading-[1.85] text-ink-muted">
                {section.body}
              </p>
              {section.links && (
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex min-h-10 items-center text-sm text-terracotta underline-offset-4 transition hover:underline"
                    >
                      {link.label} →
                    </Link>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-sand bg-parchment/70 px-6 py-12 text-center shadow-soft sm:px-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Have a look around
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-[1.85] text-ink-muted">
            Browsing is free and takes no account. Posting your own work takes
            about a minute.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/explore" className="btn-secondary btn-lg">
              Explore
            </Link>
            <Link href="/signup" className="btn-primary btn-lg">
              Join Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
