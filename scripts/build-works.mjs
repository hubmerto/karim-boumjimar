// Combine curated.json + processed.json, assign canvas positions/widths, emit src/data/works.ts.
//
// Layout: each exhibition has a cluster center on the canvas (-4000..+4000 each axis).
// Works inside a cluster are placed in a small spiral around that center, scaled by their
// own physical width and the image aspect ratio. Drawings live on the left half,
// ceramics on the right, earlier works (2021-2024) tucked into the corners.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const curated = JSON.parse(readFileSync(resolve(root, "scripts/curated.json"), "utf8"));
const processed = JSON.parse(readFileSync(resolve(root, "scripts/processed.json"), "utf8"));
const dimsById = new Map(processed.map((p) => [p.id, p]));

// Cluster anchors organised in 4 rough rows so bbox-vs-bbox checks pass.
// (x, y) is the cluster centre. "tile" is the per-tile width at zoom 1.
// "cols" controls rows-vs-cols inside the cluster (the rest wrap to a new row).
const CLUSTERS = {
  // Top row (y ≈ -2400)
  liljevalchs:     { x: -3200, y: -2400, tile: 420, cols: 2, label: "Stockholm Cosmologies", year: 2026, venue: "Liljevalchs Konsthall", city: "Stockholm" },
  moestings:       { x: -1300, y: -2400, tile: 520, cols: 2, label: "Bodies Under Construction", year: 2026, venue: "Møstings, The Frederiksberg Museums", city: "Copenhagen", photo: "Mikkel Kaldal" },
  deepcuts:        { x:   800, y: -2400, tile: 460, cols: 3, label: "Deep Cuts", year: 2025, venue: "CFHILL", city: "Stockholm", date: "14 Nov - 30 Dec 2025" },
  mouths:          { x:  3000, y: -2400, tile: 440, cols: 3, label: "Mouths, Vessels, Portals", year: 2025, venue: "Alice Folker Gallery", city: "Copenhagen" },

  // Middle row (y ≈ 0): the headline ceramic exhibitions.
  drawing:         { x: -2900, y:     0, tile: 440, cols: 2, label: "Drawings", year: 2025 },
  pandemonium:     { x:  -500, y:     0, tile: 580, cols: 3, label: "Pandemonium Paradiso", year: 2025, venue: "O-Overgaden", city: "Copenhagen", date: "29 Aug - 26 Oct 2025", photo: "David Stjernholm" },
  beauty:          { x:  2800, y:     0, tile: 560, cols: 3, label: "Beauty is the Best Defense", year: 2026, venue: "Jessica Silverman", city: "San Francisco", photo: "Phillip Maisel" },

  // Bottom-mid row (y ≈ 1900): grad show + Birds of Paradise + early works
  kultuur:         { x: -3200, y:  1700, tile: 420, cols: 2, label: "Kultuur", year: 2025, venue: "TINA Gallery", city: "London" },
  symbiosis:       { x: -1300, y:  1900, tile: 500, cols: 2, label: "Symbiosis (MFA)", year: 2025, venue: "Royal Danish Academy of Fine Arts", city: "Copenhagen", photo: "David Stjernholm" },
  birdsofparadise: { x:  1500, y:  1900, tile: 480, cols: 3, label: "Birds of Paradise", year: 2026, venue: "Viborg Kunsthal", city: "Viborg", photo: "Jacob Friis-Holm Nielsen" },

  // Bottom row (y ≈ 3100): older work tucked into the lower edge
  fearandfauna:    { x: -3200, y:  3100, tile: 420, cols: 2, label: "Spring Has Arrived", year: 2023, venue: "Dag H 42 / ARIEL", city: "Copenhagen" },
  glory:           { x: -1300, y:  3100, tile: 420, cols: 2, label: "Glory on Earth", year: 2024, venue: "O Days Festival", city: "Copenhagen", photo: "Robert Damisch" },
  overgaden:       { x:  1500, y:  3100, tile: 420, cols: 2, label: "Psychopathia Sexualis", year: 2021, venue: "Overgaden", city: "Copenhagen" },
};

// Cheap deterministic hash → small float in [-1, 1] for jitter.
function hashJitter(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/**
 * Grid layout inside a cluster. Tiles are arranged in a row-major grid with
 * `cols` tiles per row. Each cell is `tile + gap` wide and `tile + gap` tall
 * (using `tile` as a square allowance - actual tile heights are aspect-driven
 * but for a layout grid we just pad uniformly to avoid overlap).
 * Returns {dx, dy} offsets from cluster centre.
 */
function gridSlot(n, total, cols, tile) {
  const gap = Math.round(tile * 0.22);
  const cellW = tile + gap;
  const cellH = tile + gap;
  const rows = Math.ceil(total / cols);
  const col = n % cols;
  const row = Math.floor(n / cols);
  // Centre the grid: total width = cols*cellW - gap, total height = rows*cellH - gap
  const gridW = cols * cellW - gap;
  const gridH = rows * cellH - gap;
  return {
    dx: col * cellW - gridW / 2 + tile / 2,
    dy: row * cellH - gridH / 2 + tile / 2,
  };
}

// Group curated entries by slug
const bySlug = new Map();
for (const it of curated) {
  if (!bySlug.has(it.slug)) bySlug.set(it.slug, []);
  bySlug.get(it.slug).push(it);
}

const works = [];
for (const [slug, items] of bySlug) {
  const c = CLUSTERS[slug];
  if (!c) {
    console.warn(`! no cluster defined for slug: ${slug} - skipping`);
    continue;
  }
  const total = items.length;
  items.forEach((it, n) => {
    const dims = dimsById.get(it.id);
    if (!dims) {
      console.warn(`! no processed image for ${it.id}`);
      return;
    }
    const { dx, dy } = gridSlot(n, total, c.cols, c.tile);
    // Tiny per-tile jitter so the cluster doesn't read as a perfect grid;
    // capped at ~6% of tile so it never crosses into a neighbour's cell.
    const jx = hashJitter(it.id + "x") * c.tile * 0.06;
    const jy = hashJitter(it.id + "y") * c.tile * 0.06;
    const sizeJitter = 1 + hashJitter(it.id + "s") * 0.08;
    const width = Math.round(c.tile * sizeJitter);

    // The dossier-named MFA pieces appear on /symbiosis. We can't pick them by image
    // (sitemap titles don't disambiguate within a show), so we lean on the cluster
    // label and rely on the venue/year/photo metadata.
    const work = {
      id: it.id,
      title: c.label,
      year: c.year,
      medium: it.medium,
      venue: c.venue,
      city: c.city,
      date: c.date,
      // Cluster-level photo credit is the canonical one; per-image filenames
      // are too inconsistent to parse reliably (Squarespace size suffixes,
      // photographer-only strings, capture-device codes).
      photoCredit: c.photo,
      images: [
        {
          src: `/images/works/${it.id}.webp`,
          alt: it.caption || `${c.label}, ${c.year ?? ""}`.trim(),
          width: dims.width,
          height: dims.height,
        },
      ],
      position: {
        x: Math.round(c.x + dx + jx),
        y: Math.round(c.y + dy + jy),
      },
      width,
    };
    works.push(work);
  });
}

// Render TS literal
function ts(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${pad}  ${ts(v, indent + 1)}`).join(",\n");
    return `[\n${items},\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== "");
    if (entries.length === 0) return "{}";
    const items = entries
      .map(([k, v]) => `${pad}  ${k}: ${ts(v, indent + 1)}`)
      .join(",\n");
    return `{\n${items},\n${pad}}`;
  }
  return JSON.stringify(value);
}

const header = `import type { Work } from "@/types/work";

/**
 * Canvas coordinates use a -4000..+4000 range on each axis (origin at center).
 * Drawings cluster left of center; ceramics right; earlier work in the corners.
 * \`width\` is rendered width on the canvas at zoom 1, in CSS pixels.
 *
 * Generated by scripts/build-works.mjs from scripts/curated.json + processed.json.
 */
export const WORKS: Work[] = `;

const body = ts(works) + ";\n";
writeFileSync(resolve(root, "src/data/works.ts"), header + body);
console.log(`Wrote src/data/works.ts with ${works.length} works`);

// Sanity report
const sums = {};
for (const w of works) {
  const k = `${w.medium}:${w.title}`;
  sums[k] = (sums[k] || 0) + 1;
}
console.log("Per-cluster counts:");
for (const [k, n] of Object.entries(sums)) console.log(`  ${k}: ${n}`);

const xs = works.map((w) => w.position.x);
const ys = works.map((w) => w.position.y);
console.log(`x range: ${Math.min(...xs)} .. ${Math.max(...xs)}`);
console.log(`y range: ${Math.min(...ys)} .. ${Math.max(...ys)}`);

// Sanity check: cluster bboxes should not overlap each other.
const clusterBoxes = [];
for (const [slug, items] of bySlug) {
  const c = CLUSTERS[slug];
  if (!c) continue;
  const total = items.length;
  // Approximate the cluster's bbox using the same grid math as gridSlot.
  const gap = Math.round(c.tile * 0.22);
  const cellW = c.tile + gap;
  const cellH = c.tile + gap;
  const rows = Math.ceil(total / c.cols);
  const usedCols = Math.min(c.cols, total);
  const gridW = usedCols * cellW - gap;
  const gridH = rows * cellH - gap;
  const pad = 60; // matches GroupOutline pad
  const minX = c.x - gridW / 2 - pad;
  const maxX = c.x + gridW / 2 + pad;
  const minY = c.y - gridH / 2 - pad;
  const maxY = c.y + gridH / 2 + pad;
  clusterBoxes.push({ slug, minX, maxX, minY, maxY });
}
let overlapCount = 0;
for (let i = 0; i < clusterBoxes.length; i++) {
  for (let j = i + 1; j < clusterBoxes.length; j++) {
    const a = clusterBoxes[i];
    const b = clusterBoxes[j];
    const overlapX = a.minX < b.maxX && a.maxX > b.minX;
    const overlapY = a.minY < b.maxY && a.maxY > b.minY;
    if (overlapX && overlapY) {
      console.warn(`! cluster overlap: ${a.slug} <-> ${b.slug}`);
      overlapCount++;
    }
  }
}
console.log(overlapCount === 0 ? "no cluster overlaps detected" : `WARNING: ${overlapCount} cluster overlaps`);
