"use client";

import { useEffect } from "react";

/**
 * Soft deterrent against casual content theft. Disables the
 * right-click context menu on image and canvas elements so the
 * "Save image as…" / "Save canvas as image…" entries don't appear.
 *
 * NOT real protection — anyone determined can pull frames via
 * DevTools, screenshots, or by reading the network tab. This just
 * removes the most obvious one-click path so the artist's work
 * isn't trivially scraped.
 *
 * Text remains right-clickable on the legal / bio / about pages so
 * users can still copy email addresses, links, etc.
 */
export function ContentGuard() {
  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "IMG" || tag === "CANVAS" || tag === "PICTURE") {
        e.preventDefault();
      }
    }
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);
  return null;
}
