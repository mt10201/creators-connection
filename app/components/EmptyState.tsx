import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description: string;
  /** Action buttons, laid out in a responsive row. */
  children?: ReactNode;
  tone?: "neutral" | "error";
};

export default function EmptyState({
  eyebrow,
  title,
  description,
  children,
  tone = "neutral",
}: Props) {
  const isError = tone === "error";

  return (
    <div
      className={`rounded-[2rem] border px-6 py-16 text-center sm:px-10 sm:py-20 ${
        isError
          ? "border-terracotta/20 bg-terracotta-soft/30"
          : "border-sand bg-parchment/60 shadow-soft"
      }`}
    >
      <div className="mx-auto max-w-md">
        {/* A small rotated diamond stands in for an illustration. */}
        <span
          aria-hidden
          className={`mx-auto flex h-12 w-12 rotate-45 items-center justify-center rounded-[0.7rem] border transition-transform duration-300 ${
            isError ? "border-terracotta/40" : "border-clay"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isError ? "bg-terracotta" : "bg-clay"
            }`}
          />
        </span>

        {eyebrow && (
          <span
            className={`eyebrow mt-7 block ${
              isError ? "text-terracotta-deep" : "text-sage"
            }`}
          >
            {eyebrow}
          </span>
        )}

        <h2
          className={`mt-3 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem] ${
            isError ? "text-terracotta-deep" : "text-ink"
          }`}
        >
          {title}
        </h2>

        <p className="mt-3 text-[0.95rem] leading-[1.8] text-ink-muted">
          {description}
        </p>

        {children && (
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
