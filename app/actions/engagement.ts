"use server";

import { revalidatePath } from "next/cache";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";

export type ToggleResult =
  | { ok: true; active: boolean; count: number }
  | { ok: false; error: string };

async function toggle(
  table: "likes" | "saves",
  countColumn: "like_count" | "save_count",
  eventName: AnalyticsEventName,
  postId: string
): Promise<ToggleResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  // Delete first and use the returned rows to decide what happened. Detecting
  // the existing row with a separate SELECT is unreliable, because the delete
  // policy and the select policy do not have to agree.
  const { count: removedCount, error: deleteError } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("post_id", postId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const wasRemoved = (removedCount ?? 0) > 0;

  if (!wasRemoved) {
    const { error } = await supabase
      .from(table)
      .insert({ user_id: user.id, post_id: postId });
    if (error) return { ok: false, error: error.message };

    await trackEvent(supabase, {
      event_name: eventName,
      user_id: user.id,
      post_id: postId,
    });
  }

  // Counts are maintained by database triggers, so read the value back.
  const { data: post } = await supabase
    .from("posts")
    .select(countColumn)
    .eq("id", postId)
    .maybeSingle();

  revalidatePath("/explore");
  revalidatePath(`/products/${postId}`);
  // The dashboard hosts the liked and saved collections.
  revalidatePath("/dashboard");

  const count =
    (post as Record<string, number | null> | null)?.[countColumn] ?? 0;

  return { ok: true, active: !wasRemoved, count };
}

export async function toggleLike(postId: string) {
  return toggle("likes", "like_count", "post_like", postId);
}

export async function toggleSave(postId: string) {
  return toggle("saves", "save_count", "post_save", postId);
}
