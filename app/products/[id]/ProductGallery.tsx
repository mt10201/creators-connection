"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  images: string[];
  title: string;
  videoUrl?: string | null;
};

export default function ProductGallery({ images, title, videoUrl }: Props) {
  // Video is index 0 when present; images follow.
  const hasVideo = Boolean(videoUrl);
  const [activeIndex, setActiveIndex] = useState(0);

  const showingVideo = hasVideo && activeIndex === 0;
  const imageIndex = hasVideo ? activeIndex - 1 : activeIndex;
  const activeImage = images[imageIndex];
  const total = images.length + (hasVideo ? 1 : 0);

  if (total === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-card border border-sand bg-parchment">
        <span className="eyebrow text-ink-faint">No media for this product</span>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-card border border-sand bg-parchment p-3 shadow-soft sm:p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-cream">
          {showingVideo && videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              className="absolute inset-0 h-full w-full animate-fade-in object-contain"
              aria-label={`${title} — short video`}
            />
          ) : activeImage ? (
            <Image
              key={activeImage}
              src={activeImage}
              alt={`${title} — image ${imageIndex + 1} of ${images.length}`}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="animate-fade-in object-contain"
            />
          ) : null}

          {showingVideo && (
            <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta-deep backdrop-blur-sm">
              Video
            </span>
          )}
        </div>
      </div>

      {total > 1 && (
        <>
          <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {hasVideo && videoUrl && (
              <li>
                <button
                  type="button"
                  onClick={() => setActiveIndex(0)}
                  aria-current={activeIndex === 0}
                  aria-label="Show product video"
                  className={`relative block aspect-square w-full overflow-hidden rounded-xl border transition duration-200 ease-out ${
                    activeIndex === 0
                      ? "border-terracotta ring-2 ring-terracotta-soft"
                      : "border-sand opacity-70 hover:-translate-y-0.5 hover:opacity-100 hover:shadow-soft"
                  }`}
                >
                  <video
                    src={videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/20">
                    <span className="rounded-full bg-cream/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta-deep">
                      Play
                    </span>
                  </span>
                </button>
              </li>
            )}

            {images.map((url, index) => {
              const thumbIndex = hasVideo ? index + 1 : index;
              return (
                <li key={url}>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(thumbIndex)}
                    aria-current={activeIndex === thumbIndex}
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl border transition duration-200 ease-out ${
                      activeIndex === thumbIndex
                        ? "border-terracotta ring-2 ring-terracotta-soft"
                        : "border-sand opacity-70 hover:-translate-y-0.5 hover:opacity-100 hover:shadow-soft"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`Show image ${index + 1} of ${images.length}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <p aria-live="polite" className="form-hint text-center tabular-nums">
            {activeIndex + 1} of {total}
          </p>
        </>
      )}
    </div>
  );
}
