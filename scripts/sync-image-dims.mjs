// Read every public/images/works/*.webp, look up its current width/
// height, and patch the matching `width:` / `height:` in src/data/
// works.ts so they reflect the new 1600px assets.
//
// We patch surgically (one image entry at a time) rather than
// regenerating works.ts, so positions/clusters stay exactly as
// tuned.
//
// Run: pnpm exec node scripts/sync-image-dims.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const worksDir = resolve(root, "public/images/works");
const dataPath = resolve(root, "src/data/works.ts");

const files = readdirSync(worksDir).filter((f) => f.endsWith(".webp"));
let txt = readFileSync(dataPath, "utf8");
let patched = 0;

for (const f of files) {
  const id = f.replace(/\.webp$/, "");
  const meta = await sharp(resolve(worksDir, f)).metadata();
  const w = meta.width;
  const h = meta.height;
  if (!w || !h) continue;

  // Find the image entry in works.ts: matches the src of this file
  // and the next two lines that have width/height.
  const re = new RegExp(
    String.raw`(src:\s*"\/images\/works\/${id}\.webp",\s*\n\s*alt:\s*"[^"]*",\s*\n\s*width:\s*)(\d+)(,\s*\n\s*height:\s*)(\d+)`,
    "m",
  );
  const next = txt.replace(re, (_, p1, _w, p3) => `${p1}${w}${p3}${h}`);
  if (next !== txt) {
    patched++;
    txt = next;
  } else {
    console.warn(`  no match for ${id}`);
  }
}

writeFileSync(dataPath, txt);
console.log(`Patched ${patched} of ${files.length} entries.`);
