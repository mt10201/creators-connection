"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ImpressionTracker from "./ImpressionTracker";

export type FeatureSlide = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  image: string | null;
  creatorName: string | null;
  /** "Featured" when the slot was bought with credits, null when organic. */
  boostLabel: string | null;
};

const ROTATE_MS = 6000;
const FADE_MS = 500;

export default function FeatureCarousel({ slides }: { slides: FeatureSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;

    const timer = setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      ROTATE_MS
    );

    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="overflow-hidden rounded-[2rem] border border-sand bg-parchment/70 shadow-soft"
    >
      <div
        aria-live="polite"
        className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-stretch"
      >
        {/* Letterbox, don't crop: contain the whole piece in a shared-height column. */}
        <div className="relative aspect-[4/3] bg-cream sm:aspect-auto sm:h-full sm:min-h-[22rem]">
          {slides.map((slide, slideIndex) => {
            const active = slideIndex === index;
            return (
              <Link
                key={slide.id}
                href={`/products/${slide.id}`}
                tabIndex={active ? -1 : undefined}
                aria-hidden={!active}
                className={`absolute inset-0 block transition-opacity ease-out ${
                  active
                    ? "z-10 opacity-100"
                    : "pointer-events-none z-0 opacity-0"
                }`}
                style={{ transitionDuration: `${FADE_MS}ms` }}
              >
                {slide.image ? (
                  <span className="absolute inset-3 sm:inset-4">
                    <Image
                      src={slide.image}
                      alt={slide.title ? `Photo of ${slide.title}` : "Featured work"}
                      fill
                      sizes="(min-width: 640px) 45vw, 100vw"
                      className="object-contain object-center"
                      priority={slideIndex === 0}
                    />
                  </span>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm italic text-ink-faint">
                    {slide.category ?? "Featured work"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Copy is stacked in one grid cell so height follows the tallest slide
            and nothing clips. Dots live in a separate in-flow row under the CTA. */}
        <div className="flex flex-col px-6 py-8 sm:px-10 sm:py-12">
          <div className="grid flex-1">
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index;
              return (
                <div
                  key={slide.id}
                  aria-hidden={!active}
                  className={`col-start-1 row-start-1 flex flex-col justify-center transition-opacity ease-out ${
                    active
                      ? "z-10 opacity-100"
                      : "pointer-events-none z-0 opacity-0"
                  }`}
                  style={{ transitionDuration: `${FADE_MS}ms` }}
                >
                  {active && (
                    <ImpressionTracker
                      postId={slide.id}
                      surface="home_banner"
                      isBoosted={Boolean(slide.boostLabel)}
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {slide.boostLabel ? (
                      <span
                        title="This slot was bought with earned credits. Organic ranking is unaffected."
                        className="inline-flex items-center rounded-full bg-ochre px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-cream"
                      >
                        {slide.boostLabel}
                      </span>
                    ) : (
                      <span className="eyebrow text-sage">From the community</span>
                    )}
                    {slide.category && (
                      <span className="eyebrow text-ink-faint">{slide.category}</span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    <Link
                      href={`/products/${slide.id}`}
                      tabIndex={active ? 0 : -1}
                      className="transition duration-200 hover:text-terracotta"
                    >
                      {slide.title}
                    </Link>
                  </h3>

                  {slide.creatorName && (
                    <Link
                      href={`/profile/${encodeURIComponent(slide.creatorName)}`}
                      tabIndex={active ? 0 : -1}
                      className="mt-1.5 w-fit text-sm italic text-ink-muted underline-offset-4 hover:text-terracotta hover:underline"
                    >
                      by {slide.creatorName}
                    </Link>
                  )}

                  {slide.description && (
                    <p className="mt-4 line-clamp-3 text-base leading-relaxed text-ink-muted">
                      {slide.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href={`/products/${current.id}`} className="btn-primary">
              View this piece
            </Link>

            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                {slides.map((item, slideIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(slideIndex)}
                    aria-label={`Show ${item.title}`}
                    aria-current={slideIndex === index}
                    className={`h-2.5 w-2.5 rounded-full transition duration-200 ${
                      slideIndex === index
                        ? "w-6 bg-terracotta"
                        : "bg-clay hover:bg-terracotta/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
