"use client";

import { useEffect } from "react";
import { WORKS } from "@/data/works";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

/**
 * As soon as a project is pinned (group view), eagerly fetch the
 * full-resolution images for every work in that group. The bento
 * canvas only loads 600 px thumbnails, so without this the gallery
 * has to fetch the full ~3500 px versions on the fly the moment
 * the user taps to open it — which is exactly when we want the
 * FLIP transition to be smooth. Pre-warming the cache during the
 * 1–2 s the camera spends zooming in means the gallery sees a hit
 * on first paint, the <img> has real dimensions for getBoundingClientRect
 * (so the FLIP useLayoutEffect doesn't skip the tile), and there's
 * no white frame waiting for bytes.
 *
 * The component renders nothing — it's just a side-effect host so
 * page.tsx can mount it once and forget.
 */
export function PreloadGalleryImages() {
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);

  useEffect(() => {
    if (!selectedGroupKey) return;
    const works = WORKS.filter(
      (w) => `${w.title}|${w.year}` === selectedGroupKey,
    );
    // Fire fetches in parallel. We hold references in an array so
    // the GC doesn't collect them mid-flight; on cleanup we drop
    // them so a different group's preload doesn't keep this one's
    // bytes live.
    const cache: HTMLImageElement[] = [];
    for (const work of works) {
      for (const image of work.images) {
        const el = new Image();
        el.decoding = "async";
        el.src = asset(image.src);
        cache.push(el);
      }
    }
    return () => {
      cache.length = 0;
    };
  }, [selectedGroupKey]);

  return null;
}
