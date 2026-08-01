"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MarkReadResult = { ok: boolean };

/**
 * Clears the unread flag for everything the viewer currently has. Called once
 * the notifications page is on screen, so opening the page is what marks them
 * read. A column grant limits this update to the `read` column.
 */
export async function markNotificationsRead(): Promise<MarkReadResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("Failed to mark notifications read:", error.message);
    return { ok: false };
  }

  // The bell lives in the root layout, so every page shows a stale count.
  revalidatePath("/", "layout");

  return { ok: true };
}
