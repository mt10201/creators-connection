"use client";

import { Children, useRef, type ReactElement, type ReactNode } from "react";

/**
 * Renders its children in the order they arrived on first mount, and keeps that
 * order for as long as it stays mounted — even if the server sends the same
 * cards back in a different sequence.
 *
 * Explore is ranked per request, so any in-place re-render (a Server Action
 * that revalidates, a router.refresh() elsewhere on the page) would otherwise
 * reshuffle the grid mid-browse. Liking a post changes its engagement score,
 * which is exactly the kind of nudge that must not move cards under the cursor.
 *
 * Give it a `key` that identifies the view (category + search). Changing that
 * key remounts the component, which is what lets filters, search and a fresh
 * navigation adopt the new ranking.
 *
 * Children must be keyed by post id, which they already are.
 */
export default function StableOrder({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children) as ReactElement[];
  const lockedOrder = useRef<string[] | null>(null);

  if (lockedOrder.current === null) {
    lockedOrder.current = items.map((item) => String(item.key));
  }

  const byKey = new Map(items.map((item) => [String(item.key), item]));
  const locked = new Set(lockedOrder.current);

  const ordered: ReactElement[] = [];
  for (const key of lockedOrder.current) {
    const item = byKey.get(key);
    // Skip anything that has since been deleted rather than leaving a hole.
    if (item) ordered.push(item);
  }
  // Posts that appeared after this view was rendered go to the end, so nothing
  // above them shifts position.
  for (const item of items) {
    if (!locked.has(String(item.key))) ordered.push(item);
  }

  return <div className={className}>{ordered}</div>;
}
