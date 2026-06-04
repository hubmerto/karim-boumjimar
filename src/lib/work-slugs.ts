import { WORKS } from "@/data/works";
import type { Work } from "@/types/work";

/** ASCII lowercase, accent-stripped, hyphen-separated slug. Strips
 * parentheses and other punctuation: "Symbiosis (MFA)" → "symbiosis-mfa".
 * Same idea as github's repo-slugifier — stable across re-runs, no
 * collisions for any current project title. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Canonical URL slug for a project key. `${title}|${year}` →
 * `${slugified-title}-${year}`. The year suffix disambiguates
 * (hypothetical) titles that repeat across years. */
export function projectKeyToSlug(key: string): string {
  const [title, year] = key.split("|");
  return `${slugify(title)}-${year}`;
}

// Lazily-built reverse map. WORKS is module-scope and never mutates,
// so the map can be cached forever.
let slugToKeyCache: Map<string, string> | null = null;
function slugToKeyMap(): Map<string, string> {
  if (slugToKeyCache) return slugToKeyCache;
  const map = new Map<string, string>();
  const seen = new Set<string>();
  for (const w of WORKS) {
    const key = `${w.title}|${w.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    map.set(projectKeyToSlug(key), key);
  }
  slugToKeyCache = map;
  return map;
}

/** Resolve a URL slug back to its `${title}|${year}` project key, or
 * null if no project matches. */
export function slugToProjectKey(slug: string): string | null {
  return slugToKeyMap().get(slug) ?? null;
}

/** Every project slug currently in WORKS. Used by
 * `generateStaticParams` to enumerate routes for SSG. */
export function allProjectSlugs(): string[] {
  return Array.from(slugToKeyMap().keys());
}

/** All Work entries (one per image) that belong to a project key.
 * Mirrors the lookup the canvas already does at runtime. */
export function worksForKey(key: string): Work[] {
  return WORKS.filter((w) => `${w.title}|${w.year}` === key);
}

/** Friendly medium → caption ("ceramic" → "Ceramic", "mixed" →
 * "Mixed media"). Same labels used in InspectorContent. Inlined here
 * to keep this module free of UI imports — generateMetadata runs at
 * build time and shouldn't pull in client-only modules. */
export function mediumLabel(medium: Work["medium"]): string {
  switch (medium) {
    case "ceramic":
      return "Ceramic";
    case "drawing":
      return "Drawing";
    case "performance":
      return "Performance";
    case "mixed":
      return "Mixed media";
    default:
      return medium;
  }
}
