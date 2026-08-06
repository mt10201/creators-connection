import type { Metadata } from "next";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  getDefaultOgImageUrl,
} from "@/lib/site";

/**
 * Signed-in-only pages. `follow: true` keeps link equity flowing through them
 * while keeping the page itself out of the index.
 */
export const PRIVATE_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

/** JSON-LD is typed loosely on purpose: schema.org shapes vary by @type. */
export type JsonLdObject = Record<string, unknown>;

/**
 * WebSite entry with a search action, so Google can offer a sitelinks search
 * box pointing at Explore. /explore?q= is a real, public, crawlable URL.
 */
export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE_NAME,
    alternateName: "CC",
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/explore")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The publisher behind the site. No employee/address claims we can't support. */
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    logo: getDefaultOgImageUrl(),
  };
}

/**
 * A shared product post. Modelled as CreativeWork rather than Product because
 * the site has no prices, stock, ratings or reviews — every listing links out
 * to wherever the maker actually sells. Claiming Product/Offer data we don't
 * have would be structured-data spam.
 */
export function productJsonLd({
  path,
  title,
  description,
  images,
  creatorName,
  creatorPath,
  category,
  createdAt,
  externalUrl,
}: {
  path: string;
  title: string;
  description: string;
  images: string[];
  creatorName: string | null;
  creatorPath: string | null;
  category: string | null;
  createdAt: string | null;
  externalUrl: string | null;
}): JsonLdObject {
  const url = absoluteUrl(path);

  const node: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#creativework`,
    name: title,
    headline: title,
    description,
    url,
    inLanguage: "en",
    isPartOf: { "@id": `${absoluteUrl("/")}#website` },
  };

  if (images.length > 0) node.image = images;
  if (category) node.genre = category;
  if (createdAt) node.dateCreated = createdAt;
  if (externalUrl) node.sameAs = externalUrl;

  if (creatorName) {
    node.author = {
      "@type": "Person",
      name: creatorName,
      ...(creatorPath ? { url: absoluteUrl(creatorPath) } : {}),
    };
  }

  return node;
}

export function breadcrumbJsonLd(
  trail: { name: string; path: string }[]
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** A maker's public profile. */
export function profileJsonLd({
  path,
  username,
  photoUrl,
  postCount,
}: {
  path: string;
  username: string;
  photoUrl: string | null;
  postCount: number;
}): JsonLdObject {
  const url = absoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profilepage`,
    url,
    inLanguage: "en",
    isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    mainEntity: {
      "@type": "Person",
      name: username,
      url,
      description: `Independent maker sharing work on ${SITE_NAME}.`,
      ...(photoUrl ? { image: photoUrl } : {}),
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CreateAction",
      userInteractionCount: postCount,
    },
  };
}
