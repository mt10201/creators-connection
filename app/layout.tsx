import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans, Fraunces } from "next/font/google";
import {
  getDefaultOgImageUrl,
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";
import Navbar from "./components/Navbar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// Fraunces has a soft, slightly quirky warmth that keeps headings from
// reading as generic editorial serif.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const ogImageUrl = getDefaultOgImageUrl();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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

const footerLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/how-explore-ranks", label: "How Explore Ranks" },
  { href: "/referrals", label: "Referrals" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-ink">
        <Navbar />

        <main className="flex-1">{children}</main>

        <footer className="mt-20 border-t border-sand bg-parchment/60 sm:mt-24">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xs">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terracotta font-display text-sm font-semibold text-cream">
                    cc
                  </span>
                  <span className="font-display text-lg font-semibold tracking-tight">
                    Creators Connection
                  </span>
                </Link>
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                  A quiet corner of the internet for independent makers to share
                  what they build.
                </p>
              </div>

              <nav className="flex flex-wrap gap-x-10 gap-y-1">
                {footerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex min-h-10 items-center text-sm text-ink-muted underline-offset-4 transition duration-200 hover:text-terracotta hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="rule-double mt-12 pt-6">
              <p className="text-xs text-ink-faint">
                © {new Date().getFullYear()} Creators Connection — built for
                independent makers everywhere.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
