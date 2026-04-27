// Download curated images at ?format=1500w into public/images/originals/
// (gitignored - these are the source masters for the WebP pass).
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "public/images/originals");
mkdirSync(outDir, { recursive: true });

const items = JSON.parse(readFileSync(resolve(root, "scripts/curated.json"), "utf8"));

const CONCURRENCY = 4;
const queue = [...items];
const results = [];

async function worker(workerId) {
  while (queue.length) {
    const item = queue.shift();
    const dest = resolve(outDir, `${item.id}.jpg`);
    if (existsSync(dest)) {
      results.push({ id: item.id, status: "cached" });
      continue;
    }
    const url = `${item.url}?format=1500w`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
          Accept:
            "image/webp,image/avif,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      results.push({
        id: item.id,
        status: "downloaded",
        bytes: buf.length,
      });
      console.log(
        `[w${workerId}] ${item.id}  ${(buf.length / 1024).toFixed(0)}KB`,
      );
    } catch (err) {
      results.push({ id: item.id, status: "error", error: String(err) });
      console.error(`[w${workerId}] ${item.id}  ERROR: ${err.message}`);
    }
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)),
);

const dl = results.filter((r) => r.status === "downloaded");
const cached = results.filter((r) => r.status === "cached");
const errs = results.filter((r) => r.status === "error");
const totalBytes = dl.reduce((a, r) => a + (r.bytes ?? 0), 0);
console.log(
  `\nDone: ${dl.length} downloaded, ${cached.length} cached, ${errs.length} errors. ${(totalBytes / 1024 / 1024).toFixed(1)}MB`,
);
if (errs.length) {
  console.log("Errors:");
  errs.forEach((e) => console.log(`  ${e.id}  ${e.error}`));
}
writeFileSync(resolve(root, "scripts/download-report.json"), JSON.stringify(results, null, 2));
