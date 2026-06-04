import type { Metadata } from "next";

/**
 * Canonical site origin. Falls back to the production www host so that
 * static builds (GitHub Pages mirror) generate canonical URLs pointing
 * at karimboumjimar.com rather than the mirror's own domain — the
 * Vercel site is the single canonical and search engines should treat
 * the mirror as a backup. Override with `NEXT_PUBLIC_SITE_URL` if a
 * different production host is ever set up.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.karimboumjimar.com";

export const SITE_NAME = "Karim Boumjimar";

/** Truncate a description to ≤ `max` characters at a word boundary,
 * preferring a sentence end if one is within the last 25 % of the
 * budget. Trailing punctuation/whitespace is trimmed and an ellipsis
 * appended when truncation actually happened. Used to derive search-
 * engine-safe descriptions from the artist's own long-form copy
 * without ever cutting mid-word. */
export function truncateDescription(text: string, max = 155): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  const slice = collapsed.slice(0, max);
  // Prefer ending at the last sentence boundary in the back quarter
  // of the slice.
  const sentenceCut = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );
  if (sentenceCut > max * 0.75) {
    return slice.slice(0, sentenceCut + 1);
  }
  // Otherwise back up to a word boundary and append an ellipsis.
  const wordCut = slice.lastIndexOf(" ");
  return `${slice.slice(0, wordCut > 0 ? wordCut : max).replace(/[.,;:—\-\s]+$/u, "")}…`;
}

/** Absolute URL for a site-relative path. Empty string → site root.
 * Used for canonical / OG URLs (Google + Facebook want absolute URLs
 * in metadata, not site-root-relative paths). */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Build a per-page Metadata object that inherits the root-layout
 * defaults (favicon, OG images, formatDetection, etc.) and layers a
 * unique title, description, and canonical URL on top. `pathname` is
 * the site-relative URL of the page, used to build the canonical and
 * the openGraph URL. `ogImage`, when set, overrides the root fallback
 * OG image (use the project's lead image for VisualArtwork pages). */
export function pageMetadata(opts: {
  title: string;
  description: string;
  pathname: string;
  ogImage?: { url: string; width: number; height: number; alt: string };
  ogType?: "website" | "article" | "profile";
}): Metadata {
  const url = absoluteUrl(opts.pathname);
  const ogImages = opts.ogImage
    ? [
        {
          url: absoluteUrl(opts.ogImage.url),
          width: opts.ogImage.width,
          height: opts.ogImage.height,
          alt: opts.ogImage.alt,
        },
      ]
    : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: opts.ogType ?? "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: SITE_NAME,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}
