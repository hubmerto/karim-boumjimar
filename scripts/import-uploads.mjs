// Import the artist's content drop from /Users/humbertoimac/Downloads/(...)/01_images/.
// For each numbered exhibition folder:
//   - parse _info.txt (or info.txt) for title, year, description
//   - process every image: convert to .webp at maxDim 800, write to public/images/works/
//   - record dimensions in scripts/processed.json
//   - emit scripts/imported.json with one entry per exhibition (slug, title, year, year-numeric, description, images[])
//
// The slug for each folder is derived from its name and matches an entry in CLUSTER_MAP below.
// Folders with no clear cluster match are skipped with a warning.
//
// Run: pnpm exec node scripts/import-uploads.mjs

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename, extname } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = "/tmp/karim-uploads/01_images";
const OUT = resolve(root, "public/images/works");
mkdirSync(OUT, { recursive: true });

const MAX = 800;
const QUALITY = 82;

// folder name -> slug used inside the codebase + cluster definitions.
// Folders not in this map are skipped (eg. YBDG, "random photos").
const CLUSTER_MAP = {
  "01_beauty-is-the-best-defense": "beauty",
  "02_birds-of-paradise": "birdsofparadise",
  "03_bodies-under-construction": "moestings",
  "04_stockholm-cosmologies": "liljevalchs",
  "05_deep-cuts": "deepcuts",
  "06_drawings": "drawing",
  "07_kultuur": "kultuur",
  "09_pandemonium-paradiso": "pandemonium",
  "10_symbiosis-mfa": "symbiosis",
  "11_glory-on-earth": "glory",
  "12_spring-has-arrived": "fearandfauna",
  "13_rites-of-affection": "rites",
  "14_Queer-Ecologies": "queer",
};

const IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".tif", ".tiff", ".png"]);

function parseInfo(text) {
  // Format: title on line 1, year on line 2, then optional blank line,
  // then DESCRIPTION marker, then body, then IMAGES marker (skip).
  const lines = text.split(/\r?\n/);
  const title = (lines[0] || "").trim();
  const year = (lines[1] || "").trim();
  const yearNum = parseInt(year, 10) || null;
  // Description is everything between "DESCRIPTION" marker and "IMAGES" marker.
  const descStart = lines.findIndex((l) => /---\s*DESCRIPTION/i.test(l));
  const descEnd = lines.findIndex(
    (l, i) => i > descStart && /---\s*IMAGES/i.test(l),
  );
  let body = "";
  if (descStart !== -1) {
    const slice = lines.slice(
      descStart + 1,
      descEnd !== -1 ? descEnd : undefined,
    );
    body = slice.join("\n").trim();
  }
  // Squash repeated blank lines to a single newline pair so each block is
  // a clean paragraph.
  body = body.replace(/\n{3,}/g, "\n\n");
  return { title, year, yearNum, body };
}

function isImage(name) {
  if (name.startsWith(".") || name.startsWith("_")) return false;
  if (name === "info.txt") return false;
  // Some files are named "01.webp_new.jpg" -- treat any extension we recognise
  // (the LAST dot-extension) as the format hint for sharp.
  const ext = extname(name).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return true;
  return false;
}

function imageNumber(name) {
  // Match leading digits. "01.webp" -> 1, "01.webp_new.jpg" -> 1.
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

const imported = [];
const processedDims = [];

const folders = readdirSync(SRC).filter((f) =>
  statSync(resolve(SRC, f)).isDirectory(),
);

for (const folder of folders) {
  const slug = CLUSTER_MAP[folder];
  if (!slug) {
    console.log(`! skip ${folder} (no cluster mapping)`);
    continue;
  }
  const folderPath = resolve(SRC, folder);
  const files = readdirSync(folderPath).filter((f) => isImage(f));
  files.sort((a, b) => imageNumber(a) - imageNumber(b));
  if (!files.length) {
    console.log(`! skip ${folder} (no images)`);
    continue;
  }

  const infoFile = readdirSync(folderPath).find((f) =>
    /^_?info\.txt$/i.test(f),
  );
  const info = infoFile
    ? parseInfo(readFileSync(resolve(folderPath, infoFile), "utf8"))
    : { title: slug, year: "", yearNum: null, body: "" };

  const images = [];
  let n = 1;
  for (const f of files) {
    const id = `${slug}-${String(n).padStart(2, "0")}`;
    const outPath = resolve(OUT, `${id}.webp`);
    try {
      const buf = readFileSync(resolve(folderPath, f));
      // sharp({ failOn: "none" }) is forgiving with weird TIFFs.
      const img = sharp(buf, { failOn: "none" });
      const meta = await img.metadata();
      const out = await img
        .rotate() // honour EXIF orientation
        .resize(MAX, MAX, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toBuffer();
      writeFileSync(outPath, out);
      const afterMeta = await sharp(out).metadata();
      images.push({
        id,
        src: `/images/works/${id}.webp`,
        alt: `${info.title}, installation view`,
        width: afterMeta.width,
        height: afterMeta.height,
      });
      processedDims.push({
        id,
        slug,
        width: afterMeta.width,
        height: afterMeta.height,
      });
      console.log(
        `${folder}/${f} ${meta.width}x${meta.height} -> ${id}.webp ${afterMeta.width}x${afterMeta.height}`,
      );
      n++;
    } catch (e) {
      console.warn(`! ${folder}/${f}: ${e.message}`);
    }
  }

  imported.push({
    folder,
    slug,
    title: info.title,
    year: info.year,
    yearNum: info.yearNum,
    description: info.body,
    images,
  });
}

writeFileSync(
  resolve(root, "scripts/imported.json"),
  JSON.stringify(imported, null, 2),
);
writeFileSync(
  resolve(root, "scripts/processed.json"),
  JSON.stringify(processedDims, null, 2),
);

console.log(
  `\nImported ${imported.length} exhibitions, ${processedDims.length} images. Wrote scripts/imported.json + scripts/processed.json.`,
);
