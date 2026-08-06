import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const description =
  "Get in touch about your Creators Connection account, a bug, or anything else on the site.";

export const metadata: Metadata = {
  title: "Contact",
  description,
  openGraph: {
    title: `Contact | ${SITE_NAME}`,
    description,
    url: "/contact",
  },
  alternates: {
    canonical: "/contact",
  },
};

const goodReasons = [
  "Account trouble — sign-in, password, or username",
  "Something broken, missing, or behaving oddly",
  "Credits or boosts that didn't land the way you expected",
  "Reporting a post that shouldn't be here",
];

export default function ContactPage() {
  return (
    <div>
      <section className="px-5 pb-12 pt-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-sage">Contact</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Say <em className="italic text-terracotta">hello</em>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-[1.85] text-ink-muted">
            One inbox, read by a real person. It's the right place for site and
            account issues.
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-sand bg-cream p-6 text-center shadow-soft sm:p-8">
            <span className="eyebrow text-sage">Email</span>
            <p className="mt-3 break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {CONTACT_EMAIL}
            </p>
            <div className="mt-6">
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary">
                Email us
              </a>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted">
              Questions about a specific product — sizing, shipping, whether it's
              still available — are best taken to the maker through the link on
              their post. They handle their own sales; we don't.
            </p>
          </div>

          <div className="rule-double mt-12 pt-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Worth emailing about
            </h2>
            <ul className="mt-4 space-y-2.5">
              {goodReasons.map((reason) => (
                <li
                  key={reason}
                  className="flex gap-3 text-[0.95rem] leading-[1.8] text-ink-muted"
                >
                  <span aria-hidden className="text-terracotta">
                    ·
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.95rem] leading-[1.8] text-ink-muted">
              Including your username and a link to the page you were on makes
              anything easier to sort out.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-ink-muted">
            Looking for how credits, boosts, or ranking work?
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/how-it-works" className="btn-secondary">
              How It Works
            </Link>
            <Link href="/about" className="btn-secondary">
              About
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
