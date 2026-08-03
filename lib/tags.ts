export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

/** Letters, numbers, and hyphens; stored lowercase. */
const TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Returns an error message, or null when the tag can be added. */
export function validateTagCandidate(
  raw: string,
  existing: string[]
): string | null {
  const tag = normalizeTag(raw);
  if (!tag) return "Enter a tag.";
  if (tag.length > MAX_TAG_LENGTH) {
    return `Tags must be ${MAX_TAG_LENGTH} characters or fewer.`;
  }
  if (!TAG_PATTERN.test(tag)) {
    return "Use letters, numbers, and hyphens only.";
  }
  if (existing.includes(tag)) return "That tag is already added.";
  if (existing.length >= MAX_TAGS) {
    return `You can add up to ${MAX_TAGS} tags.`;
  }
  return null;
}

/** Normalize, dedupe, and cap a tag list for storage. */
export function sanitizeTags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of rawTags) {
    const tag = normalizeTag(raw);
    if (!tag || tag.length > MAX_TAG_LENGTH || !TAG_PATTERN.test(tag)) {
      continue;
    }
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }

  return tags;
}
