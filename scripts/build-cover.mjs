// Generate a transparent-background PNG of the canvas bento diamond
// to use as a project cover image. Uses sharp for compositing — fast,
// no native compile needed beyond what's already in the lockfile.
//
// Run: pnpm exec node scripts/build-cover.mjs
//
// Output: public/cover.png (transparent, ~1800 × 1300 px)
//
// The layout math mirrors src/components/Canvas.tsx tileOffsets so
// the still matches the diamond the live site renders. Tiles are
// in their REST positions (no swirl) — the cover is the calm
// silhouette of every photograph in the catalog at a glance.

import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Use jiti to load the TS data file directly. Avoids fragile regex
// parsing of works.ts and stays in sync with whatever shape the
// data takes.
const jiti = createJiti(import.meta.url, {
  alias: { "@": resolve(root, "src") },
});
const { WORKS } = await jiti.import(resolve(root, "src/data/works.ts"));

// Same constants Canvas.tsx uses.
// Mirrors BENTO_COL_COUNTS_DESKTOP in src/components/Canvas.tsx —
// keep in sync when projects are added or removed.
const BENTO_COL_COUNTS = [
  3, 4, 5, 7, 8, 9, 11, 13, 13, 13, 11, 9, 8, 7, 5, 4, 3,
];
const BENTO_COL_GAP = 80;
const BENTO_ROW_GAP = 130;
const BENTO_JITTER_X = 25;
const BENTO_JITTER_Y = 25;

// Output spec.
const OUTPUT_LONG_EDGE = 1800; // tighten / loosen for file size
const PADDING_PX = 40; // canvas-space padding around the bento
const OUT_PATH = resolve(root, "public/cover.png");

function balanceColCounts(target, base) {
  const adjusted = [...base];
  const sum = base.reduce((a, b) => a + b, 0);
  const diff = target - sum;
  if (diff === 0) return adjusted;
  const middle = Math.floor(adjusted.length / 2);
  adjusted[middle] = Math.max(1, adjusted[middle] + diff);
  return adjusted;
}

function hash01(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const x = Math.sin(h * 0.0001) * 10000;
  return x - Math.floor(x);
}

function pseudoRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function workBounds(work) {
  const img = work.images[0];
  const aspect =
    img && img.width && img.height ? img.height / img.width : 1;
  const height = work.width * aspect;
  return {
    width: work.width,
    height,
  };
}

async function main() {
  console.log(`Loaded ${WORKS.length} works from src/data/works.ts`);

  const items = WORKS.map((w) => ({
    id: w.id,
    src: w.images[0].src,
    bounds: workBounds(w),
  }));

  // Same deterministic shuffle Canvas.tsx uses so the diamond
  // pattern matches what users see on the live site.
  const ordered = [...items].sort(
    (a, b) => hash01(a.id) - hash01(b.id),
  );
  const maxTileW = ordered.reduce(
    (m, t) => Math.max(m, t.bounds.width),
    0,
  );
  const colSpacing = maxTileW + BENTO_COL_GAP;
  const balancedCounts = balanceColCounts(
    ordered.length,
    BENTO_COL_COUNTS,
  );
  const cols = balancedCounts.length;
  const colCenters = Array.from(
    { length: cols },
    (_, i) => (i - (cols - 1) / 2) * colSpacing,
  );

  // Compute slot positions in canvas-space.
  const positions = [];
  let cursor = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  balancedCounts.forEach((requestedCount, col) => {
    const remaining = ordered.length - cursor;
    const count = Math.min(Math.max(0, requestedCount), remaining);
    if (count === 0) return;
    let stackH = 0;
    for (let j = 0; j < count; j++)
      stackH += ordered[cursor + j].bounds.height;
    stackH += (count - 1) * BENTO_ROW_GAP;
    let y = -stackH / 2;
    for (let j = 0; j < count; j++) {
      const idx = cursor + j;
      const t = ordered[idx];
      const wb = t.bounds;
      const jx = (pseudoRand(idx + 1) - 0.5) * 2 * BENTO_JITTER_X;
      const jy = (pseudoRand(idx + 17) - 0.5) * 2 * BENTO_JITTER_Y;
      const slotCx = colCenters[col] + jx;
      const slotCy = y + wb.height / 2 + jy;
      const left = slotCx - wb.width / 2;
      const top = slotCy - wb.height / 2;
      positions.push({ ...t, left, top });
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (left + wb.width > maxX) maxX = left + wb.width;
      if (top + wb.height > maxY) maxY = top + wb.height;
      y += wb.height + BENTO_ROW_GAP;
    }
    cursor += count;
  });

  // Pick scale so the longer edge of the bento (plus padding) maps
  // to OUTPUT_LONG_EDGE.
  const layoutW = maxX - minX;
  const layoutH = maxY - minY;
  const scale =
    OUTPUT_LONG_EDGE /
    (Math.max(layoutW, layoutH) + PADDING_PX * 2);
  const finalW = Math.round(layoutW * scale + PADDING_PX * 2);
  const finalH = Math.round(layoutH * scale + PADDING_PX * 2);

  // Resize each thumbnail to its target rect, then layer onto a
  // transparent canvas via sharp.composite. We use the 600 px
  // thumbnails (already in /public/images/works/thumbs) — at the
  // cover's scale each tile is small enough that the full-res
  // would just waste cycles.
  console.log(
    `Bento ${Math.round(layoutW)} × ${Math.round(layoutH)} canvas-px → ${finalW} × ${finalH} output`,
  );
  const composites = [];
  for (const p of positions) {
    const x = Math.round((p.left - minX) * scale + PADDING_PX);
    const y = Math.round((p.top - minY) * scale + PADDING_PX);
    const w = Math.max(1, Math.round(p.bounds.width * scale));
    const h = Math.max(1, Math.round(p.bounds.height * scale));

    // Path resolution: src is /images/works/<file>; we want the
    // 600 px thumb at /images/works/thumbs/<file>.
    const fileName = basename(p.src);
    const thumbPath = resolve(
      root,
      "public/images/works/thumbs",
      fileName,
    );

    try {
      const buffer = await sharp(thumbPath)
        .resize(w, h, { fit: "fill" })
        .toBuffer();
      composites.push({ input: buffer, left: x, top: y });
    } catch (e) {
      console.warn(`  skip ${p.id}: ${e.message}`);
    }
  }
  console.log(`Compositing ${composites.length} tiles…`);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  await sharp({
    create: {
      width: finalW,
      height: finalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(OUT_PATH);

  console.log(`✓ Cover saved → ${OUT_PATH.replace(root + "/", "")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
