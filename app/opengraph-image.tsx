import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image when a page does not supply its own OG image. */
export default function OpenGraphImage() {
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
          background: "#fcf8f3",
          backgroundImage:
            "radial-gradient(900px 500px at 10% -10%, rgba(233,210,198,0.7), transparent 60%), radial-gradient(700px 420px at 100% 0%, rgba(221,227,215,0.55), transparent 62%)",
          color: "#2d211a",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#b3573a",
              color: "#fcf8f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            cc
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 900,
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
