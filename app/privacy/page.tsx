import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const description =
  "What Creators Connection collects, where it's stored, and what we never do with it — in plain language.";

export const metadata: Metadata = {
  title: "Privacy",
  description,
  openGraph: {
    title: `Privacy | ${SITE_NAME}`,
    description,
    url: "/privacy",
  },
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "August 2026";

const sections: { title: string; body: string; bullets?: string[] }[] = [
  {
    title: "Your account",
    body: "Signing up creates an account with your email address and a password, both handled by our authentication provider — we never see or store your password in readable form. Your profile holds whatever you choose to add:",
    bullets: [
      "Username, which is public",
      "Bio and profile photo, if you add them — also public",
      "Email address, which is never shown on the site",
    ],
  },
  {
    title: "What you post and do",
    body: "The core of the site is the work people share, so most of what we store is content you deliberately create:",
    bullets: [
      "Posts: title, description, tags, the outbound product link, and any images or short video you upload",
      "Likes, saves, and follows — the counts are public, and the maker is notified when their work is liked or saved",
      "Notifications generated for you",
      "Your credit ledger: every earn and spend, with the reason, amount, and timestamp",
      "Referrals: if you joined through someone's invite link, your account records who invited you",
    ],
  },
  {
    title: "Basic usage counts",
    body: "So makers can tell whether a post is being seen, we count how often cards appear in the feed and how often outbound product links are clicked. These are counted once per viewer per post per hour rather than logged as a browsing history. Signed-in views are keyed to your account id; if you're not signed in, your browser stores a random identifier for this purpose only — it carries no name, email, or profile. We don't run advertising or third-party analytics trackers.",
  },
  {
    title: "Cookies and sessions",
    body: "Cookies are used to keep you signed in and to keep your session secure — that's it. There are no advertising or cross-site tracking cookies. The random viewer identifier described above lives in your browser's local storage; clearing site data removes it.",
  },
  {
    title: "Where your data lives",
    body: "The site runs on Vercel, and the database, authentication, and uploaded files are hosted with Supabase. Both process data on our behalf as part of running the service, and both may store it on infrastructure outside your country. Uploaded images and videos are served from public URLs, which means anything you post should be treated as public.",
  },
  {
    title: "What we don't do",
    body: "We don't sell, rent, or trade your personal information, and we don't hand your email address to advertisers or list brokers. We don't process payments or see card details — every sale happens on the maker's own site, under their own terms and privacy policy. Data is shared only where it's needed to run the site (the hosts above) or where the law requires it.",
  },
  {
    title: "Deleting your account",
    body: "You can delete your account yourself from Settings → Danger zone. That removes your profile, your posts, and the files you uploaded, and it can't be undone. Aggregate counts that no longer identify you — like a post's total view count — may remain, and copies can persist briefly in routine backups before they age out.",
  },
  {
    title: "Children",
    body: "Creators Connection isn't intended for anyone under 13, and we don't knowingly collect information from children. If you believe a child has created an account, email us and we'll remove it.",
  },
  {
    title: "Changes and questions",
    body: `If this policy changes in a way that matters, we'll update the date at the top of this page. Questions, requests for a copy of your data, or anything else privacy-related can go to ${CONTACT_EMAIL}.`,
  },
];

export default function PrivacyPage() {
  return (
    <div>
      <section className="px-5 pb-14 pt-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-sage">Privacy</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Your data, <em className="italic text-terracotta">plainly</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.85] text-ink-muted sm:text-lg">
            A small site should have a short privacy policy. Here's everything
            we collect, where it goes, and what we never do with it.
          </p>
          <p className="mt-5 text-xs uppercase tracking-[0.14em] text-ink-faint">
            Last updated {LAST_UPDATED}
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
              {section.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-3 text-[0.95rem] leading-[1.8] text-ink-muted"
                    >
                      <span aria-hidden className="text-terracotta">
                        ·
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-ink-muted">
            Something here unclear, or a request about your data?
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary">
              Email us
            </a>
            <Link href="/contact" className="btn-secondary">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
