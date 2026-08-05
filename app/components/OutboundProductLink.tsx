"use client";

import type { ReactNode } from "react";
import { getViewerKey, sendTrackingEvent } from "@/lib/tracking";

type Props = {
  postId: string;
  href: string;
  className?: string;
  isBoosted?: boolean;
  children: ReactNode;
};

/**
 * Outbound shop link. The click is beaconed before the new tab opens so the
 * request survives even when the browser backgrounds this page.
 */
export default function OutboundProductLink({
  postId,
  href,
  className,
  isBoosted = false,
  children,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() =>
        sendTrackingEvent({
          type: "link_click",
          postId,
          isBoosted,
          viewerKey: getViewerKey(),
        })
      }
    >
      {children}
    </a>
  );
}
