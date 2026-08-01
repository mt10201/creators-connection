import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsEventName =
  | "sign_up"
  | "log_in"
  | "post_upload"
  | "post_like"
  | "post_save"
  | "post_delete";

type TrackEventInput = {
  event_name: AnalyticsEventName;
  user_id: string;
  post_id?: string | null;
  /** Keep this free of passwords, emails, and other sensitive fields. */
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort product analytics. Never throws; failures are logged only so
 * they cannot break the user-facing action.
 */
export async function trackEvent(
  supabase: SupabaseClient,
  event: TrackEventInput
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      event_name: event.event_name,
      user_id: event.user_id,
      post_id: event.post_id ?? null,
      metadata: event.metadata ?? {},
    });

    if (error) {
      console.error("Analytics event failed:", error.message);
    }
  } catch (err) {
    console.error("Analytics event failed:", err);
  }
}
