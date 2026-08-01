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

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, profile_photo")
    .eq("id", user.id)
    .maybeSingle();

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
