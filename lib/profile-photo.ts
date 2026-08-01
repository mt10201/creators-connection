import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

export function validateProfilePhoto(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return "Photo must be smaller than 2 MB.";
  }
  return null;
}

export function profilePhotoPathFromPublicUrl(url: string): string | null {
  const marker = `/${PROFILE_PHOTOS_BUCKET}/`;
  const start = url.indexOf(marker);
  if (start === -1) return null;

  const path = url.slice(start + marker.length).split("?")[0];
  if (!path) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}

export async function uploadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  previousUrl: string | null
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const validationError = validateProfilePhoto(file);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const storage = supabase.storage.from(PROFILE_PHOTOS_BUCKET);
  const path = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (uploadError) {
    const hint =
      /bucket|not found|row-level security|policy/i.test(uploadError.message)
        ? " Run supabase/profile_photos.sql in the Supabase SQL Editor if you haven’t yet."
        : "";
    return {
      ok: false,
      message: `Upload failed: ${uploadError.message}.${hint}`,
    };
  }

  const {
    data: { publicUrl },
  } = storage.getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("users")
    .update({ profile_photo: publicUrl })
    .eq("id", userId);

  if (updateError) {
    await storage.remove([path]);
    return { ok: false, message: updateError.message };
  }

  // Best effort: a leftover file is preferable to losing the new photo.
  if (previousUrl) {
    const oldPath = profilePhotoPathFromPublicUrl(previousUrl);
    if (oldPath) {
      const { error: removeError } = await storage.remove([oldPath]);
      if (removeError) {
        console.error("Old profile photo cleanup failed:", removeError.message);
      }
    }
  }

  return { ok: true, url: publicUrl };
}

export async function removeProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
  previousUrl: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: updateError } = await supabase
    .from("users")
    .update({ profile_photo: null })
    .eq("id", userId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  if (previousUrl) {
    const path = profilePhotoPathFromPublicUrl(previousUrl);
    if (path) {
      const { error: removeError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([path]);
      if (removeError) {
        console.error("Profile photo file cleanup failed:", removeError.message);
      }
    }
  }

  return { ok: true };
}
