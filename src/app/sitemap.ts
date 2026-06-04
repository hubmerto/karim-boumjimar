import type { MetadataRoute } from "next";
import { allProjectSlugs } from "@/lib/work-slugs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";

// Required so Next can prerender this route handler under
// `output: "export"` (the GitHub Pages mirror build).
export const dynamic = "force-static";

// Top-level navigation. About / Bio / News / Grant each have real
// /about, /bio, /news, /grant routes now (server-rendered shells
// wrapping the client view) so their own metadata + canonical lives
// at the listed URL — search engines should index them directly.
const TOP_LEVEL_PATHS = [
  "",
  "/about",
  "/bio",
  "/news",
  "/grant",
  "/imprint",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const projectEntries = allProjectSlugs().map((slug) => ({
    url: `${SITE_URL}/works/${slug}`,
    lastModified,
    // Projects evolve as new images / press are added but the
    // canonical URL itself is stable; monthly is plenty.
    changeFrequency: "monthly" as const,
    // Below the home page (1.0) and the top-level nav (0.7), but
    // above per-photo or per-credit endpoints would be if they
    // existed. Individual projects matter for long-tail queries
    // ("karim boumjimar pandemonium paradiso") so they're not
    // demoted further.
    priority: 0.6,
  }));
  const topLevelEntries = TOP_LEVEL_PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1.0 : 0.7,
  }));
  return [...topLevelEntries, ...projectEntries];
}
