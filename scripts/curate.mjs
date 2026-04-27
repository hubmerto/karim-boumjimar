// Curate a working set of images from the scraped sitemap manifest.
// Output: a JSON list of {slug, idx, url, title, caption, photographer, year} entries
// to be downloaded by `download.mjs` and processed by `to-webp.mjs`.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const manifest = JSON.parse(readFileSync("/tmp/manifest.json", "utf8"));
const bySlug = new Map(manifest.map((p) => [p.slug, p]));

// (slug, indices, mediumOverride?) — picks spread across each exhibition.
// indices reference the order images appear in the sitemap.
const CURATION = [
  // Major recent ceramic exhibitions
  ["pandemonium", [0, 4, 10, 22, 30], "ceramic"],
  ["beauty", [0, 5, 12, 24, 35], "ceramic"],
  ["moestings", [0, 4, 10, 16], "ceramic"],
  ["birdsofparadise", [0, 6, 12], "ceramic"],
  ["symbiosis", [0, 4, 10, 18], "ceramic"],
  ["mouths", [0, 3, 6], "ceramic"],
  ["deepcuts", [0, 3, 6], "ceramic"],
  ["liljevalchs", [0, 3], "ceramic"],
  ["kultuur", [0, 14], "ceramic"],
  // Drawings and earlier installations
  ["drawing", [0, 5, 10, 14], "drawing"],
  ["fearandfauna", [0, 8], "drawing"],
  ["glory", [0, 8], "ceramic"],
  ["overgaden", [0, 4], "performance"],
];

// Decode and parse a Squarespace filename like:
// `Beauty+is+the+Best+Defense,+2026_Jessica+Silverman,+San+Francisco,+CA_Installation+view+10_Phillip+Maisel.jpg`
function parseFilename(url) {
  const tail = url.split("/").pop().split("?")[0];
  const decoded = decodeURIComponent(tail).replace(/\+/g, " ");
  const stem = decoded.replace(/\.(jpe?g|png|webp|JPG|JPEG|PNG)$/i, "");
  const parts = stem.split("_").map((s) => s.trim());
  // Heuristic: many follow [Title, Year]_[Venue, City, Region]_[ViewLabel]_[Photographer]
  const result = {};
  if (parts.length >= 1) {
    const m = parts[0].match(/^(.+?),\s*(\d{4})\s*$/);
    if (m) {
      result.title = m[1];
      result.year = Number(m[2]);
    } else {
      result.title = parts[0];
    }
  }
  if (parts.length >= 2) {
    result.venueRaw = parts[1];
  }
  if (parts.length >= 3) {
    result.viewLabel = parts[2];
  }
  if (parts.length >= 4) {
    result.photographer = parts[parts.length - 1];
  }
  result.rawStem = stem;
  return result;
}

const items = [];
for (const [slug, indices, medium] of CURATION) {
  const page = bySlug.get(slug);
  if (!page) {
    console.warn(`! missing page: ${slug}`);
    continue;
  }
  indices.forEach((i, n) => {
    const img = page.images[i];
    if (!img) {
      console.warn(`! ${slug} index ${i} OOB (have ${page.images.length})`);
      return;
    }
    const meta = parseFilename(img.url);
    items.push({
      id: `${slug}-${String(n + 1).padStart(2, "0")}`,
      slug,
      sourceIndex: i,
      url: img.url,
      sitemapTitle: img.title,
      caption: img.caption,
      medium,
      ...meta,
    });
  });
}

writeFileSync(
  resolve(root, "scripts/curated.json"),
  JSON.stringify(items, null, 2),
);
console.log(`Curated ${items.length} items -> scripts/curated.json`);
console.log("First few:");
for (const it of items.slice(0, 3)) {
  console.log(`  ${it.id} | ${it.title || it.sitemapTitle} | ${it.year ?? "?"} | ${it.photographer ?? "?"}`);
}
