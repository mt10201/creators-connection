import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "like" | "save";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  postId: string | null;
  postTitle: string | null;
};

/** Newest first; the page shows a recent window rather than the whole history. */
export const NOTIFICATIONS_LIMIT = 30;

export async function countUnreadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      // The navbar renders on every page, so a missing table must not break it.
      console.error("Failed to count notifications:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error("Failed to count notifications:", error);
    return 0;
  }
}

export async function loadNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationItem[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, type, read, created_at, actor_id, post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error) {
    console.error("Failed to load notifications:", error.message);
    return [];
  }

  if ((rows ?? []).length === 0) return [];

  const actorIds = [
    ...new Set((rows ?? []).map((row) => row.actor_id as string)),
  ];
  const postIds = [
    ...new Set(
      (rows ?? []).map((row) => row.post_id as string | null).filter(Boolean)
    ),
  ] as string[];

  const [{ data: actors }, { data: posts }] = await Promise.all([
    supabase.from("public_profiles").select("id, username").in("id", actorIds),
    postIds.length > 0
      ? supabase.from("posts").select("id, product_title").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const actorNames = new Map<string, string>();
  for (const actor of actors ?? []) {
    const name = actor.username?.trim();
    if (name) actorNames.set(actor.id, name);
  }

  const postTitles = new Map<string, string>();
  for (const post of posts ?? []) {
    postTitles.set(post.id, post.product_title ?? "your post");
  }

  return (rows ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as NotificationType,
    read: row.read as boolean,
    createdAt: row.created_at as string,
    actorName: actorNames.get(row.actor_id as string) ?? null,
    postId: (row.post_id as string | null) ?? null,
    postTitle: row.post_id
      ? (postTitles.get(row.post_id as string) ?? null)
      : null,
  }));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short, warm relative time — "just now", "3h ago", "2d ago". */
export function formatRelativeTime(iso: string, now: number = Date.now()) {
  const elapsed = now - new Date(iso).getTime();

  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
