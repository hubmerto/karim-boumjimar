"use client";

import { useEffect } from "react";
import { WORKS } from "@/data/works";
import { asset, BASE_PATH } from "@/lib/paths";
import { useSelection } from "@/lib/store";

/**
 * As soon as a project is pinned (group view), warm the gallery's
 * images so the FLIP-open is a cache hit, not a cold fetch.
 *
 * The gallery (ExpandedGroup) now renders via next/image, so it
 * requests RESIZED variants from the edge optimizer — NOT the raw
 * 3–4MB originals. This warmer must hit the same resource class or it
 * re-introduces exactly the multi-MB downloads the next/image switch
 * removed. So:
 *   - On Vercel (no basePath → optimizer on): warm the next/image
 *     endpoint (`/_next/image?url=…&w=…&q=…`) at a representative
 *     device width, matching what the gallery fetches.
 *   - On the static-export mirror (basePath set → images.unoptimized):
 *     next/image serves the original, so warm the raw asset there.
 *
 * The component renders nothing — it's a side-effect host page.tsx
 * mounts once.
 */

// The mirror is the only build that sets a basePath, and it's also the
// only one with images.unoptimized. So "no basePath" ⟺ "optimizer on".
const OPTIMIZER_ON = BASE_PATH === "";

// next/image's default deviceSizes — the candidate widths it puts in the
// srcset for a viewport-relative (`sizes` with vw) image. The browser
// then picks one based on the resolved `sizes` width × devicePixelRatio.
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
// next/image's default quality when the component sets none (ExpandedGroup
// doesn't pass `quality`), so we must warm at the same q to hit its cache.
const WARM_QUALITY = 75;

/**
 * Resolve the gallery <Image sizes> string to a CSS pixel width for the
 * current viewport. MUST stay in sync with ExpandedGroup's `sizes`:
 *   "(max-width: 768px) 92vw, (max-width: 1280px) 60vw, 45vw"
 * If that string changes, change this too or the warm width drifts off
 * the gallery's actual request and the prefetch stops being a cache hit.
 */
function gallerySizesCssPx(vw: number): number {
  if (vw <= 768) return vw * 0.92;
  if (vw <= 1280) return vw * 0.6;
  return vw * 0.45;
}

/**
 * The exact deviceSizes width the browser will select for the gallery
 * image at this viewport — replicating the standard srcset/sizes pick
 * (smallest candidate ≥ sizesCss × DPR). Warming THIS width means the
 * gallery's request on open is a cache hit instead of a cold transcode.
 * Previously this was hard-coded to 1200, which mismatched the variant
 * the gallery actually displayed (e.g. 2048 on a retina desktop), so the
 * warm was wasted and the visible image loaded cold (~1s delay).
 */
function galleryWarmWidth(): number {
  if (typeof window === "undefined") return 1200;
  const dpr = window.devicePixelRatio || 1;
  const needed = gallerySizesCssPx(window.innerWidth) * dpr;
  return DEVICE_SIZES.find((w) => w >= needed) ?? DEVICE_SIZES[DEVICE_SIZES.length - 1];
}

function warmUrl(src: string, width: number): string {
  const resolved = asset(src);
  if (!OPTIMIZER_ON) return resolved; // mirror: raw original
  return `/_next/image?url=${encodeURIComponent(
    resolved,
  )}&w=${width}&q=${WARM_QUALITY}`;
}

export function PreloadGalleryImages() {
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);

  useEffect(() => {
    if (!selectedGroupKey) return;
    const works = WORKS.filter(
      (w) => `${w.title}|${w.year}` === selectedGroupKey,
    );
    // Compute the width once per pin from the current viewport so the
    // warmed variant matches the one the gallery will request on open.
    const width = galleryWarmWidth();
    // Hold references so the GC doesn't drop the requests mid-flight;
    // release them on cleanup so a different group's preload doesn't
    // keep this one's bytes live.
    const cache: HTMLImageElement[] = [];
    for (const work of works) {
      for (const image of work.images) {
        const el = new Image();
        el.decoding = "async";
        el.src = warmUrl(image.src, width);
        cache.push(el);
      }
    }
    return () => {
      cache.length = 0;
    };
  }, [selectedGroupKey]);

  return null;
}
