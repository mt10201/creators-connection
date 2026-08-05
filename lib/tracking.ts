export const TRACK_ENDPOINT = "/api/track";

export type TrackingSurface =
  | "explore"
  | "just_landed"
  | "home_banner"
  | "product";

export const TRACKING_SURFACES: TrackingSurface[] = [
  "explore",
  "just_landed",
  "home_banner",
  "product",
];

/**
 * Surfaces that are always paid placements. The home banner is not listed
 * because it falls back to organic picks, so that caller passes isBoosted
 * explicitly per slide.
 */
const ALWAYS_BOOSTED_SURFACES: TrackingSurface[] = ["just_landed"];

export function isBoostedSurface(surface: TrackingSurface): boolean {
  return ALWAYS_BOOSTED_SURFACES.includes(surface);
}

/** Card must be at least half visible for this long before it counts. */
export const IMPRESSION_VISIBLE_RATIO = 0.5;
export const IMPRESSION_DWELL_MS = 1000;

const ANON_KEY_STORAGE = "cc_viewer_key";

/**
 * Stable per-browser key for anonymous viewers. Signed-in requests are keyed
 * by user id on the server instead, so this is only a dedupe hint.
 */
export function getViewerKey(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(ANON_KEY_STORAGE);
    if (existing) return existing;

    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `k_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    window.localStorage.setItem(ANON_KEY_STORAGE, created);
    return created;
  } catch {
    // Private mode or blocked storage: fall back to a per-page-load key.
    return `ephemeral_${Math.random().toString(36).slice(2)}`;
  }
}

type TrackPayload = {
  type: "impression" | "link_click";
  postId: string;
  surface?: TrackingSurface;
  isBoosted?: boolean;
  viewerKey: string;
};

const DEV = process.env.NODE_ENV !== "production";

/** Beacons are hidden behind the Network panel's "Other"/"Ping" filter. */
function logSent(payload: TrackPayload, transport: string) {
  if (!DEV) return;
  console.log(
    `[track] ${payload.type} sent via ${transport}`,
    payload.type === "impression"
      ? {
          postId: payload.postId,
          surface: payload.surface,
          isBoosted: payload.isBoosted === true,
        }
      : { postId: payload.postId, isBoosted: payload.isBoosted === true }
  );
}

/**
 * Fire-and-forget. sendBeacon survives the page unload that follows an
 * outbound click; fetch with keepalive is the fallback.
 */
export function sendTrackingEvent(payload: TrackPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) {
        logSent(payload, "sendBeacon");
        return;
      }
    }

    logSent(payload, "fetch");
    void fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never surface an error to the viewer.
    });
  } catch {
    // Same: swallow.
  }
}
