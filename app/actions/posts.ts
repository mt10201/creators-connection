"use server";

import { revalidatePath } from "next/cache";
import { trackEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";
import {
  PRODUCT_IMAGES_BUCKET,
  storagePathFromPublicUrl,
} from "@/lib/posts";

export type DeletePostResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

type DeletablePost = {
  creator_id: string | null;
  media_urls: string[] | null;
  media_paths: string[] | null;
  video_url: string | null;
  video_path: string | null;
};

function storagePaths(post: DeletablePost): string[] {
  const paths = new Set<string>();

  for (const path of post.media_paths ?? []) {
    if (path) paths.add(path);
  }
  if (post.video_path) paths.add(post.video_path);

  // Rows written before media_paths existed only carry public URLs.
  for (const url of [...(post.media_urls ?? []), post.video_url]) {
    if (!url) continue;
    const path = storagePathFromPublicUrl(url);
    if (path) paths.add(path);
  }

  return [...paths];
}

export async function deletePost(postId: string): Promise<DeletePostResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("creator_id, media_urls, media_paths, video_url, video_path")
    .eq("id", postId)
    .maybeSingle<DeletablePost>();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }
  if (!post) {
    return { ok: false, error: "That post no longer exists." };
  }
  if (post.creator_id !== user.id) {
    return { ok: false, error: "You can only delete your own posts." };
  }

  // Likes and saves are removed by the cascading foreign keys, which is the only
  // way to clear other people's rows: RLS limits each user to their own. The
  // delete trigger claws back post/engagement credits tied to this post, so
  // the clawback holds even if this action is bypassed.
  const { count, error: deleteError } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", postId)
    .eq("creator_id", user.id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }
  if ((count ?? 0) === 0) {
    return { ok: false, error: "Could not delete that post. Please try again." };
  }

  await trackEvent(supabase, {
    event_name: "post_delete",
    user_id: user.id,
    post_id: postId,
  });

  // Best effort: an orphaned file is preferable to a half-deleted post.
  const paths = storagePaths(post);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(paths);

    if (storageError) {
      console.error("Post media cleanup failed:", storageError.message);
    }
  }

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username?.trim();
  // Usernames allow spaces, so the cache key is the encoded path the links use.
  const profilePath = username
    ? `/profile/${encodeURIComponent(username)}`
    : null;

  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath(`/products/${postId}`);
  if (profilePath) revalidatePath(profilePath);

  return { ok: true, redirectTo: profilePath ?? "/explore" };
}
