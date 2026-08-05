import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TRACKING_SURFACES, type TrackingSurface } from "@/lib/tracking";

type TrackBody = {
  type?: string;
  postId?: string;
  surface?: string;
  isBoosted?: boolean;
  viewerKey?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Impression and outbound-click sink. Always answers 204 so a beacon failure
 * can never show up as a console error on the page.
 */
export async function POST(request: Request) {
  let body: TrackBody;

  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const postId = typeof body.postId === "string" ? body.postId : "";
  if (!UUID_RE.test(postId)) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in viewers are keyed by user id so the client can't forge a fresh
  // key per refresh; anonymous viewers fall back to their browser key.
  const clientKey =
    typeof body.viewerKey === "string" ? body.viewerKey.trim().slice(0, 100) : "";
  const viewerKey = user ? `u:${user.id}` : clientKey;

  if (!viewerKey) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    if (body.type === "link_click") {
      await supabase.rpc("record_link_click", {
        p_post_id: postId,
        p_viewer_key: viewerKey,
        p_is_boosted: body.isBoosted === true,
      });
    } else if (body.type === "impression") {
      const surface = TRACKING_SURFACES.includes(body.surface as TrackingSurface)
        ? (body.surface as TrackingSurface)
        : null;

      if (surface) {
        await supabase.rpc("record_impression", {
          p_post_id: postId,
          p_viewer_key: viewerKey,
          p_surface: surface,
          p_is_boosted: body.isBoosted === true,
        });
      }
    }
  } catch (error) {
    console.error("Tracking event failed:", error);
  }

  return new NextResponse(null, { status: 204 });
}
