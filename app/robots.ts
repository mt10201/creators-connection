import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Everything public is crawlable. Only signed-in areas and endpoints with no
 * standalone value are blocked — Next's own assets under /_next are left alone
 * so Google can render pages properly.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/settings",
          "/upload",
          "/edit/",
          "/notifications",
          "/referrals",
          "/referral",
          "/saved",
          "/reset-password",
          "/forgot-password",
          "/auth/",
          "/api/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
