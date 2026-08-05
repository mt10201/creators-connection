/**
 * Phase 1 organic ranking for Explore.
 *
 * score = 1.0 * quality_proxy + 0.85 * freshness + 0.25 * new_maker_bonus
 *
 * Deliberately excluded from the score: boost status, credits spent, and
 * anything else purchasable. Boosts only fill the separate Just landed strip.
 * Impression counts are logged but are not score inputs; if they ever become
 * one, only posts.organic_impressions may be read.
 */

export const RANKING_WEIGHTS = {
  quality: 1.0,
  freshness: 0.85,
  newMaker: 0.25,
} as const;

/** Saves signal more intent than likes, so they count double. */
const LIKE_WEIGHT = 1;
const SAVE_WEIGHT = 2;

/**
 * Weighted engagement that maps to ~1.0 quality. Without impression counts a
 * raw ratio is impossible, so this is a soft cap: log growth means a viral post
 * can't run away with the feed and a brand-new post isn't buried at zero.
 */
const QUALITY_SOFT_CAP = 20;

const FRESHNESS_HALF_LIFE_HOURS = 72;
const NEW_MAKER_MAX_AGE_DAYS = 14;

/** Positions are 1-based. Caps apply to the leading window, not the whole page. */
export const DIVERSITY_CAPS = [
  { throughPosition: 8, maxPerCreator: 1 },
  { throughPosition: 24, maxPerCreator: 2 },
] as const;

export type RankablePost = {
  id: string;
  creator_id: string | null;
  created_at: string | null;
  like_count: number | null;
  save_count: number | null;
};

function toMillis(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function qualityProxy(post: RankablePost): number {
  const weighted =
    LIKE_WEIGHT * Math.max(0, post.like_count ?? 0) +
    SAVE_WEIGHT * Math.max(0, post.save_count ?? 0);

  return Math.min(1, Math.log1p(weighted) / Math.log1p(QUALITY_SOFT_CAP));
}

export function freshness(post: RankablePost, now: number): number {
  const published = toMillis(post.created_at);
  if (published === null) return 0;

  const ageHours = Math.max(0, (now - published) / 3_600_000);
  return Math.pow(0.5, ageHours / FRESHNESS_HALF_LIFE_HOURS);
}

/** Step function: full bonus for accounts under 14 days old, nothing after. */
export function newMakerBonus(
  creatorCreatedAt: string | null | undefined,
  now: number
): number {
  const created = toMillis(creatorCreatedAt ?? null);
  if (created === null) return 0;

  const ageDays = (now - created) / 86_400_000;
  return ageDays < NEW_MAKER_MAX_AGE_DAYS ? 1 : 0;
}

export function scorePost(
  post: RankablePost,
  creatorCreatedAt: string | null | undefined,
  now: number
): number {
  return (
    RANKING_WEIGHTS.quality * qualityProxy(post) +
    RANKING_WEIGHTS.freshness * freshness(post, now) +
    RANKING_WEIGHTS.newMaker * newMakerBonus(creatorCreatedAt, now)
  );
}

function maxPerCreatorAt(position: number): number {
  for (const cap of DIVERSITY_CAPS) {
    if (position <= cap.throughPosition) return cap.maxPerCreator;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Greedy re-rank: walk the positions in order and take the highest-scoring
 * candidate that still fits the creator cap for that position. If nothing fits
 * (one creator holds everything left) the cap is relaxed rather than dropping
 * posts, so the grid never renders a hole.
 */
export function applyDiversityCaps<T extends { creator_id: string | null }>(
  ranked: T[]
): T[] {
  const remaining = [...ranked];
  const output: T[] = [];
  const usedByCreator = new Map<string, number>();

  while (remaining.length > 0) {
    const limit = maxPerCreatorAt(output.length + 1);

    let index = remaining.findIndex((item) => {
      const key = item.creator_id;
      if (!key) return true;
      return (usedByCreator.get(key) ?? 0) < limit;
    });

    if (index === -1) index = 0;

    const [picked] = remaining.splice(index, 1);
    output.push(picked);

    if (picked.creator_id) {
      usedByCreator.set(
        picked.creator_id,
        (usedByCreator.get(picked.creator_id) ?? 0) + 1
      );
    }
  }

  return output;
}

/** Score, sort, then diversify. `now` is injectable so tests stay stable. */
export function rankPosts<T extends RankablePost>(
  posts: T[],
  creatorCreatedAt: Map<string, string>,
  now: number = Date.now()
): T[] {
  const scored = posts.map((post) => ({
    post,
    score: scorePost(
      post,
      post.creator_id ? creatorCreatedAt.get(post.creator_id) : null,
      now
    ),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable, meaningful tiebreak so equal scores don't shuffle per request.
    return (toMillis(b.post.created_at) ?? 0) - (toMillis(a.post.created_at) ?? 0);
  });

  return applyDiversityCaps(scored.map((entry) => entry.post));
}
