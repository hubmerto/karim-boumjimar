// Convert downloaded originals to WebP at quality 82, write public/images/works/<id>.webp
// Also emit scripts/processed.json with width/height per id for later consumption.
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcDir = resolve(root, "public/images/originals");
const outDir = resolve(root, "public/images/works");
mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => /\.(jpe?g)$/i.test(f));
const results = [];

for (const f of files) {
  const id = basename(f, ".jpg");
  const inPath = resolve(srcDir, f);
  const outPath = resolve(outDir, `${id}.webp`);
  const inputBuf = readFileSync(inPath);
  const img = sharp(inputBuf, { failOn: "none" });
  const meta = await img.metadata();
  const out = await img
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  writeFileSync(outPath, out);
  results.push({
    id,
    width: meta.width,
    height: meta.height,
    inputBytes: inputBuf.length,
    outputBytes: out.length,
  });
  console.log(
    `${id}  ${meta.width}x${meta.height}  ${(inputBuf.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB (${Math.round((1 - out.length / inputBuf.length) * 100)}% smaller)`,
  );
}

writeFileSync(
  resolve(root, "scripts/processed.json"),
  JSON.stringify(results, null, 2),
);
const totalIn = results.reduce((a, r) => a + r.inputBytes, 0);
const totalOut = results.reduce((a, r) => a + r.outputBytes, 0);
console.log(
  `\n${results.length} files. ${(totalIn / 1024 / 1024).toFixed(1)}MB → ${(totalOut / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - totalOut / totalIn) * 100)}% smaller)`,
);
