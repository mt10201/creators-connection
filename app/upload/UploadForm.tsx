"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { productCategories, type ProductCategory } from "@/lib/categories";
import {
  MAX_IMAGES,
  MAX_VIDEO_SECONDS,
  createPost,
  validateImage,
  validateProductUrl,
  validateVideo,
} from "@/lib/posts";
import TagInput from "@/app/components/TagInput";
import Spinner from "@/app/components/Spinner";
import ImageGrid, { moveItem } from "@/app/components/ImageGrid";

const inputClass = "form-input";
const labelClass = "form-label";

type UploadImage = { id: string; file: File; previewUrl: string };

export default function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [postedId, setPostedId] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<UploadImage[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /** Locks the form once a post exists, so Publish can't run twice. */
  const published = postedId !== null;

  // Previews are created when a file is picked (not per render) so reordering
  // doesn't churn object URLs. This releases whatever is left on unmount.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      imagesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    },
    []
  );

  useEffect(() => {
    if (!video) {
      setVideoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

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

    const room = MAX_IMAGES - images.length;
    if (selected.length > room) {
      setError(`You can add up to ${MAX_IMAGES} images.`);
    }
    if (room <= 0) return;

    const additions: UploadImage[] = selected.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...additions]);
  }

  function moveImage(from: number, to: number) {
    setError(null);
    setImages((current) => moveItem(current, from, to));
  }

  function removeImage(id: string) {
    setError(null);
    const target = images.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setImages((current) => current.filter((item) => item.id !== id));
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

    setVideo(file);
  }

  function removeVideo() {
    setError(null);
    setVideo(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // One post per session: the ref beats the state update race that a fast
    // double-click (or a re-fired submit) would otherwise slip through.
    if (submittedRef.current || loading || postedId) return;

    setError(null);
    setSuccess(null);

    if (!category) {
      setError("Please choose a category.");
      return;
    }

    if (images.length === 0) {
      setError("Please add at least one image of your product.");
      return;
    }

    const urlError = validateProductUrl(productUrl);
    if (urlError) {
      setError(urlError);
      return;
    }

    if (video) {
      const videoError = await validateVideo(video);
      if (videoError) {
        setError(videoError);
        return;
      }
    }

    submittedRef.current = true;
    setLoading(true);


    const supabase = createClient();
    const result = await createPost(supabase, userId, {
      title,
      description,
      productUrl,
      category,
      tags,
      images: images.map((item) => item.file),
      video,
    });

    if (!result.ok) {
      // Nothing was created, so allow another attempt.
      submittedRef.current = false;
      setError(
        result.message.trim() ||
          "Could not save your post. Please try again."
      );
      setLoading(false);
      return;
    }

    const creditNote = result.awardedPostCredit
      ? "You earned 1 credit (spendable in 24 hours)."
      : "This product link already earned a post credit, so no new one was added.";

    // Lock Publish immediately, then leave the upload form so it can't be
    // submitted again. Boost from the product page instead.
    setPostedId(result.postId);
    setSuccess(`Product posted! ${creditNote} Redirecting…`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-9 text-center">
          <span className="eyebrow text-sage">New post</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Share your <em className="italic text-terracotta">product</em>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            Post your work for the community to discover — a new product link
            earns 1 credit (spendable after 24 hours).
          </p>
        </div>

        <div className="rounded-[2rem] border border-sand bg-parchment/70 p-6 shadow-soft sm:p-9">
          {error && (
            <div role="alert" className="form-alert-error mb-6">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="form-alert-success mb-6">
              {success}
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
                placeholder="Hammered Silver Leaf Pendant"
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
                placeholder="Tell other makers what you made, the materials you used, and what inspired it."
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
                placeholder="https://your-shop.com/product"
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

            <TagInput tags={tags} onChange={setTags} disabled={loading} />

            <div>
              <span className={labelClass}>
                Product Images{" "}
                <span className="font-normal tabular-nums text-ink-faint">
                  ({images.length}/{MAX_IMAGES})
                </span>
              </span>

              {images.length > 0 && (
                <>
                  <p className="form-hint">
                    Drag to reorder — the first image is the cover.
                  </p>
                  <ImageGrid
                    images={images.map((item) => ({
                      id: item.id,
                      src: item.previewUrl,
                      alt: item.file.name,
                    }))}
                    disabled={loading || published}
                    onMove={moveImage}
                    onRemove={removeImage}
                  />
                </>
              )}

              {images.length < MAX_IMAGES && (
                <label
                  htmlFor="images"
                  className="mt-3 flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-clay bg-cream/60 px-6 py-10 text-center transition duration-200 ease-out hover:border-terracotta hover:bg-cream has-[:focus-visible]:border-terracotta has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-terracotta-soft/60"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-9 w-9 text-clay"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-terracotta">
                    {images.length === 0
                      ? "Click to choose images"
                      : "Add more images"}
                  </span>
                  <span className="max-w-xs text-xs leading-relaxed text-ink-faint">
                    PNG, JPG, or WEBP up to 5 MB each — the first image is your
                    cover
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
                One clip, up to {MAX_VIDEO_SECONDS} seconds · MP4, WebM, or MOV ·
                max 12 MB
              </p>

              {video && videoPreviewUrl ? (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-sand bg-cream">
                  <video
                    src={videoPreviewUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink/55 to-transparent px-3 py-2.5">
                    <span className="truncate text-xs font-medium text-cream">
                      {video.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeVideo}
                      disabled={loading}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-cream/95 px-4 text-sm font-medium text-ink-muted transition hover:text-terracotta disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="video"
                  className="mt-3 flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-clay bg-cream/60 px-6 py-8 text-center transition duration-200 ease-out hover:border-terracotta hover:bg-cream has-[:focus-visible]:border-terracotta has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-terracotta-soft/60"
                >
                  <span className="eyebrow text-sage">Clip</span>
                  <span className="text-sm font-medium text-terracotta">
                    Add a short product video
                  </span>
                  <span className="max-w-xs text-xs leading-relaxed text-ink-faint">
                    A quick turn or detail shot — loops muted on the product
                    page
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

            <button
              type="submit"
              disabled={loading || published}
              className="btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Spinner />}
              {published
                ? "Published"
                : loading
                  ? "Publishing…"
                  : "Publish Product"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
