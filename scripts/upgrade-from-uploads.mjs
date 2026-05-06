// One-shot: re-encode the works in public/images/works from the
// high-res sources Karim sent in the WEBSITE UPLOADS folder.
//
// For each upload folder we know the matching slug (e.g.
// "01_beauty-is-the-best-defense" -> "beauty"). We list the image
// files in each upload folder in order, list the existing
// public/images/works files for that slug in order, and pair them
// 1:1 up to the smaller count. Each source is decoded with sharp
// (so .webp / .jpg / .tif and the weird .webp_new.jpg / .webp_new.tif
// extensions all work the same), resized to fit MAX, encoded as
// webp at QUALITY, and written over the existing file.
//
// Run: pnpm exec node scripts/upgrade-from-uploads.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const worksDir = resolve(root, "public/images/works");

// Edit if you move the uploads folder. Has the giant emoji name.
const UPLOADS_BASE =
  "/Users/humbertoimac/Downloads/(ﾉ◕ヮ◕)ﾉ_･ﾟ✧ WEBSITE UPLOADS (◠‿◠✿)/01_images";

// Cap at 3500px on the long edge — visibly sharper on retina /
// 5K displays. The gallery view uses these full-res files;
// thumbs (600px) are still used on the bento + group view.
// Total committed size ~80MB for 122 files.
const MAX = 3500;
const QUALITY = 85;

const MAPPING = [
  { upload: "01_beauty-is-the-best-defense", slug: "beauty" },
  { upload: "02_birds-of-paradise", slug: "birdsofparadise" },
  { upload: "03_bodies-under-construction", slug: "moestings" },
  { upload: "04_stockholm-cosmologies", slug: "liljevalchs" },
  { upload: "05_deep-cuts", slug: "deepcuts" },
  { upload: "06_drawings", slug: "drawing" },
  { upload: "07_kultuur", slug: "kultuur" },
  { upload: "09_pandemonium-paradiso", slug: "pandemonium" },
  { upload: "10_symbiosis-mfa", slug: "symbiosis" },
  { upload: "11_glory-on-earth", slug: "glory" },
  { upload: "12_spring-has-arrived", slug: "fearandfauna" },
  { upload: "13_rites-of-affection", slug: "rites" },
  { upload: "14_Queer-Ecologies", slug: "queer" },
];

// Skip files that aren't actually images (movies, txt notes, etc.)
const IMAGE_EXTS = /\.(webp|jpe?g|tiff?|png|webp_new\.jpe?g|webp_new\.tiff?)$/i;

function listImageFiles(dir) {
  return readdirSync(dir)
    .filter((f) => IMAGE_EXTS.test(f))
    .filter((f) => !f.startsWith(".") && !f.startsWith("_"))
    .sort();
}

function listExisting(slug) {
  return readdirSync(worksDir)
    .filter((f) => new RegExp(`^${slug}-\\d+\\.webp$`).test(f))
    .sort();
}

let touched = 0;
let skipped = 0;

for (const { upload, slug } of MAPPING) {
  const uploadDir = resolve(UPLOADS_BASE, upload);
  const sources = listImageFiles(uploadDir);
  const targets = listExisting(slug);
  const pairCount = Math.min(sources.length, targets.length);
  console.log(
    `\n${slug}  <- ${upload}   sources:${sources.length}  existing:${targets.length}  pairing:${pairCount}`,
  );
  for (let i = 0; i < pairCount; i++) {
    const src = resolve(uploadDir, sources[i]);
    const dst = resolve(worksDir, targets[i]);
    const beforeBytes = statSync(dst).size;
    const inputBuf = readFileSync(src);
    let img = sharp(inputBuf, { failOn: "none" });
    const meta = await img.metadata();
    if ((meta.orientation ?? 1) > 1) {
      // Apply EXIF rotation if the camera tagged it; otherwise sharp
      // bakes the unrotated pixels.
      img = img.rotate();
    }
    const out = await img
      .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer();
    const afterMeta = await sharp(out).metadata();
    writeFileSync(dst, out);
    console.log(
      `  ${basename(src)} (${meta.width}x${meta.height}, ${meta.format}) -> ${basename(dst)} (${afterMeta.width}x${afterMeta.height})  ${(beforeBytes / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB`,
    );
    touched++;
  }
  if (sources.length > targets.length) {
    console.log(
      `  (extra ${sources.length - targets.length} source file(s) ignored: ${sources.slice(targets.length).join(", ")})`,
    );
    skipped += sources.length - targets.length;
  }
}

console.log(
  `\nDone. ${touched} files re-encoded, ${skipped} extra source(s) skipped.`,
);
