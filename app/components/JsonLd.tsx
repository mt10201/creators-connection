import type { JsonLdObject } from "@/lib/seo";

/**
 * Renders structured data. Server-only, so crawlers see it in the initial HTML.
 *
 * `<` is escaped because JSON.stringify does not escape it, and a title
 * containing `</script>` would otherwise break out of the tag.
 */
export default function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Structured data has no client behaviour; this is inert text.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
