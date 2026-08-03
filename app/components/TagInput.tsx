"use client";

import { useState } from "react";
import {
  MAX_TAG_LENGTH,
  MAX_TAGS,
  normalizeTag,
  validateTagCandidate,
} from "@/lib/tags";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  id?: string;
};

export default function TagInput({
  tags,
  onChange,
  disabled = false,
  id = "tags",
}: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string) {
    const validationError = validateTagCandidate(raw, tags);
    if (validationError) {
      setError(validationError);
      return;
    }

    onChange([...tags, normalizeTag(raw)]);
    setDraft("");
    setError(null);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag));
    setError(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) addTag(draft);
      return;
    }

    if (event.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="form-label">
        Tags{" "}
        <span className="font-normal text-ink-faint">(optional)</span>
      </label>

      {tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag}>
              <span className="chip border-sand bg-cream text-ink-muted">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={disabled}
                  className="ml-1.5 text-ink-faint transition hover:text-terracotta disabled:opacity-50"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) addTag(draft);
        }}
        disabled={disabled || tags.length >= MAX_TAGS}
        maxLength={MAX_TAG_LENGTH}
        placeholder={
          tags.length >= MAX_TAGS
            ? "Tag limit reached"
            : "e.g. ceramic, handmade — press Enter"
        }
        className="form-input"
        aria-describedby={`${id}-hint`}
        aria-invalid={Boolean(error) || undefined}
      />
      <p id={`${id}-hint`} className="form-hint">
        Up to {MAX_TAGS} short tags for search. {tags.length}/{MAX_TAGS} used.
      </p>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-terracotta-deep">
          {error}
        </p>
      )}
    </div>
  );
}
