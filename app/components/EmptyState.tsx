import type { ReactNode } from "react";

/**
 * Typographic marks rather than icon art, matching the glyph language the
 * like/save buttons already use. Omit `mark` for the plain dot.
 */
const marks = {
  spark: "✦",
  star: "☆",
  heart: "♡",
  post: "✎",
} as const;

type Props = {
  eyebrow?: string;
  title: string;
  description: ReactNode;
  /** Action buttons, laid out in a responsive row. */
  children?: ReactNode;
  /** Wider content below the actions, e.g. onboarding steps. */
  footer?: ReactNode;
  mark?: keyof typeof marks;
  tone?: "neutral" | "error";
};

export default function EmptyState({
  eyebrow,
  title,
  description,
  children,
  footer,
  mark,
  tone = "neutral",
}: Props) {
  const isError = tone === "error";

  return (
    <div
      className={`animate-fade-in rounded-[2rem] border px-6 py-16 text-center sm:px-10 sm:py-20 ${
        isError
          ? "border-terracotta/20 bg-terracotta-soft/30"
          : "border-sand bg-parchment/60 shadow-soft"
      }`}
    >
      <div className="mx-auto max-w-md">
        {/* A rotated square mat stands in for an illustration; the mark inside
            is counter-rotated so it reads upright. */}
        <span
          aria-hidden
          className={`mx-auto flex h-14 w-14 rotate-45 items-center justify-center rounded-[0.85rem] border ${
            isError
              ? "border-terracotta/40 bg-terracotta-soft/50"
              : "border-clay bg-cream shadow-soft"
          }`}
        >
          {mark ? (
            <span
              className={`-rotate-45 text-lg leading-none ${
                isError ? "text-terracotta" : "text-terracotta/75"
              }`}
            >
              {marks[mark]}
            </span>
          ) : (
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isError ? "bg-terracotta" : "bg-clay"
              }`}
            />
          )}
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

      {/* Outside the prose column so step guidance can use the full card width. */}
      {footer && (
        <div className="mx-auto mt-12 max-w-3xl border-t border-sand pt-10 text-left">
          {footer}
        </div>
      )}
    </div>
  );
}
