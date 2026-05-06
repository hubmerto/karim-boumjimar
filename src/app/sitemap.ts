import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";

// Routes the site exposes. About / Bio / News / Grant currently live
// inside the single SPA at `/` (the LeftToolbar swaps the view via
// Zustand state) — they're listed here so search engines and link
// previews still surface the canonical URLs once we add real
// /about, /bio, /news, /grant routes (or once we wire client-side
// routing for them). For now they all resolve to the same page.
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
