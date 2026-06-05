import { SITE_URL } from "@/lib/seo";

/**
 * Schema.org ProfilePage for /about. The `mainEntity` is a `@id`
 * reference to the Person blob also rendered on this page — the
 * Person object itself is NOT duplicated here. Crawlers resolve the
 * reference against the Person blob in the same HTML payload (or the
 * one on the home page, which uses the same @id) and build a single
 * entity record.
 *
 * What this adds on top of just shipping the Person blob alone:
 *
 *   - Declares /about as the canonical PROFILE surface for that
 *     Person. Google's knowledge-panel algorithm uses ProfilePage
 *     markup as a stronger signal than a free-standing Person blob
 *     for "this URL is the entity-home page", which is exactly the
 *     signal we're trying to amplify — Karim's panel currently sources
 *     its bio snippet from a gallery site rather than karimboumjimar.com.
 *
 *   - Lets us attach page-level metadata (`dateModified`, `name`,
 *     `inLanguage`) without polluting the Person object, which is
 *     shared across multiple pages and should stay page-agnostic.
 *
 * `dateModified` is intentionally omitted — without a build-time
 * content hash we'd have to hardcode a date that goes stale, and
 * lying to Google is worse than not telling it. Add it if/when the
 * about copy gets a real revision tracker.
 */
export const ABOUT_PROFILEPAGE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${SITE_URL}/about#profile`,
  url: `${SITE_URL}/about`,
  name: "About — Karim Boumjimar",
  inLanguage: "en",
  mainEntity: { "@id": `${SITE_URL}/#person` },
} as const;
