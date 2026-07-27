"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { productCategories, type ProductCategory } from "@/lib/categories";
import {
  MAX_IMAGES,
  MAX_VIDEO_SECONDS,
  type ExistingMedia,
  updatePost,
  validateImage,
  validateProductUrl,
  validateVideo,
} from "@/lib/posts";
import Spinner from "@/app/components/Spinner";

const inputClass = "form-input";
const labelClass = "form-label";

export type EditablePost = {
  id: string;
  product_title: string;
  description: string;
  product_link: string;
  category: ProductCategory;
  media_urls: string[];
  media_paths: string[];
  video_url: string | null;
  video_path: string | null;
};

export default function EditForm({
  userId,
  post,
}: {
  userId: string;
  post: EditablePost;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post.product_title);
  const [description, setDescription] = useState(post.description);
  const [productUrl, setProductUrl] = useState(post.product_link);
  const [category, setCategory] = useState<ProductCategory | "">(post.category);
  const [keptImages, setKeptImages] = useState<ExistingMedia[]>(() =>
    post.media_urls
      .map((url, index) => ({
        url,
        path: post.media_paths[index] ?? "",
      }))
      .filter((image) => image.url)
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);
  const [keptVideo, setKeptVideo] = useState<ExistingMedia | null>(() =>
    post.video_url
      ? { url: post.video_url, path: post.video_path ?? "" }
      : null
  );
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [newVideoPreviewUrl, setNewVideoPreviewUrl] = useState<string | null>(
    null
  );
  const [removeVideo, setRemoveVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalImages = keptImages.length + newImages.length;
  const activeVideoUrl =
    newVideoPreviewUrl ??
    (!removeVideo && !newVideo ? (keptVideo?.url ?? null) : null);

  useEffect(() => {
    const urls = newImages.map((image) => URL.createObjectURL(image));
    setNewPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  useEffect(() => {
    if (!newVideo) {
      setNewVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(newVideo);
    setNewVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newVideo]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    if (selected.length === 0) return;

    for (const file of selected) {
      const imageError = validateImage(file);
      if (imageError) {
        setError(`${file.name}: ${imageError}`);
        return;
      }
    }

    setNewImages((current) => {
      const combined = [...current, ...selected];
      const room = MAX_IMAGES - keptImages.length;
      if (combined.length > room) {
        setError(`You can have up to ${MAX_IMAGES} images.`);
        return combined.slice(0, Math.max(0, room));
      }
      return combined;
    });
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError(null);
    if (!file) return;

    const videoError = await validateVideo(file);
    if (videoError) {
      setError(videoError);
      return;
    }

    setNewVideo(file);
    setRemoveVideo(false);
  }

  function clearVideo() {
    setError(null);
    setNewVideo(null);
    setKeptVideo(null);
    setRemoveVideo(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please choose a category.");
      return;
    }

    if (totalImages === 0) {
      setError("Please keep at least one image of your product.");
      return;
    }

    const urlError = validateProductUrl(productUrl);
    if (urlError) {
      setError(urlError);
      return;
    }

    if (newVideo) {
      const videoError = await validateVideo(newVideo);
      if (videoError) {
        setError(videoError);
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();
    const result = await updatePost(
      supabase,
      userId,
      post.id,
      {
        mediaPaths: post.media_paths.filter(Boolean),
        videoPath: post.video_path,
      },
      {
        title,
        description,
        productUrl,
        category,
        keepImages: keptImages,
        newImages,
        keepVideo: removeVideo || newVideo ? null : keptVideo,
        newVideo,
        removeVideo: removeVideo && !newVideo,
      }
    );

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    router.push(`/products/${post.id}`);
    router.refresh();
  }

  return (
    <div className="px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-9 text-center">
          <span className="eyebrow text-sage">Edit post</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Update your <em className="italic text-terracotta">product</em>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            Adjust the details, swap images, or replace the short clip — then
            save to publish the changes.
          </p>
        </div>

        <div className="rounded-[2rem] border border-sand bg-parchment/70 p-6 shadow-soft sm:p-9">
          {error && (
            <div role="alert" className="form-alert-error mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="title" className={labelClass}>
                Product Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className={`${inputClass} resize-y`}
              />
              <p className="form-hint tabular-nums">
                {description.length}/1000
              </p>
            </div>

            <div>
              <label htmlFor="productUrl" className={labelClass}>
                Product Link / URL
              </label>
              <input
                id="productUrl"
                name="productUrl"
                type="url"
                required
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                disabled={loading}
                className={inputClass}
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {productCategories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={labelClass}>
                Product Images{" "}
                <span className="font-normal tabular-nums text-ink-faint">
                  ({totalImages}/{MAX_IMAGES})
                </span>
              </span>

              {(keptImages.length > 0 || newPreviewUrls.length > 0) && (
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {keptImages.map((image, index) => (
                    <li
                      key={`kept-${image.path || image.url}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-cream"
                    >
                      <Image
                        src={image.url}
                        alt={`Current image ${index + 1}`}
                        fill
                        unoptimized
                        sizes="(min-width: 640px) 25vw, 33vw"
                        className="object-cover"
                      />
                      {index === 0 && newImages.length === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-terracotta-deep">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setKeptImages((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        disabled={loading}
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-lg leading-none text-ink-muted shadow-soft transition hover:text-terracotta disabled:opacity-60"
                      >
                        <span aria-hidden>×</span>
                        <span className="sr-only">Remove image</span>
                      </button>
                    </li>
                  ))}

                  {newPreviewUrls.map((url, index) => (
                    <li
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-xl border border-sand bg-cream"
                    >
                      <Image
                        src={url}
                        alt={`New image ${index + 1}`}
                        fill
                        unoptimized
                        sizes="(min-width: 640px) 25vw, 33vw"
                        className="object-cover"
                      />
                      {keptImages.length === 0 && index === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-terracotta-deep">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setNewImages((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                        disabled={loading}
                        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-lg leading-none text-ink-muted shadow-soft transition hover:text-terracotta disabled:opacity-60"
                      >
                        <span aria-hidden>×</span>
                        <span className="sr-only">Remove new image</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {totalImages < MAX_IMAGES && (
                <label
                  htmlFor="images"
                  className="mt-3 flex min-h-[8rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-clay bg-cream/60 px-6 py-8 text-center transition hover:border-terracotta hover:bg-cream has-[:focus-visible]:border-terracotta has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-terracotta-soft/60"
                >
                  <span className="text-sm font-medium text-terracotta">
                    Add more images
                  </span>
                  <span className="text-xs text-ink-faint">
                    PNG, JPG, or WEBP up to 5 MB each
                  </span>
                  <input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={loading}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            <div>
              <span className={labelClass}>
                Short video{" "}
                <span className="font-normal text-ink-faint">(optional)</span>
              </span>
              <p className="form-hint">
                Up to {MAX_VIDEO_SECONDS} seconds · MP4, WebM, or MOV · max 12 MB
              </p>

              {activeVideoUrl ? (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-sand bg-cream">
                  <video
                    src={activeVideoUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/55 to-transparent px-3 py-2.5">
                    <span className="truncate text-xs font-medium text-cream">
                      {newVideo?.name ?? "Current video"}
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <label
                        htmlFor="video-replace"
                        className="cursor-pointer rounded-full bg-cream/95 px-3 py-1 text-xs font-medium text-ink-muted transition hover:text-terracotta"
                      >
                        Replace
                        <input
                          id="video-replace"
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                          onChange={handleVideoChange}
                          disabled={loading}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={clearVideo}
                        disabled={loading}
                        className="rounded-full bg-cream/95 px-3 py-1 text-xs font-medium text-ink-muted transition hover:text-terracotta disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="video"
                  className="mt-3 flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-clay bg-cream/60 px-6 py-8 text-center transition hover:border-terracotta hover:bg-cream has-[:focus-visible]:border-terracotta has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-terracotta-soft/60"
                >
                  <span className="text-sm font-medium text-terracotta">
                    Add a short product video
                  </span>
                  <input
                    id="video"
                    name="video"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    onChange={handleVideoChange}
                    disabled={loading}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary btn-lg flex-1"
              >
                {loading && <Spinner />}
                {loading ? "Saving…" : "Save changes"}
              </button>
              <Link
                href={`/products/${post.id}`}
                className="btn-secondary btn-lg flex-1 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
