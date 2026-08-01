import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image when a page does not supply its own OG image. */
export default function OpenGraphImage() {
  // Keep styles Satori-friendly (solid colors, flexbox only) so this route
  // reliably renders in production instead of 404ing.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#fcf8f3",
          color: "#2d211a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              backgroundColor: "#b3573a",
              color: "#fcf8f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            cc
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 920,
            }}
          >
            Independent makers, shared for discovery.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#6d5b4e",
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            A focused space to share products and find inspiration.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
