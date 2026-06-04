import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESCRIPTIONS } from "@/data/descriptions";
import { absoluteUrl, pageMetadata, SITE_URL } from "@/lib/seo";
import {
  allProjectSlugs,
  mediumLabel,
  slugToProjectKey,
  worksForKey,
} from "@/lib/work-slugs";
import { WorkRouteClient } from "./WorkRouteClient";

type Params = Promise<{ slug: string }>;

/** Pre-render one route per project at build time. Static export
 * (GitHub Pages mirror) needs this; on Vercel it's still a free win —
 * the project pages get HTML-cached at the edge instead of running
 * the server component on every hit. */
export function generateStaticParams(): { slug: string }[] {
  return allProjectSlugs().map((slug) => ({ slug }));
}

/** Build the description shown in search results + OG cards. Prefers
 * the project's own body text (first sentence, truncated to 155 chars)
 * over a constructed fallback — the artist's voice ranks better than
 * a templated "Project at Venue, Year" string. */
function buildDescription(projectKey: string): string {
  const desc = DESCRIPTIONS[projectKey];
  if (desc?.body) {
    // First paragraph; cap at ~155 chars for SERP comfort, breaking
    // at a sentence boundary if one's available, otherwise a word.
    const firstParagraph = desc.body.split(/\n\n/)[0].trim();
    if (firstParagraph.length <= 155) return firstParagraph;
    const slice = firstParagraph.slice(0, 155);
    const sentenceCut = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
    );
    if (sentenceCut > 100) return slice.slice(0, sentenceCut + 1);
    const wordCut = slice.lastIndexOf(" ");
    return `${slice.slice(0, wordCut > 0 ? wordCut : 155).replace(/[.,;:—\-\s]+$/u, "")}…`;
  }
  // Fallback when no body copy exists for this project (yet). Built
  // from the structured fields the canvas already shows in its panel —
  // medium, venue, city — so it's still specific even without prose.
  const works = worksForKey(projectKey);
  const w = works[0];
  if (!w) return "Project by Karim Boumjimar.";
  const parts: string[] = [];
  parts.push(mediumLabel(w.medium));
  if (w.venue) parts.push(w.venue);
  if (w.city) parts.push(w.city);
  parts.push(String(w.year));
  return `${parts.join(", ")}. By Karim Boumjimar.`;
}

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug } = await params;
  const projectKey = slugToProjectKey(slug);
  if (!projectKey) return {};
  const [title, year] = projectKey.split("|");
  const works = worksForKey(projectKey);
  const lead = works[0];
  return pageMetadata({
    title: `${title} (${year}) — Karim Boumjimar`,
    description: buildDescription(projectKey),
    pathname: `/works/${slug}`,
    ogType: "article",
    // Lead image at its real dimensions. Slack / Twitter / Discord
    // crop to their preferred ratio; landscape installation shots
    // (most of the works are landscape) survive that crop better than
    // the fallback square OG. WorkImage.width/height are technically
    // optional in the type; the only entries currently missing them
    // would lose the dimensions hint, so we fall back through to the
    // root layout's OG-image trio instead of shipping a card without
    // sizes (which some clients refuse to crop).
    ...(lead?.images[0]?.width && lead.images[0].height
      ? {
          ogImage: {
            url: lead.images[0].src,
            width: lead.images[0].width,
            height: lead.images[0].height,
            alt: `${title} (${year}) — installation view`,
          },
        }
      : {}),
  });
}

/** Schema.org VisualArtwork. Only the fields the content actually
 * provides — no invented attribution, no guessed dimensions, no
 * speculative materials beyond the `medium` we already store. Linked
 * back to the Person via `@id` so Google reconciles
 * project ↔ creator without us repeating the artist bio. */
function buildVisualArtworkJsonLd(projectKey: string) {
  const [title, year] = projectKey.split("|");
  const works = worksForKey(projectKey);
  const w = works[0];
  const slug = allProjectSlugs().find(
    (s) => slugToProjectKey(s) === projectKey,
  );
  const projectUrl = absoluteUrl(`/works/${slug}`);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": `${projectUrl}#artwork`,
    name: title,
    url: projectUrl,
    dateCreated: String(year),
    creator: { "@id": `${SITE_URL}/#person` },
  };
  if (w) {
    data.artMedium = mediumLabel(w.medium);
    if (w.venue || w.city) {
      data.locationCreated = {
        "@type": "Place",
        ...(w.venue ? { name: w.venue } : {}),
        ...(w.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: w.city,
              },
            }
          : {}),
      };
    }
    if (w.images[0]) {
      data.image = absoluteUrl(w.images[0].src);
    }
  }
  return data;
}

export default async function WorkPage({ params }: { params: Params }) {
  const { slug } = await params;
  const projectKey = slugToProjectKey(slug);
  // Unknown slug: real 404 (not soft-200). Next.js renders the
  // closest not-found boundary and the response is HTTP 404, which
  // is what crawlers expect.
  if (!projectKey) notFound();
  const artworkJsonLd = buildVisualArtworkJsonLd(projectKey);
  return (
    <WorkRouteClient projectKey={projectKey} artworkJsonLd={artworkJsonLd} />
  );
}
