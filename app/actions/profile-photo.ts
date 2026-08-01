"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  removeProfilePhoto,
  uploadProfilePhoto,
} from "@/lib/profile-photo";

export type ProfilePhotoResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

function revalidateAvatarSurfaces(username: string | null) {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  if (username) {
    revalidatePath(`/profile/${encodeURIComponent(username)}`);
  }
}

export async function updateProfilePhoto(
  formData: FormData
): Promise<ProfilePhotoResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const entry = formData.get("photo");
  // Server Actions may surface the upload as File or Blob depending on runtime.
  let file: File | null = null;
  if (entry && typeof entry === "object" && "arrayBuffer" in entry) {
    const blob = entry as Blob;
    if (blob.size > 0) {
      file =
        typeof File !== "undefined" && entry instanceof File
          ? entry
          : new File([blob], "profile.jpg", {
              type: blob.type || "image/jpeg",
            });
    }
  }

  if (!file) {
    return { ok: false, error: "Choose a photo to upload." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("username, profile_photo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      error:
        "Profile photos aren’t set up yet. Run supabase/profile_photos.sql in the Supabase SQL Editor.",
    };
  }

  const result = await uploadProfilePhoto(
    supabase,
    user.id,
    file,
    profile?.profile_photo ?? null
  );

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidateAvatarSurfaces(profile?.username?.trim() ?? null);
  return { ok: true, url: result.url };
}

export async function clearProfilePhoto(): Promise<ProfilePhotoResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in to do that." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, profile_photo")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.profile_photo) {
    return { ok: true, url: null };
  }

  const result = await removeProfilePhoto(
    supabase,
    user.id,
    profile.profile_photo
  );

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidateAvatarSurfaces(profile.username?.trim() ?? null);
  return { ok: true, url: null };
}
