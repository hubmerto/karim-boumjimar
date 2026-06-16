import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";

// Required so Next can prerender this route handler under
// `output: "export"` (the GitHub Pages mirror build).
export const dynamic = "force-static";

// Routes the site exposes. About / Bio / News / Grant / Imprint / Privacy
// are now real, individually addressable pages (each with its own
// canonical and title), in addition to the home canvas at `/`. The
// /pixi renderer demo and /showcase prototypes are intentionally left
// out (and disallowed in robots.ts) so only canonical content is listed.
const PATHS = ["", "/about", "/bio", "/news", "/grant", "/imprint", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1.0 : 0.7,
  }));
}
