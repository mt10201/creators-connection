"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialQuery: string;
  category: string;
};

export default function ExploreSearch({ initialQuery, category }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  function hrefFor(nextQuery: string) {
    const params = new URLSearchParams();
    const q = nextQuery.trim();
    if (q) params.set("q", q);
    if (category && category !== "All") params.set("category", category);
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => {
      router.push(hrefFor(value));
    });
  }

  function clear() {
    setValue("");
    startTransition(() => {
      router.push(hrefFor(""));
    });
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`relative mt-8 max-w-xl transition-opacity duration-200 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <label htmlFor="explore-search" className="sr-only">
        Search products
      </label>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-faint"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-4.35-4.35m1.6-5.15a6.75 6.75 0 1 1-13.5 0 6.75 6.75 0 0 1 13.5 0Z"
          />
        </svg>
      </span>
      <input
        id="explore-search"
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search titles and descriptions…"
        autoComplete="off"
        className="form-input mt-0 min-h-12 border-sand bg-cream/90 py-3 pl-12 shadow-soft placeholder:text-ink-faint/80 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        style={{ paddingRight: value ? "8.5rem" : "5.25rem" }}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
        {value && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            aria-label="Clear search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:bg-sand hover:text-terracotta disabled:opacity-60"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-terracotta px-3.5 py-1.5 text-xs font-medium text-cream transition hover:bg-terracotta-deep disabled:opacity-60"
        >
          Search
        </button>
      </div>
    </form>
  );
}
