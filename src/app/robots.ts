import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";

// Required so Next can prerender this route handler under
// `output: "export"` (the GitHub Pages mirror build).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Internal dev-demo routes (interaction prototypes) and the
        // standalone Pixi renderer demo. They duplicate or fragment the
        // real content and should never surface in search.
        disallow: ["/showcase/", "/pixi"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
