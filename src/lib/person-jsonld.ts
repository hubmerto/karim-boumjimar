import { BIO_LEAD } from "@/data/bio";
import { SITE_URL } from "@/lib/seo";

/**
 * Schema.org Person describing Karim Boumjimar. Embedded on the home
 * page and /contact so Google can build a knowledge-graph entry
 * pointing at karimboumjimar.com as the authoritative source.
 * (Previously /about, before the route was renamed to /contact.)
 * `sameAs` lists
 * the artist's other canonical web presences — Google uses these for
 * entity-linking and to consolidate ranking signal across the artist's
 * scattered pages on third-party platforms.
 *
 * `additionalType` set to VisualArtist (a sub-class of Person) so
 * crawlers that key off art-specific schemas (e.g. Artsy's, museum
 * indices) catch it. `birthPlace`/`homeLocation` use the loose
 * Place form because the precise admin region isn't important and a
 * full `Place` object is overkill for an artist bio.
 *
 * `description` is the same BIO_LEAD constant that ContactView
 * renders as its first visible paragraph (see src/data/bio.ts).
 * Schema and
 * rendered text agree byte-for-byte: Google has no excuse to prefer
 * a third-party gallery snippet over this one when picking the
 * entity description.
 *
 * `mainEntityOfPage` advertises this URL as the entity's home page —
 * the explicit "this domain is the canonical surface for this Person"
 * signal. Combined with `@id` and `url` pointing at the same origin
 * it tightens the entity-home claim that the knowledge panel reads.
 *
 * The IG handle is pulled from `src/data/bio.ts` (CONTACT.instagram =
 * "@beigetype" → "https://www.instagram.com/beigetype/"). The other
 * sameAs URLs come from the SEO brief (Artsy, Helsinki Contemporary,
 * Contemporary Art Library); manual verification of those is listed
 * in REVIEW.md.
 */
export const PERSON_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  additionalType: "VisualArtist",
  "@id": `${SITE_URL}/#person`,
  mainEntityOfPage: SITE_URL,
  name: "Karim Boumjimar",
  url: SITE_URL,
  birthDate: "1998",
  birthPlace: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Málaga",
      addressCountry: "ES",
    },
  },
  nationality: ["Spanish", "Moroccan"],
  homeLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Copenhagen",
      addressCountry: "DK",
    },
  },
  alumniOf: [
    {
      "@type": "CollegeOrUniversity",
      // Billedkunstskolerne — the Fine Arts academy, where Karim's
      // MFA is from. The older `kadk.dk` domain 301s to kglakademi.dk,
      // which is Det Kongelige Akademi — the combined Architecture /
      // Design / Conservation school. Different institution; same
      // umbrella name in Danish ("Det Kongelige …"), easy to confuse.
      // The correct authority for the Fine Arts school is
      // kunstakademiet.dk, page title "Billedkunstskolerne – Det
      // Kongelige Danske Kunstakademi".
      name: "Royal Danish Academy of Fine Arts",
      sameAs: "https://kunstakademiet.dk/",
    },
    {
      "@type": "CollegeOrUniversity",
      name: "Central Saint Martins",
      sameAs: "https://www.arts.ac.uk/colleges/central-saint-martins",
    },
  ],
  jobTitle: "Visual Artist",
  description: BIO_LEAD,
  sameAs: [
    // Wikidata first — the strongest entity anchor for the knowledge
    // panel. The site links here via sameAs and the Wikidata item links
    // back via official website (P856), which is the bidirectional signal
    // Google uses to bind this Person to its panel.
    "https://www.wikidata.org/wiki/Q135780698",
    "https://www.instagram.com/beigetype/",
    "https://www.artsy.net/artist/karim-boumjimar",
    "https://helsinkicontemporary.com/artists/karim-boumjimar",
    "https://www.contemporaryartlibrary.org/artist/karim-boumjimar-34542",
  ],
} as const;
