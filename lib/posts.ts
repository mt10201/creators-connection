import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCategory } from "./categories";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 8;

/** Hard cap for short product clips. A small epsilon covers encoder rounding. */
export const MAX_VIDEO_SECONDS = 3;
export const MAX_VIDEO_DURATION_TOLERANCE = 0.15;
export const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export type NewPost = {
  title: string;
  description: string;
  productUrl: string;
  category: ProductCategory;
  images: File[];
  /** Optional ≤3s clip. */
  video?: File | null;
};

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; message: string };

export function validateImage(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be smaller than 5 MB.";
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  const type = file.type.toLowerCase();
  const allowed =
    ALLOWED_VIDEO_TYPES.has(type) ||
    type === "video/x-m4v" ||
    // Some browsers leave type blank for .mov/.mp4 — fall back to extension.
    (!type && /\.(mp4|webm|mov|m4v)$/i.test(file.name));

  if (!allowed) {
    return "Please choose an MP4, WebM, or MOV video.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "Video must be smaller than 12 MB.";
  }
  return null;
}

/** Reads duration via a temporary <video> element. Browser-only. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read video duration."));
        return;
      }
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read that video file."));
    };

    video.src = url;
  });
}

export async function validateVideo(file: File): Promise<string | null> {
  const fileError = validateVideoFile(file);
  if (fileError) return fileError;

  try {
    const duration = await readVideoDuration(file);
    if (duration > MAX_VIDEO_SECONDS + MAX_VIDEO_DURATION_TOLERANCE) {
      return `Video must be ${MAX_VIDEO_SECONDS} seconds or shorter (yours is ${duration.toFixed(1)}s).`;
    }
  } catch {
    return "Could not read that video. Try exporting as MP4.";
  }

  return null;
}

export function validateProductUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Product link must start with http:// or https://";
    }
    return null;
  } catch {
    return "Please enter a valid product link, e.g. https://example.com/item";
  }
}

/**
 * Recovers the storage path from a public URL. Legacy rows were written before
 * `media_paths` existed, so their files can only be located this way.
 */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`;
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

/**
 * Uploads every image (and optional video) then creates the post row. The
 * `posts` insert trigger awards the +5 credits.
 */
export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  post: NewPost
): Promise<CreatePostResult> {
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const paths: string[] = [];
  let videoPath: string | null = null;

  async function cleanupUploads() {
    const all = [...paths, ...(videoPath ? [videoPath] : [])];
    if (all.length > 0) await storage.remove(all);
  }

  for (const image of post.images) {
    // Storage policies require the first path segment to be the uploader's id.
    const path = `${userId}/${crypto.randomUUID()}.${fileExtension(image)}`;

    const { error: uploadError } = await storage.upload(path, image, {
      cacheControl: "3600",
      upsert: false,
      contentType: image.type,
    });

    if (uploadError) {
      await cleanupUploads();
      return {
        ok: false,
        message: `Image upload failed: ${uploadError.message}`,
      };
    }

    paths.push(path);
  }

  if (post.video) {
    videoPath = `${userId}/${crypto.randomUUID()}.${fileExtension(post.video)}`;
    const { error: videoError } = await storage.upload(videoPath, post.video, {
      // UUID paths are immutable; long cache cuts repeat-view bandwidth.
      cacheControl: "31536000",
      upsert: false,
      contentType: post.video.type || "video/mp4",
    });

    if (videoError) {
      await cleanupUploads();
      return {
        ok: false,
        message: `Video upload failed: ${videoError.message}`,
      };
    }
  }

  const mediaUrls = paths.map(
    (path) => storage.getPublicUrl(path).data.publicUrl
  );
  const videoUrl = videoPath
    ? storage.getPublicUrl(videoPath).data.publicUrl
    : null;

  const { data, error: insertError } = await supabase
    .from("posts")
    .insert({
      creator_id: userId,
      product_title: post.title.trim(),
      description: post.description.trim(),
      product_link: post.productUrl.trim(),
      category: post.category,
      media_urls: mediaUrls,
      media_paths: paths,
      video_url: videoUrl,
      video_path: videoPath,
    })
    .select("id")
    .single();

  if (insertError || !data) {
    await cleanupUploads();
    return {
      ok: false,
      message: insertError?.message ?? "Could not save your post.",
    };
  }

  return { ok: true, postId: data.id as string };
}

export type ExistingMedia = {
  url: string;
  path: string;
};

export type UpdatePostInput = {
  title: string;
  description: string;
  productUrl: string;
  category: ProductCategory;
  /** Existing images kept (order preserved). */
  keepImages: ExistingMedia[];
  /** Newly added image files, appended after keepImages. */
  newImages: File[];
  /** Existing video to keep, if any. Ignored when newVideo is set or removeVideo. */
  keepVideo: ExistingMedia | null;
  newVideo?: File | null;
  removeVideo?: boolean;
};

/**
 * Updates an owned post: uploads new media, removes discarded files, and
 * patches the row. RLS still enforces creator_id = auth.uid().
 */
export async function updatePost(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  original: {
    mediaPaths: string[];
    videoPath: string | null;
  },
  input: UpdatePostInput
): Promise<CreatePostResult> {
  const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
  const newlyUploaded: string[] = [];

  async function cleanupNewUploads() {
    if (newlyUploaded.length > 0) await storage.remove(newlyUploaded);
  }

  const finalPaths: string[] = input.keepImages.map((image) => image.path);
  const finalUrls: string[] = input.keepImages.map((image) => image.url);

  for (const image of input.newImages) {
    const path = `${userId}/${crypto.randomUUID()}.${fileExtension(image)}`;
    const { error: uploadError } = await storage.upload(path, image, {
      cacheControl: "3600",
      upsert: false,
      contentType: image.type,
    });

    if (uploadError) {
      await cleanupNewUploads();
      return {
        ok: false,
        message: `Image upload failed: ${uploadError.message}`,
      };
    }

    newlyUploaded.push(path);
    finalPaths.push(path);
    finalUrls.push(storage.getPublicUrl(path).data.publicUrl);
  }

  if (finalPaths.length === 0) {
    await cleanupNewUploads();
    return { ok: false, message: "Please keep at least one image." };
  }

  let videoPath: string | null = null;
  let videoUrl: string | null = null;

  if (input.newVideo) {
    videoPath = `${userId}/${crypto.randomUUID()}.${fileExtension(input.newVideo)}`;
    const { error: videoError } = await storage.upload(
      videoPath,
      input.newVideo,
      {
        // UUID paths are immutable; long cache cuts repeat-view bandwidth.
        cacheControl: "31536000",
        upsert: false,
        contentType: input.newVideo.type || "video/mp4",
      }
    );

    if (videoError) {
      await cleanupNewUploads();
      return {
        ok: false,
        message: `Video upload failed: ${videoError.message}`,
      };
    }

    newlyUploaded.push(videoPath);
    videoUrl = storage.getPublicUrl(videoPath).data.publicUrl;
  } else if (!input.removeVideo && input.keepVideo?.url) {
    videoPath = input.keepVideo.path || null;
    videoUrl = input.keepVideo.url;
  }

  const { error: updateError } = await supabase
    .from("posts")
    .update({
      product_title: input.title.trim(),
      description: input.description.trim(),
      product_link: input.productUrl.trim(),
      category: input.category,
      media_urls: finalUrls,
      media_paths: finalPaths,
      video_url: videoUrl,
      video_path: videoPath,
    })
    .eq("id", postId)
    .eq("creator_id", userId);

  if (updateError) {
    await cleanupNewUploads();
    return {
      ok: false,
      message: updateError.message ?? "Could not save your changes.",
    };
  }

  // Best-effort cleanup of discarded media (don't fail the edit if remove fails).
  const keptPathSet = new Set([...finalPaths, ...(videoPath ? [videoPath] : [])]);
  const toRemove = [
    ...original.mediaPaths.filter((path) => path && !keptPathSet.has(path)),
    ...(original.videoPath && !keptPathSet.has(original.videoPath)
      ? [original.videoPath]
      : []),
  ];

  if (toRemove.length > 0) {
    await storage.remove(toRemove);
  }

  return { ok: true, postId };
}
