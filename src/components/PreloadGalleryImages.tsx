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
// A real entry in next/image's default deviceSizes; q75 is the default
// quality. Keeps the warm aligned with the gallery's likely request so
// it's a cache hit rather than a third distinct variant.
const WARM_WIDTH = 1200;
const WARM_QUALITY = 75;

function warmUrl(src: string): string {
  const resolved = asset(src);
  if (!OPTIMIZER_ON) return resolved; // mirror: raw original
  return `/_next/image?url=${encodeURIComponent(
    resolved,
  )}&w=${WARM_WIDTH}&q=${WARM_QUALITY}`;
}

export function PreloadGalleryImages() {
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);

  useEffect(() => {
    if (!selectedGroupKey) return;
    const works = WORKS.filter(
      (w) => `${w.title}|${w.year}` === selectedGroupKey,
    );
    // Hold references so the GC doesn't drop the requests mid-flight;
    // release them on cleanup so a different group's preload doesn't
    // keep this one's bytes live.
    const cache: HTMLImageElement[] = [];
    for (const work of works) {
      for (const image of work.images) {
        const el = new Image();
        el.decoding = "async";
        el.src = warmUrl(image.src);
        cache.push(el);
      }
    }
    return () => {
      cache.length = 0;
    };
  }, [selectedGroupKey]);

  return null;
}
