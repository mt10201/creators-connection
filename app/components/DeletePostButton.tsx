"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/actions/posts";
import Spinner from "./Spinner";

type Props = {
  postId: string;
  title?: string | null;
};

export default function DeletePostButton({ postId, title }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the dialog from scrolling.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, pending]);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deletePost(postId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-full border border-sand bg-cream px-4 text-sm font-medium text-ink-muted transition duration-200 hover:border-terracotta/40 hover:bg-terracotta-soft/40 hover:text-terracotta-deep"
      >
        Delete
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-post-title"
          aria-describedby="delete-post-copy"
          className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-card border border-sand bg-cream p-6 shadow-lift sm:p-7">
            <span className="eyebrow text-terracotta">Delete post</span>
            <h2
              id="delete-post-title"
              className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight"
            >
              {title ? `Delete “${title}”?` : "Delete this post?"}
            </h2>
            <p
              id="delete-post-copy"
              className="mt-3 text-sm leading-relaxed text-ink-muted"
            >
              This removes the post from Explore for good, along with its images,
              video, likes, and saves. Credits earned from this post (and its
              likes/saves) come back out of your balance. It can’t be undone.
            </p>

            {error && (
              <p role="alert" className="form-alert-error mt-5">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary"
              >
                Keep post
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={confirm}
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-terracotta-deep px-6 text-sm font-medium text-cream shadow-soft transition duration-200 ease-out hover:bg-terracotta hover:shadow-lift active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending && <Spinner />}
                {pending ? "Deleting…" : "Delete post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
