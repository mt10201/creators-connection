"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toggleLike, toggleSave } from "@/app/actions/engagement";

type Props = {
  postId: string;
  isLoggedIn: boolean;
  initialLiked: boolean;
  initialLikeCount: number;
  initialSaved: boolean;
  initialSaveCount: number;
  size?: "sm" | "md";
};

export default function PostActions({
  postId,
  isLoggedIn,
  initialLiked,
  initialLikeCount,
  initialSaved,
  initialSaveCount,
  size = "sm",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Replays the icon pop only on a fresh activation, not on every re-render.
  const [popping, setPopping] = useState<"like" | "save" | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when the same card remounts with fresh server data
  // (e.g. after a filter change or soft navigation).
  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
    setSaved(initialSaved);
    setSaveCount(initialSaveCount);
    setError(null);
  }, [
    postId,
    initialLiked,
    initialLikeCount,
    initialSaved,
    initialSaveCount,
  ]);

  useEffect(() => {
    return () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    };
  }, []);

  function pop(kind: "like" | "save") {
    if (popTimer.current) clearTimeout(popTimer.current);
    setPopping(kind);
    popTimer.current = setTimeout(() => setPopping(null), 340);
  }

  function run(kind: "like" | "save") {
    if (!isLoggedIn) {
      const redirectTo = pathname || "/explore";
      router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    setError(null);

    // Optimistic flip; reverted below if the server disagrees.
    const wasLiked = liked;
    const wasSaved = saved;
    if (kind === "like") {
      if (!wasLiked) pop("like");
      setLiked(!wasLiked);
      setLikeCount((c) => c + (wasLiked ? -1 : 1));
    } else {
      if (!wasSaved) pop("save");
      setSaved(!wasSaved);
      setSaveCount((c) => c + (wasSaved ? -1 : 1));
    }

    startTransition(async () => {
      const result =
        kind === "like" ? await toggleLike(postId) : await toggleSave(postId);

      if (!result.ok) {
        if (kind === "like") {
          setLiked(wasLiked);
          setLikeCount((c) => c + (wasLiked ? 1 : -1));
        } else {
          setSaved(wasSaved);
          setSaveCount((c) => c + (wasSaved ? 1 : -1));
        }
        setError(result.error);
        return;
      }

      if (kind === "like") {
        setLiked(result.active);
        setLikeCount(result.count);
      } else {
        setSaved(result.active);
        setSaveCount(result.count);
      }
    });
  }

  const baseButton = `inline-flex items-center gap-1.5 rounded-full border font-semibold tabular-nums transition duration-200 ease-out active:scale-[0.94] disabled:cursor-not-allowed ${
    size === "md"
      ? "min-h-11 px-4 text-sm"
      : "min-h-10 px-3.5 text-xs sm:min-h-9 sm:px-3"
  } ${pending ? "opacity-70" : ""}`;

  const iconClass = "text-[1.05em] leading-none transition-transform";

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-2"
        aria-busy={pending || undefined}
      >
        <button
          type="button"
          onClick={() => run("like")}
          disabled={pending}
          aria-pressed={liked}
          title={isLoggedIn ? undefined : "Log in to like this product"}
          className={`${baseButton} ${
            liked
              ? "border-terracotta/30 bg-terracotta-soft text-terracotta-deep"
              : "border-sand bg-cream text-ink-muted hover:-translate-y-px hover:border-terracotta/40 hover:text-terracotta"
          }`}
        >
          <span
            aria-hidden
            className={`${iconClass} ${popping === "like" ? "animate-pop" : ""}`}
          >
            {liked ? "♥" : "♡"}
          </span>
          <span aria-hidden>{likeCount}</span>
          <span className="sr-only">
            {liked ? "Unlike this product" : "Like this product"}, {likeCount}{" "}
            {likeCount === 1 ? "like" : "likes"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => run("save")}
          disabled={pending}
          aria-pressed={saved}
          title={isLoggedIn ? undefined : "Log in to save this product"}
          className={`${baseButton} ${
            saved
              ? "border-sage/35 bg-sage-soft text-sage"
              : "border-sand bg-cream text-ink-muted hover:-translate-y-px hover:border-sage/40 hover:text-sage"
          }`}
        >
          <span
            aria-hidden
            className={`${iconClass} ${popping === "save" ? "animate-pop" : ""}`}
          >
            {saved ? "★" : "☆"}
          </span>
          <span aria-hidden>{saveCount}</span>
          <span className="sr-only">
            {saved ? "Remove from saved" : "Save this product"}, {saveCount}{" "}
            {saveCount === 1 ? "save" : "saves"}
          </span>
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {liked ? "Liked" : "Not liked"}. {saved ? "Saved" : "Not saved"}.
      </p>

      {error && (
        <p
          role="alert"
          className="animate-fade-in mt-2 text-xs text-terracotta-deep"
        >
          {error}
        </p>
      )}
    </div>
  );
}
