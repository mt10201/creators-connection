import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

const description =
  "How Explore ranks posts on Creators Connection — freshness, engagement, diversity, and what boosts can and cannot buy.";

export const metadata: Metadata = {
  title: "How Explore Ranks",
  description,
  openGraph: {
    title: `How Explore Ranks | ${SITE_NAME}`,
    description,
    url: "/how-explore-ranks",
  },
  alternates: {
    canonical: "/how-explore-ranks",
  },
};

const sections = [
  {
    title: "What shapes the organic feed",
    body: "Explore ranks posts using a few simple signals: how recently they were published, how people engage with them, and a small lift for newer makers. Saves count more than likes, because saving usually means someone wants to come back to the work. The goal is a feed that feels fresh and useful — not a popularity contest that freezes out new voices.",
  },
  {
    title: "Diversity at the top",
    body: "One maker can’t fill the top of Explore alone. After scoring, we gently rebalance so early positions show work from a mix of creators. That keeps the first screen fairer for everyone browsing, and gives more makers a real chance to be seen.",
  },
  {
    title: "Boosts stay separate and labeled",
    body: "Just landed on Explore and Home Feature on the homepage are reserved placements you can buy with earned credits. They sit outside the organic ranking and always carry a clear Boosted or Featured label. Spending credits never changes where a post appears in the organic grid or in search.",
  },
  {
    title: "Fresh Push is a launch window",
    body: "Fresh Push places a post in the labeled Just landed strip for a short time. It’s only available on posts less than 24 hours old — a true launch boost, not a way to keep older work permanently at the front. Older posts can still use Home Feature.",
  },
  {
    title: "What we don’t sell",
    body: "Credits cannot buy a higher organic rank, an unlabeled placement, or the removal of Boosted/Featured labels. If something looks boosted, it is. Organic discovery stays earned by the work itself and how the community responds to it.",
  },
];

export default function HowExploreRanksPage() {
  return (
    <div>
      <section className="px-5 pb-14 pt-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-sage">Transparency</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            How Explore{" "}
            <em className="italic text-terracotta">ranks</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted sm:text-lg">
            A plain look at how discovery works here — so makers know the feed
            is fair, labeled, and not for sale.
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
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-ink-muted">
            Want the full picture on credits and boosts?
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/how-it-works#credits" className="btn-secondary">
              How It Works
            </Link>
            <Link href="/explore" className="btn-primary">
              Browse Explore
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
