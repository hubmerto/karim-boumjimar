// One-shot: resize every WebP in public/images/works/ to fit within 800x800,
// re-encode at quality 82. Overwrites in place. Preserves aspect ratio.
//
// Why: 1500px native images decode to ~6-13MB of memory each. With 41 tiles
// all visible at the mobile fit-all view, decoded memory exceeds iOS Safari's
// per-tab budget (~250MB) and the browser kills the tab. 800px max brings
// each decoded image to ~1.7MB (~70MB total) -- safely under the budget.
//
// Run: pnpm exec node scripts/resize-works.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dir = resolve(root, "public/images/works");
const MAX = 800;
const QUALITY = 82;

const files = readdirSync(dir).filter((f) => f.endsWith(".webp"));
const results = [];
for (const f of files) {
  const path = resolve(dir, f);
  const beforeBytes = statSync(path).size;
  const img = sharp(readFileSync(path));
  const meta = await img.metadata();
  const out = await img
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toBuffer();
  writeFileSync(path, out);
  const afterMeta = await sharp(out).metadata();
  results.push({
    id: f.replace(/\.webp$/, ""),
    beforeDim: `${meta.width}x${meta.height}`,
    afterDim: `${afterMeta.width}x${afterMeta.height}`,
    width: afterMeta.width,
    height: afterMeta.height,
    beforeKB: (beforeBytes / 1024).toFixed(0),
    afterKB: (out.length / 1024).toFixed(0),
  });
  console.log(
    `${f}  ${meta.width}x${meta.height} ${(beforeBytes / 1024).toFixed(0)}KB  ->  ${afterMeta.width}x${afterMeta.height} ${(out.length / 1024).toFixed(0)}KB`,
  );
}
writeFileSync(
  resolve(root, "scripts/resized.json"),
  JSON.stringify(results, null, 2),
);
console.log(
  `\n${files.length} files. Total before: ${(results.reduce((a, r) => a + +r.beforeKB, 0) / 1024).toFixed(1)}MB. After: ${(results.reduce((a, r) => a + +r.afterKB, 0) / 1024).toFixed(1)}MB.`,
);
