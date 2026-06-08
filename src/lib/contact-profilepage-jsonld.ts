import { SITE_URL } from "@/lib/seo";

/**
 * Schema.org ProfilePage for /contact. (Renamed from
 * about-profilepage-jsonld when the route was renamed from /about to
 * /contact — same purpose, new URL.) The `mainEntity` is a `@id`
 * reference to the Person blob also rendered on this page — the
 * Person object itself is NOT duplicated here. Crawlers resolve the
 * reference against the Person blob in the same HTML payload (or the
 * one on the home page, which uses the same @id) and build a single
 * entity record.
 *
 * What this adds on top of just shipping the Person blob alone:
 *
 *   - Declares /contact as the canonical PROFILE surface for that
 *     Person. Google's knowledge-panel algorithm uses ProfilePage
 *     markup as a stronger signal than a free-standing Person blob
 *     for "this URL is the entity-home page", which is the signal we
 *     keep trying to amplify — Karim's panel previously sourced its
 *     bio snippet from a gallery site rather than karimboumjimar.com.
 *
 *   - Lets us attach page-level metadata (`name`, `inLanguage`, etc.)
 *     without polluting the Person object, which is shared across
 *     multiple pages and should stay page-agnostic.
 *
 * `dateModified` is intentionally omitted — without a build-time
 * content hash we'd have to hardcode a date that goes stale, and
 * lying to Google is worse than not telling it.
 */
export const CONTACT_PROFILEPAGE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${SITE_URL}/contact#profile`,
  url: `${SITE_URL}/contact`,
  name: "Contact — Karim Boumjimar",
  inLanguage: "en",
  mainEntity: { "@id": `${SITE_URL}/#person` },
} as const;
