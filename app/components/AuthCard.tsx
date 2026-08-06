import Link from "next/link";
import type { ReactNode } from "react";

/** Shared chrome for the login, signup, and password-reset screens. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-sand bg-parchment/70 p-8 shadow-soft sm:p-10">
          <div className="mb-9 text-center">
            <Link href="/" className="mb-6 inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta font-display text-sm font-semibold text-cream">
                cc
              </span>
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
