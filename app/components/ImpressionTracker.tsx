"use client";

import { useEffect, useRef } from "react";
import {
  getViewerKey,
  IMPRESSION_DWELL_MS,
  IMPRESSION_VISIBLE_RATIO,
  sendTrackingEvent,
  type TrackingSurface,
} from "@/lib/tracking";

type Props = {
  postId: string;
  surface: TrackingSurface;
  isBoosted?: boolean;
};

/** Already counted this page session; the server dedupes per hour anyway. */
const seen = new Set<string>();

/**
 * A card taller than the viewport can never reach a 50% ratio, so measure the
 * visible slice against whichever is smaller: the card or the viewport.
 */
function visibleFraction(entry: IntersectionObserverEntry): number {
  const box = entry.boundingClientRect;
  const cardArea = box.width * box.height;
  if (cardArea <= 0) return 0;

  const visibleArea =
    entry.intersectionRect.width * entry.intersectionRect.height;
  const root = entry.rootBounds;
  const rootArea = root ? root.width * root.height : 0;
  const reference = rootArea > 0 ? Math.min(cardArea, rootArea) : cardArea;

  return Math.max(entry.intersectionRatio, visibleArea / reference);
}

/**
 * Invisible marker that watches the card it sits in and reports one impression
 * once the card has been at least half visible for a full second.
 */
export default function ImpressionTracker({
  postId,
  surface,
  isBoosted = false,
}: Props) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!postId) return;

    const marker = markerRef.current;
    // The card itself is the visibility target, not the zero-size marker.
    const target = marker?.closest("article") ?? marker?.parentElement;
    if (!target) return;

    const key = `${postId}:${surface}`;
    if (seen.has(key)) return;

    if (typeof IntersectionObserver === "undefined") return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;

    const clearDwell = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;

        if (visibleFraction(entry) >= IMPRESSION_VISIBLE_RATIO) {
          if (dwellTimer) return;

          dwellTimer = setTimeout(() => {
            dwellTimer = null;
            if (seen.has(key)) return;

            seen.add(key);
            observer.disconnect();
            sendTrackingEvent({
              type: "impression",
              postId,
              surface,
              isBoosted,
              viewerKey: getViewerKey(),
            });
          }, IMPRESSION_DWELL_MS);
        } else {
          clearDwell();
        }
      },
      { threshold: [0, 0.25, IMPRESSION_VISIBLE_RATIO, 0.75, 1] }
    );

    observer.observe(target);

    return () => {
      clearDwell();
      observer.disconnect();
    };
  }, [postId, surface, isBoosted]);

  return <span ref={markerRef} hidden aria-hidden />;
}
