// Build src/data/works.ts and src/data/descriptions.ts from scripts/imported.json.
// Each exhibition becomes a cluster on the canvas; tiles inside a cluster are
// arranged in a grid centred on the cluster anchor.
//
// Run: pnpm exec node scripts/build-works-v2.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const imported = JSON.parse(
  readFileSync(resolve(root, "scripts/imported.json"), "utf8"),
);

// (x, y) is the cluster centre. tile is per-tile width at zoom 1.
// cols controls how the per-cluster grid wraps. medium controls
// "drawing" vs "ceramic" (just metadata for the existing pipeline).
//
// Layout target: 3 rows of clusters. Big shows (10+ tiles) get more cols
// so they're wider but not as tall, and rows are spaced ~3600 apart so
// even the biggest cluster doesn't overlap its neighbour above/below.
// Each cluster grid is sized so it stays within at most 3 rows (cols
// = ceil(N / 3) for N > 3). The result is wide-and-short clusters that
// fill the viewport horizontally when focused, instead of narrow tall
// columns.
const CLUSTERS = {
  // Row 1 (y -3500) -- 5 smaller / 2026 shows
  beauty:          { x: -7000, y: -3500, tile: 460, cols: 3, medium: "ceramic",
                     label: "Beauty is the Best Defense", year: 2026,
                     venue: "Jessica Silverman", city: "San Francisco",
                     date: "5 March - 11 April 2026", photo: "Phillip Maisel" },
  liljevalchs:     { x: -4500, y: -3500, tile: 440, cols: 3, medium: "ceramic",
                     label: "Stockholm Cosmologies", year: 2026,
                     venue: "Liljevalchs Konsthall", city: "Stockholm",
                     date: "21 Nov 2025 - 11 Jan 2026" },
  birdsofparadise: { x: -1500, y: -3500, tile: 440, cols: 4, medium: "ceramic",
                     label: "Birds of Paradise", year: 2026,
                     venue: "Viborg Kunsthal", city: "Viborg",
                     date: "23 Jan - 10 May 2026" },
  deepcuts:        { x:  2000, y: -3500, tile: 460, cols: 3, medium: "ceramic",
                     label: "Deep Cuts", year: 2025,
                     venue: "CFHILL", city: "Stockholm",
                     date: "14 Nov - 30 Dec 2025" },
  glory:           { x:  5000, y: -3500, tile: 420, cols: 4, medium: "ceramic",
                     label: "Glory on Earth", year: 2024,
                     venue: "O Days Festival", city: "Copenhagen", photo: "Robert Damisch" },

  // Row 2 (y 0) -- 3 big headline solos, very wide layouts
  moestings:       { x: -5500, y:     0, tile: 460, cols: 7, medium: "ceramic",
                     label: "Bodies Under Construction", year: 2026,
                     venue: "Møstings, The Frederiksberg Museums", city: "Copenhagen",
                     date: "28 March - 7 June 2026", photo: "Mikkel Kaldal" },
  pandemonium:     { x:     0, y:     0, tile: 540, cols: 5, medium: "ceramic",
                     label: "Pandemonium Paradiso", year: 2025,
                     venue: "O-Overgaden Institute of Contemporary Art", city: "Copenhagen",
                     date: "29 Aug - 26 Oct 2025", photo: "David Stjernholm" },
  rites:           { x:  5500, y:     0, tile: 460, cols: 5, medium: "ceramic",
                     label: "Rites of Affection", year: 2026,
                     venue: "Malva Museum", city: "Lahti",
                     date: "10 April - 13 September 2026", photo: "Juuso Noronkoski" },

  // Row 3 (y 3500) -- 5 collaborative / earlier shows
  drawing:         { x: -7500, y:  3500, tile: 440, cols: 4, medium: "drawing",
                     label: "Drawings", year: 2025 },
  symbiosis:       { x: -4500, y:  3500, tile: 480, cols: 3, medium: "ceramic",
                     label: "Symbiosis (MFA)", year: 2025,
                     venue: "Kunsthal Charlottenborg / Royal Danish Academy", city: "Copenhagen",
                     date: "12 April - 10 August 2025", photo: "David Stjernholm" },
  kultuur:         { x: -1500, y:  3500, tile: 420, cols: 4, medium: "ceramic",
                     label: "Kultuur", year: 2025,
                     venue: "TINA Gallery", city: "London",
                     date: "16 January - 1 March 2025" },
  fearandfauna:    { x:  1500, y:  3500, tile: 420, cols: 3, medium: "ceramic",
                     label: "Spring Has Arrived", year: 2023,
                     venue: "Dag H 42 / ARIEL - Feminisms in the Aesthetics", city: "Copenhagen",
                     date: "4 May - 17 June 2023", photo: "Malle Madsen" },
  queer:           { x:  4500, y:  3500, tile: 420, cols: 4, medium: "ceramic",
                     label: "Queer Ecologies", year: 2023,
                     venue: "Centre d'Art La Panera", city: "Lleida",
                     date: "28 Oct 2023 - 28 Jan 2024" },
};

function hashJitter(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

// Max tile aspect (portrait): 800/533 ≈ 1.5. Cell height accommodates the
// tallest possible tile so portrait images don't overflow into the row below.
const MAX_ASPECT = 1.55;

function gridSlot(n, total, cols, tile) {
  const gap = Math.round(tile * 0.22);
  const cellW = tile + gap;
  const cellH = Math.round(tile * MAX_ASPECT) + gap;
  const rows = Math.ceil(total / cols);
  const col = n % cols;
  const row = Math.floor(n / cols);
  const gridW = cols * cellW - gap;
  const gridH = rows * cellH - gap;
  return {
    dx: col * cellW - gridW / 2 + tile / 2,
    dy: row * cellH - gridH / 2 + Math.round(tile * MAX_ASPECT) / 2,
  };
}

const works = [];
const descriptions = {};

for (const exhibition of imported) {
  const c = CLUSTERS[exhibition.slug];
  if (!c) {
    console.warn(`! no cluster defined for slug: ${exhibition.slug} (${exhibition.folder}) -- skipping`);
    continue;
  }
  const total = exhibition.images.length;
  exhibition.images.forEach((img, n) => {
    const { dx, dy } = gridSlot(n, total, c.cols, c.tile);
    const jx = hashJitter(img.id + "x") * c.tile * 0.06;
    const jy = hashJitter(img.id + "y") * c.tile * 0.06;
    const sizeJitter = 1 + hashJitter(img.id + "s") * 0.08;
    const width = Math.round(c.tile * sizeJitter);

    works.push({
      id: img.id,
      title: c.label,
      year: c.year,
      medium: c.medium,
      venue: c.venue,
      city: c.city,
      date: c.date,
      photoCredit: c.photo,
      images: [
        {
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
        },
      ],
      position: {
        x: Math.round(c.x + dx + jx),
        y: Math.round(c.y + dy + jy),
      },
      width,
    });
  });

  // Descriptions are keyed by `${title}|${year}` to match the existing
  // ProjectPanel lookup in the app.
  if (exhibition.description) {
    const key = `${c.label}|${c.year}`;
    descriptions[key] = exhibition.description;
  }
}

// ---- emit src/data/works.ts ----

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
      .map(([k, v]) => {
        // Quote keys that aren't valid JS identifiers.
        const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `${pad}  ${key}: ${ts(v, indent + 1)}`;
      })
      .join(",\n");
    return `{\n${items},\n${pad}}`;
  }
  return JSON.stringify(value);
}

const worksHeader = `import type { Work } from "@/types/work";

/**
 * Canvas coordinates use a -4000..+6000 range. Clusters anchored on a 4-row
 * layout. Generated by scripts/build-works-v2.mjs from scripts/imported.json.
 */
export const WORKS: Work[] = `;

writeFileSync(
  resolve(root, "src/data/works.ts"),
  worksHeader + ts(works) + ";\n",
);

// ---- emit src/data/descriptions.ts ----

const descHeader = `// Long-form per-exhibition descriptions. Keyed by \`\${title}|\${year}\`.
// Generated by scripts/build-works-v2.mjs from scripts/imported.json.

export const DESCRIPTIONS: Record<string, string> = `;

const descFooter = `

export function descriptionFor(title: string, year: number | string): string | undefined {
  return DESCRIPTIONS[\`\${title}|\${year}\`];
}
`;

writeFileSync(
  resolve(root, "src/data/descriptions.ts"),
  descHeader + ts(descriptions) + ";\n" + descFooter,
);

// ---- sanity ----

console.log(`Wrote src/data/works.ts with ${works.length} works`);
console.log(`Wrote src/data/descriptions.ts with ${Object.keys(descriptions).length} descriptions`);

const xs = works.map((w) => w.position.x);
const ys = works.map((w) => w.position.y);
console.log(`x range: ${Math.min(...xs)} .. ${Math.max(...xs)}`);
console.log(`y range: ${Math.min(...ys)} .. ${Math.max(...ys)}`);

// Cluster overlap check
const boxes = [];
for (const exhibition of imported) {
  const c = CLUSTERS[exhibition.slug];
  if (!c) continue;
  const total = exhibition.images.length;
  const gap = Math.round(c.tile * 0.22);
  const cellW = c.tile + gap;
  const cellH = Math.round(c.tile * MAX_ASPECT) + gap;
  const rows = Math.ceil(total / c.cols);
  const usedCols = Math.min(c.cols, total);
  const gridW = usedCols * cellW - gap;
  const gridH = rows * cellH - gap;
  const pad = 80;
  boxes.push({
    slug: exhibition.slug,
    minX: c.x - gridW / 2 - pad,
    maxX: c.x + gridW / 2 + pad,
    minY: c.y - gridH / 2 - pad,
    maxY: c.y + gridH / 2 + pad,
  });
}
let overlaps = 0;
for (let i = 0; i < boxes.length; i++) {
  for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i];
    const b = boxes[j];
    if (a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY) {
      console.warn(`! cluster overlap: ${a.slug} (${a.minX.toFixed(0)},${a.minY.toFixed(0)}..${a.maxX.toFixed(0)},${a.maxY.toFixed(0)}) <-> ${b.slug} (${b.minX.toFixed(0)},${b.minY.toFixed(0)}..${b.maxX.toFixed(0)},${b.maxY.toFixed(0)})`);
      overlaps++;
    }
  }
}
console.log(overlaps === 0 ? "no cluster overlaps" : `WARNING: ${overlaps} cluster overlaps`);
