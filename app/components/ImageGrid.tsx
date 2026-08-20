"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export type ImageGridItem = {
  id: string;
  src: string;
  alt?: string;
};

/**
 * Thumbnail grid with pointer-based drag reordering (mouse and touch) and a
 * faded ghost that follows the cursor. Arrow keys move a focused tile.
 */
export default function ImageGrid({
  images,
  disabled,
  minImages = 0,
  onMove,
  onRemove,
}: {
  images: ImageGridItem[];
  disabled: boolean;
  minImages?: number;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const tileRefs = useRef<(HTMLLIElement | null)[]>([]);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [ghostSrc, setGhostSrc] = useState<string | null>(null);

  function placeGhost(x: number, y: number) {
    const el = ghostRef.current;
    if (!el) return;
    el.style.transform = `translate(${x - offsetRef.current.x}px, ${y - offsetRef.current.y}px)`;
  }

  useLayoutEffect(() => {
    if (dragIndex === null) return;
    const el = ghostRef.current;
    if (!el) return;
    el.style.width = `${sizeRef.current.width}px`;
    el.style.height = `${sizeRef.current.height}px`;
    placeGhost(pointerRef.current.x, pointerRef.current.y);
  }, [dragIndex, ghostSrc]);

  function indexAtPoint(x: number, y: number) {
    for (let i = 0; i < images.length; i += 1) {
      const rect = tileRefs.current[i]?.getBoundingClientRect();
      if (
        rect &&
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return i;
      }
    }
    return null;
  }

  function endDrag() {
    const from = dragIndexRef.current;
    const to = overIndexRef.current;
    if (from !== null && to !== null) {
      onMove(from, to);
    }
    dragIndexRef.current = null;
    overIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
    setGhostSrc(null);
  }

  function moveWithKeyboard(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    onMove(from, to);
    requestAnimationFrame(() => tileRefs.current[to]?.focus());
  }

  const canRemove = images.length > minImages;

  return (
    <>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((item, index) => {
          const isDragging = dragIndex === index;
          const isTarget =
            dragIndex !== null && overIndex === index && !isDragging;

          return (
            <li
              key={item.id}
              ref={(node) => {
                tileRefs.current[index] = node;
              }}
              tabIndex={disabled ? -1 : 0}
              aria-grabbed={isDragging}
              aria-label={`Image ${index + 1} of ${images.length}${
                index === 0 ? " (cover)" : ""
              }. Use arrow keys to reorder.`}
              onPointerDown={(event) => {
                if (disabled || images.length < 2) return;
                if ((event.target as HTMLElement).closest("button")) return;
                const rect = event.currentTarget.getBoundingClientRect();
                pointerRef.current = { x: event.clientX, y: event.clientY };
                offsetRef.current = {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                };
                sizeRef.current = { width: rect.width, height: rect.height };
                event.currentTarget.setPointerCapture(event.pointerId);
                dragIndexRef.current = index;
                overIndexRef.current = index;
                setGhostSrc(item.src);
                setDragIndex(index);
                setOverIndex(index);
              }}
              onPointerMove={(event) => {
                if (dragIndexRef.current === null) return;
                pointerRef.current = { x: event.clientX, y: event.clientY };
                placeGhost(event.clientX, event.clientY);
                const next = indexAtPoint(event.clientX, event.clientY);
                if (next !== null && next !== overIndexRef.current) {
                  overIndexRef.current = next;
                  setOverIndex(next);
                }
              }}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(event) => {
                if (disabled) return;
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveWithKeyboard(index, index - 1);
                } else if (
                  event.key === "ArrowRight" ||
                  event.key === "ArrowDown"
                ) {
                  event.preventDefault();
                  moveWithKeyboard(index, index + 1);
                }
              }}
              className={`relative aspect-square touch-none select-none overflow-hidden rounded-xl border bg-cream transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-terracotta-soft/60 ${
                images.length > 1 && !disabled
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : ""
              } ${isDragging ? "scale-95 border-terracotta opacity-40" : ""} ${
                isTarget
                  ? "border-terracotta ring-2 ring-terracotta/40"
                  : "border-sand"
              }`}
            >
              <Image
                src={item.src}
                alt={item.alt ?? (index === 0 ? "Cover image" : `Image ${index + 1}`)}
                fill
                unoptimized
                draggable={false}
                sizes="(min-width: 640px) 25vw, 33vw"
                className="pointer-events-none object-cover"
              />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-terracotta-deep">
                  Cover
                </span>
              )}

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled || !canRemove}
                title={
                  !canRemove
                    ? "A post needs at least one image"
                    : undefined
                }
                className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-lg leading-none text-ink-muted shadow-soft transition hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden>×</span>
                <span className="sr-only">Remove image {index + 1}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {dragIndex !== null &&
        ghostSrc &&
        createPortal(
          <div
            ref={ghostRef}
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-50 overflow-hidden rounded-xl border border-terracotta/40 shadow-soft"
            style={{ opacity: 0.55, willChange: "transform" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ghostSrc}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>,
          document.body
        )}
    </>
  );
}
