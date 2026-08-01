"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/notifications";

/**
 * Viewing the page is what marks notifications read. Runs once per mount, then
 * refreshes so the navbar badge clears without a manual reload.
 */
export default function MarkNotificationsRead({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (unreadCount === 0 || handled.current) return;
    handled.current = true;

    void markNotificationsRead().then((result) => {
      if (result.ok) router.refresh();
    });
  }, [unreadCount, router]);

  return null;
}
