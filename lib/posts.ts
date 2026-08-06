import type { SupabaseClient } from "@supabase/supabase-js";
import { trackEvent } from "@/lib/analytics";
import type { ProductCategory } from "./categories";
import { sanitizeTags } from "./tags";

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
  /** Optional short search tags (max 8). */
  tags?: string[];
};

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

const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "twclid",
  "li_fat_id",
  "mc_eid",
  "mc_cid",
  "_ga",
  "_gl",
  "igshid",
  "ref",
  "referrer",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
]);

/** Normalize product URLs the same way the DB does before credit claims. */
export function normalizeProductUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();

    if (
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    ) {
      parsed.port = "";
    }

    const kept = new URLSearchParams();
    parsed.searchParams.forEach((paramValue, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_QUERY_PARAMS.has(lower)) {
        return;
      }
      kept.append(key, paramValue);
    });
    parsed.search = kept.toString();

    let path = parsed.pathname;
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    if (path === "/") {
      path = "";
    }
    parsed.pathname = path;

    // URL serializes empty path as "" only when we rebuild manually.
    const query = parsed.searchParams.toString();
    return (
      `${parsed.protocol}//${parsed.host}${path}` +
      (query ? `?${query}` : "")
    );
  } catch {
    return null;
  }
}

export function validateProductUrl(value: string): string | null {
  if (!normalizeProductUrl(value)) {
    return "Please enter a valid product link, e.g. https://example.com/item";
  }
  return null;
}

const DAILY_POST_LIMIT_MESSAGE =
  "You’ve reached today’s limit — you can post up to 10 products per day. Please try again tomorrow.";

function mapPostInsertError(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
} | null): string {
  const haystack = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (haystack.includes("CREDIT_PRODUCT_URL_REQUIRED")) {
    return "A valid product link is required.";
  }
  if (
    haystack.includes("CREDIT_RATE_LIMIT_DAILY") ||
    /10 products per day/i.test(haystack)
  ) {
    return DAILY_POST_LIMIT_MESSAGE;
  }
  if (haystack.includes("CREDIT_CREATOR_MISMATCH")) {
    return "Please log in again and try posting.";
  }
  return error?.message?.trim() || "Could not save your post.";
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

export type CreatePostSuccess = {
  ok: true;
  postId: string;
  /** True when this post claimed a first-time URL credit (+1). */
  awardedPostCredit: boolean;
};

export type CreatePostResult =
  | CreatePostSuccess
  | { ok: false; message: string };

/**
 * Uploads every image (and optional video) then creates the post row.
 * Post credits (+1, first normalized URL only) are awarded by a DB trigger.
 */
export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  post: NewPost
): Promise<CreatePostResult> {
  const normalizedUrl = normalizeProductUrl(post.productUrl);
  if (!normalizedUrl) {
    return {
      ok: false,
      message: "A valid product link is required.",
    };
  }

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

  const tags = sanitizeTags(post.tags ?? []);

  const { data, error: insertError } = await supabase
    .from("posts")
    .insert({
      creator_id: userId,
      product_title: post.title.trim(),
      description: post.description.trim(),
      product_link: post.productUrl.trim(),
      category: post.category,
      tags,
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
      message: mapPostInsertError(insertError),
    };
  }

  const postId = data.id as string;

  const { data: creditRow } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("post_id", postId)
    .eq("reason", "post_created")
    .maybeSingle();

  await trackEvent(supabase, {
    event_name: "post_upload",
    user_id: userId,
    post_id: postId,
    metadata: {
      category: post.category,
      image_count: paths.length,
      has_video: Boolean(videoPath),
      awarded_post_credit: Boolean(creditRow),
      normalized_product_url: normalizedUrl,
    },
  });

  return {
    ok: true,
    postId,
    awardedPostCredit: Boolean(creditRow),
  };
}

export type ExistingMedia = {
  url: string;
  path: string;
};

/** One slot in the edited gallery: either a file already in storage or a new upload. */
export type EditableImage =
  | ({ kind: "existing" } & ExistingMedia)
  | { kind: "new"; file: File };

export type UpdatePostInput = {
  title: string;
  description: string;
  productUrl: string;
  category: ProductCategory;
  tags?: string[];
  /**
   * The full gallery in display order — index 0 is the cover. Existing and new
   * images can be interleaved, so a fresh upload can become the cover.
   */
  images: EditableImage[];
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

  // Walk the gallery in order so media_urls/media_paths mirror what the
  // creator arranged, whether a slot is an existing file or a new upload.
  const finalPaths: string[] = [];
  const finalUrls: string[] = [];

  for (const image of input.images) {
    if (image.kind === "existing") {
      finalPaths.push(image.path);
      finalUrls.push(image.url);
      continue;
    }

    const path = `${userId}/${crypto.randomUUID()}.${fileExtension(image.file)}`;
    const { error: uploadError } = await storage.upload(path, image.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: image.file.type,
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

  if (!normalizeProductUrl(input.productUrl)) {
    await cleanupNewUploads();
    return { ok: false, message: "A valid product link is required." };
  }

  const tags = sanitizeTags(input.tags ?? []);

  const { error: updateError } = await supabase
    .from("posts")
    .update({
      product_title: input.title.trim(),
      description: input.description.trim(),
      product_link: input.productUrl.trim(),
      // Edits never award post credits; only create does.
      category: input.category,
      tags,
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

  return { ok: true, postId, awardedPostCredit: false };
}
