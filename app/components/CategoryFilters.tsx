"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  categories: readonly string[];
  active: string;
  /** Preserve the current search when switching categories. */
  query?: string;
};

function categoryHref(category: string, query?: string) {
  const params = new URLSearchParams();
  if (category !== "All") params.set("category", category);
  const q = query?.trim();
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

/**
 * Sticky category chips with:
 * - active chip scrolled into view on narrow screens
 * - a soft pending state while the next feed loads
 */
export default function CategoryFilters({
  categories,
  active,
  query = "",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  useEffect(() => {
    setPendingCategory(null);
  }, [active]);

  function select(category: string, href: string) {
    if (category === active) return;
    setPendingCategory(category);
    startTransition(() => {
      router.push(href);
    });
  }

  const highlighted = pendingCategory ?? active;

  return (
    <nav
      aria-label="Filter by category"
      className="sticky top-[69px] z-40 border-y border-sand bg-cream/85 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-5 py-3 sm:px-8">
        <div className="relative">
          <div
            className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 transition-opacity duration-200 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              pending ? "opacity-70" : ""
            }`}
          >
            {categories.map((category) => {
              const isActive = highlighted === category;
              const href = categoryHref(category, query);
              return (
                <Link
                  key={category}
                  ref={category === active ? activeRef : undefined}
                  href={href}
                  aria-current={category === active ? "page" : undefined}
                  aria-busy={
                    pending && pendingCategory === category ? true : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    select(category, href);
                  }}
                  className={`chip ${
                    isActive
                      ? "border-terracotta bg-terracotta text-cream shadow-soft"
                      : "border-sand bg-cream text-ink-muted hover:-translate-y-px hover:border-terracotta/40 hover:text-terracotta"
                  }`}
                >
                  {category}
                </Link>
              );
            })}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-cream to-transparent sm:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cream to-transparent sm:hidden"
          />
        </div>
      </div>
    </nav>
  );
}
