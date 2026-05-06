// Generate small thumbnails for the canvas bento. The full-res
// 2400px webps in public/images/works/ stay as-is for the gallery
// (ExpandedGroup) but were also being served on the bento overview,
// where each tile renders at ~80-300px on screen — wasted bytes.
//
// This emits 600px webps to public/images/works/thumbs/<id>.webp.
// 600px is enough to look crisp on the bento at typical mobile + retina-
// desktop zoom, while shaving the initial-load payload roughly 5x.
//
// Run: pnpm exec node scripts/build-thumbs.mjs
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcDir = resolve(root, "public/images/works");
const outDir = resolve(root, "public/images/works/thumbs");
mkdirSync(outDir, { recursive: true });

const MAX = 600;
const QUALITY = 78;

const files = readdirSync(srcDir).filter(
  (f) => f.endsWith(".webp") && statSync(resolve(srcDir, f)).isFile(),
);

let totalIn = 0;
let totalOut = 0;
for (const f of files) {
  const inPath = resolve(srcDir, f);
  const outPath = resolve(outDir, f);
  const inBuf = readFileSync(inPath);
  const out = await sharp(inBuf, { failOn: "none" })
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toBuffer();
  writeFileSync(outPath, out);
  totalIn += inBuf.length;
  totalOut += out.length;
}

console.log(
  `\n${files.length} thumbnails written. ${(totalIn / 1024 / 1024).toFixed(1)}MB full -> ${(totalOut / 1024 / 1024).toFixed(1)}MB thumbs.`,
);
