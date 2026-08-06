"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth-errors";
import { validateNewPassword } from "@/lib/password";
import {
  PRODUCT_IMAGES_BUCKET,
  storagePathFromPublicUrl,
} from "@/lib/posts";
import {
  PROFILE_PHOTOS_BUCKET,
  profilePhotoPathFromPublicUrl,
} from "@/lib/profile-photo";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type DeleteAccountResult =
  | { ok: true; redirectTo: "/" }
  | { ok: false; error: string };

type OwnedPost = {
  id: string;
  media_urls: string[] | null;
  media_paths: string[] | null;
  video_url: string | null;
  video_path: string | null;
};

function collectPostStoragePaths(posts: OwnedPost[]): string[] {
  const paths = new Set<string>();

  for (const post of posts) {
    for (const path of post.media_paths ?? []) {
      if (path) paths.add(path);
    }
    if (post.video_path) paths.add(post.video_path);

    for (const url of [...(post.media_urls ?? []), post.video_url]) {
      if (!url) continue;
      const path = storagePathFromPublicUrl(url);
      if (path) paths.add(path);
    }
  }

  return [...paths];
}

export async function updateUsername(
  rawUsername: string
): Promise<SettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const username = normalizeUsername(rawUsername);
  const validationError = validateUsername(username);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const { data: current } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const previous = current?.username?.trim() ?? "";
  if (previous === username) {
    return { ok: true, message: "Username is already up to date." };
  }

  const { error } = await supabase
    .from("users")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That username is already taken." };
    }
    return { ok: false, error: error.message };
  }

  // Keep the signup metadata copy in sync so navbar fallbacks stay accurate.
  const { error: metaError } = await supabase.auth.updateUser({
    data: { username },
  });
  if (metaError) {
    console.error("Failed to sync username metadata:", metaError.message);
  }

  if (previous) {
    revalidatePath(`/profile/${encodeURIComponent(previous)}`);
  }
  revalidatePath(`/profile/${encodeURIComponent(username)}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { ok: true, message: "Username updated." };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<SettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const email = user.email?.trim();
  if (!email) {
    return {
      ok: false,
      error:
        "Your account has no email on file, so the password can’t be changed here.",
    };
  }

  if (!user.email_confirmed_at) {
    return {
      ok: false,
      error:
        "Confirm your email before changing your password. Check your inbox for the verification link.",
    };
  }

  // Never allow a password change from new-password fields alone.
  if (!currentPassword.trim()) {
    return { ok: false, error: "Enter your current password." };
  }

  const validationError = validateNewPassword(newPassword, confirmPassword);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (currentPassword === newPassword) {
    return {
      ok: false,
      error: "Choose a new password that is different from your current one.",
    };
  }

  // Prove possession of the current password before updating.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  // Supabase-native secure update: also send current_password so Auth can
  // enforce it when “Require current password” is enabled on the project.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  });

  if (updateError) {
    const message = updateError.message.toLowerCase();
    if (
      message.includes("current_password") ||
      message.includes("current password")
    ) {
      return { ok: false, error: "Current password is incorrect." };
    }
    return { ok: false, error: authErrorMessage(updateError) };
  }

  return { ok: true, message: "Password updated." };
}

/**
 * Permanently deletes the signed-in account. User id always comes from the
 * session — never from the client payload.
 */
export async function deleteAccount(
  confirmation: string
): Promise<DeleteAccountResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("username, profile_photo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const username = profile?.username?.trim() ?? "";
  const typed = confirmation.trim();

  if (username) {
    if (typed.toLowerCase() !== username.toLowerCase()) {
      return {
        ok: false,
        error: "Type your username exactly to confirm account deletion.",
      };
    }
  } else if (typed !== "DELETE") {
    return {
      ok: false,
      error: 'Type DELETE in all caps to confirm account deletion.',
    };
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, media_urls, media_paths, video_url, video_path")
    .eq("creator_id", user.id);

  if (postsError) {
    return { ok: false, error: postsError.message };
  }

  const ownedPosts = (posts ?? []) as OwnedPost[];
  const mediaPaths = collectPostStoragePaths(ownedPosts);
  const profilePhotoPath = profile?.profile_photo
    ? profilePhotoPathFromPublicUrl(profile.profile_photo)
    : null;

  // Delete posts first so clawback triggers and storage cleanup can run while
  // the session is still valid. Related likes/saves/notifications cascade.
  if (ownedPosts.length > 0) {
    const { error: deletePostsError } = await supabase
      .from("posts")
      .delete()
      .eq("creator_id", user.id);

    if (deletePostsError) {
      return { ok: false, error: deletePostsError.message };
    }
  }

  if (mediaPaths.length > 0) {
    const { error: mediaError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove(mediaPaths);
    if (mediaError) {
      console.error("Account media cleanup failed:", mediaError.message);
    }
  }

  if (profilePhotoPath) {
    const { error: photoError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .remove([profilePhotoPath]);
    if (photoError) {
      console.error("Profile photo cleanup failed:", photoError.message);
    }
  }

  try {
    const admin = createAdminClient();
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id
    );
    if (deleteUserError) {
      return {
        ok: false,
        error:
          deleteUserError.message ||
          "Could not delete your account. Please try again.",
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete your account.";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        ok: false,
        error:
          "Account deletion isn’t configured yet. Add SUPABASE_SERVICE_ROLE_KEY on the server.",
      };
    }
    return { ok: false, error: message };
  }

  await supabase.auth.signOut();

  if (username) {
    revalidatePath(`/profile/${encodeURIComponent(username)}`);
  }
  revalidatePath("/explore");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { ok: true, redirectTo: "/" };
}
