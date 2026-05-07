"use client";

import { useEffect, useRef, useState } from "react";
import GIF from "gif.js";
import { WORKS } from "@/data/works";
import { workBounds } from "@/lib/canvas-math";
import { asset } from "@/lib/paths";
import { thumbSrc } from "@/lib/thumbs";

/**
 * Auto-generates a transparent-background GIF of the tornado swirl
 * and triggers a download. No screen recording needed — the page
 * draws every frame onto an offscreen canvas with a magenta
 * "transparency colour" that gif.js maps to the transparent index
 * in the GIF palette.
 *
 * Result limitations:
 *   - GIF supports 1-bit alpha only, so antialiased edges of
 *     rotated photos may show a faint magenta halo (unavoidable
 *     given the format). Looks clean against most light/dark
 *     backgrounds; if it bothers you, run the GIF through ezgif's
 *     "Color to transparency" filter to widen the chroma key.
 *   - The magenta colour (#ff00ff) is chosen because it's
 *     extremely unlikely to appear in any of the photos. If a
 *     photo does happen to contain it, those pixels will go
 *     transparent — switch the constant below to a different
 *     unused colour (lime green, etc.) and re-render.
 */

// Bento layout constants, mirrored from Canvas.tsx.
const BENTO_COL_COUNTS_DESKTOP = [
  3, 4, 5, 6, 7, 8, 10, 12, 12, 12, 10, 8, 7, 6, 5, 4, 3,
];
const BENTO_COL_GAP = 80;
const BENTO_ROW_GAP = 130;
const BENTO_JITTER_X = 25;
const BENTO_JITTER_Y = 25;

// Render constants. Larger CANVAS_SIZE = sharper photos but bigger
// GIF file. 800 × 800 lands at ~6–10 MB depending on chaos and
// frame count; bump if you need higher fidelity.
const CANVAS_SIZE = 900;
const FRAME_COUNT = 60;
const FRAME_DELAY_MS = 80; // ~12.5 fps
const TOTAL_MS = FRAME_COUNT * FRAME_DELAY_MS;
const REST_MS = 1600; // diamond at rest at the start of the loop
const SWIRL_MS = TOTAL_MS - REST_MS;
// Magenta — gif.js will mark every pixel of this exact colour as
// transparent. Photos must not contain pure #ff00ff or those
// pixels will leak through.
const TRANSPARENT_COLOR = 0xff00ff;
const TRANSPARENT_FILL = "#ff00ff";

const RAMP_IN_MS = 350;
const RAMP_OUT_MS = 600;

function balanceColCounts(
  target: number,
  base: readonly number[],
): number[] {
  const adjusted = [...base];
  const sum = base.reduce((a, b) => a + b, 0);
  const diff = target - sum;
  if (diff === 0) return adjusted;
  const middle = Math.floor(adjusted.length / 2);
  adjusted[middle] = Math.max(1, adjusted[middle] + diff);
  return adjusted;
}

function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

function pseudoRand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function envelope(elapsed: number, totalMs: number): number {
  if (elapsed <= 0 || elapsed >= totalMs) return 0;
  if (elapsed < RAMP_IN_MS) {
    const t = elapsed / RAMP_IN_MS;
    return t * t * (3 - 2 * t);
  }
  if (elapsed > totalMs - RAMP_OUT_MS) {
    const t = (totalMs - elapsed) / RAMP_OUT_MS;
    return t * t * (3 - 2 * t);
  }
  return 1;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

type TileSlot = {
  img: HTMLImageElement;
  slotX: number;
  slotY: number;
  width: number;
  height: number;
  radius: number;
  angularSpeed: number;
  phase: number;
  sway: number;
  swayFreq: number;
  rotSpeed: number;
};

function computeTiles(images: HTMLImageElement[]): {
  tiles: TileSlot[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
} {
  // Same deterministic shuffle Canvas.tsx uses, so the GIF's
  // diamond layout matches the live site visually.
  const seedSort = (id: string) => hash01(id);
  const items = WORKS.map((w, i) => ({
    id: w.id,
    img: images[i],
    bounds: workBounds(w),
  }));
  const ordered = [...items].sort(
    (a, b) => seedSort(a.id) - seedSort(b.id),
  );
  const maxTileW = ordered.reduce(
    (m, t) => Math.max(m, t.bounds.width),
    0,
  );
  const colSpacing = maxTileW + BENTO_COL_GAP;
  const balancedCounts = balanceColCounts(
    ordered.length,
    BENTO_COL_COUNTS_DESKTOP,
  );
  const cols = balancedCounts.length;
  const colCenters = Array.from(
    { length: cols },
    (_, i) => (i - (cols - 1) / 2) * colSpacing,
  );

  const tiles: TileSlot[] = [];
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
      const s1 = hash01(t.id);
      const s2 = hash01(t.id + "::sway");
      const dir = s1 < 0.5 ? -1 : 1;
      tiles.push({
        img: t.img,
        slotX: slotCx,
        slotY: slotCy,
        width: wb.width,
        height: wb.height,
        radius: 30 + 70 * s1,
        angularSpeed: dir * (1.4 + 2.6 * s1) * Math.PI * 2,
        phase: s2 * Math.PI * 2,
        sway: 12 + 30 * s2,
        swayFreq: (0.7 + 1.3 * s2) * Math.PI * 2,
        rotSpeed: (s1 - 0.5) * 540,
      });
      const left = slotCx - wb.width / 2;
      const top = slotCy - wb.height / 2;
      const right = left + wb.width;
      const bottom = top + wb.height;
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
      y += wb.height + BENTO_ROW_GAP;
    }
    cursor += count;
  });

  return { tiles, bbox: { minX, minY, maxX, maxY } };
}

type Phase =
  | "loading"
  | "rendering"
  | "encoding"
  | "done"
  | "error";

export default function ShowcaseTornadoGifPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void generateGif().catch((err) => {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    });

    async function generateGif() {
      // 1. Load every thumbnail. Same source set the live canvas
      //    paints so the GIF's photo content matches what users
      //    see at the bento overview.
      setPhase("loading");
      setProgress(0);
      const sources = WORKS.map((w) =>
        asset(thumbSrc(w.images[0].src)),
      );
      const images = await Promise.all(sources.map(loadImage));

      // 2. Compute bento layout + per-tile orbit params.
      const { tiles, bbox } = computeTiles(images);
      // Padding accounts for max swirl displacement (radius+sway ≈
      // 130 px in bento-space) so rotated tiles don't clip the
      // canvas edge mid-swirl.
      const PADDING = 220;
      const layoutW = bbox.maxX - bbox.minX + PADDING * 2;
      const layoutH = bbox.maxY - bbox.minY + PADDING * 2;
      const scale = Math.min(
        CANVAS_SIZE / layoutW,
        CANVAS_SIZE / layoutH,
      );
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = (bbox.minY + bbox.maxY) / 2;

      // 3. Set up encoder. workerScript points at the file we
      //    copied to /public/gif.worker.js so the encoding runs
      //    off-thread; without it gif.js blocks the main thread
      //    for the full encode and the progress bar freezes.
      const gif = new GIF({
        workers: 4,
        quality: 8,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        transparent: TRANSPARENT_COLOR,
        background: TRANSPARENT_FILL,
        workerScript: "/gif.worker.js",
        repeat: 0, // forever
        dither: false,
      });

      // 4. Allocate a single canvas reused for every frame.
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      // No image smoothing — keeps photo edges sharper at scale.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 5. Render every frame.
      setPhase("rendering");
      for (let i = 0; i < FRAME_COUNT; i++) {
        const t = i * FRAME_DELAY_MS;
        // Solid magenta fill — anything not drawn over becomes
        // transparent in the GIF.
        ctx.fillStyle = TRANSPARENT_FILL;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Envelope: 0 during the rest beat, smoothstep 0 → 1 → 0
        // during the swirl beat. Tiles end exactly at their bento
        // slot every cycle.
        let env = 0;
        if (t >= REST_MS) {
          env = envelope(t - REST_MS, SWIRL_MS);
        }

        for (const td of tiles) {
          const tSec = t / 1000;
          const angle = td.angularSpeed * tSec + td.phase;
          const r = td.radius * env;
          const dx = r * Math.cos(angle);
          const dy =
            r * Math.sin(angle) +
            env * td.sway * Math.sin(td.swayFreq * tSec);
          const rot = env * td.rotSpeed * tSec;

          // Project bento-space coords into canvas-space.
          const px = (td.slotX - cx + dx) * scale + CANVAS_SIZE / 2;
          const py = (td.slotY - cy + dy) * scale + CANVAS_SIZE / 2;
          const w = td.width * scale;
          const h = td.height * scale;

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(td.img, -w / 2, -h / 2, w, h);
          ctx.restore();
        }

        gif.addFrame(canvas, {
          delay: FRAME_DELAY_MS,
          copy: true,
        });
        setProgress(((i + 1) / FRAME_COUNT) * 0.5);
        // Yield to the event loop so the progress bar updates.
        await new Promise((r) => setTimeout(r, 0));
      }

      // 6. Encode. gif.js fires "progress" as workers chew through
      //    the LZW + palette pass; we map that into the second
      //    half of the bar.
      setPhase("encoding");
      gif.on("progress", (p: number) => {
        setProgress(0.5 + p * 0.5);
      });
      gif.on("finished", (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "karim-tornado.gif";
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Give the browser a moment to start the download before
        // releasing the blob URL.
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setPhase("done");
        setProgress(1);
      });
      gif.render();
    }
  }, []);

  const label =
    phase === "loading"
      ? "loading photos"
      : phase === "rendering"
        ? "rendering frames"
        : phase === "encoding"
          ? "encoding gif"
          : phase === "done"
            ? "done — check your downloads"
            : "error";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 13,
        color: "#111",
        background: "#fff",
      }}
    >
      <div style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
        karim · tornado · gif
      </div>
      <div style={{ minHeight: 16 }}>{label}</div>
      <div
        style={{
          width: 320,
          height: 4,
          background: "#eee",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: "100%",
            background: "#000",
            transition: "width 120ms ease",
          }}
        />
      </div>
      {errorMsg ? (
        <div style={{ color: "#c00", maxWidth: 480, textAlign: "center" }}>
          {errorMsg}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 24,
          maxWidth: 360,
          textAlign: "center",
          color: "#666",
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        Auto-downloads when ready. Reload the page to regenerate.
      </div>
    </div>
  );
}
