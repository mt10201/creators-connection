"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  href: string;
  title: string;
  coverImage: string | null;
  videoUrl?: string | null;
  category?: string | null;
  extraImages: number;
  priority?: boolean;
};

export default function ProductCardMedia({
  href,
  title,
  coverImage,
  videoUrl,
  category,
  extraImages,
  priority = false,
}: Props) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wantPlayRef = useRef(false);
  const hasVideo = Boolean(videoUrl);
  // Defer attaching src until near the viewport (or first hover/focus).
  const [loadVideo, setLoadVideo] = useState(false);

  useEffect(() => {
    if (!hasVideo) return;
    const node = rootRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setLoadVideo(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasVideo]);

  useEffect(() => {
    if (!loadVideo || !wantPlayRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      // Autoplay can fail on some browsers; the still cover remains.
    });
  }, [loadVideo]);

  function playPreview() {
    wantPlayRef.current = true;
    setLoadVideo(true);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      // Autoplay can fail on some browsers; the still cover remains.
    });
  }

  function stopPreview() {
    wantPlayRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  return (
    <Link
      ref={rootRef}
      href={href}
      tabIndex={-1}
      aria-hidden
      onMouseEnter={hasVideo ? playPreview : undefined}
      onMouseLeave={hasVideo ? stopPreview : undefined}
      onFocus={hasVideo ? playPreview : undefined}
      onBlur={hasVideo ? stopPreview : undefined}
      className="relative block aspect-[4/5] overflow-hidden rounded-[1rem] bg-parchment"
    >
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className={`object-cover transition duration-700 ease-out group-hover:scale-[1.045] ${
            hasVideo ? "group-hover:opacity-0" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="eyebrow text-ink-faint">{category ?? "Product"}</span>
        </div>
      )}

      {hasVideo && videoUrl && loadVideo && (
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-terracotta-deep/25 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
      />

      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
        {hasVideo && (
          <span className="rounded-full bg-cream/90 px-2 py-0.5 text-[11px] font-medium text-terracotta-deep backdrop-blur-sm transition duration-300 group-hover:bg-cream">
            Video
          </span>
        )}
        {extraImages > 0 && (
          <span className="rounded-full bg-cream/90 px-2 py-0.5 text-[11px] font-medium text-ink-muted backdrop-blur-sm transition duration-300 group-hover:bg-cream">
            +{extraImages}
          </span>
        )}
      </div>
    </Link>
  );
}
