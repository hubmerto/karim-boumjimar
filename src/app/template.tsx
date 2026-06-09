"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// App Router `template.tsx` re-mounts on every navigation (unlike
// `layout.tsx`, which persists), so a CSS animation on its wrapper
// re-fires on each route change. This is the no-dependency way to give
// the text/legal routes a soft enter — they used to hard-cut in a single
// frame, which felt jumpy next to the fluid canvas.
//
// Scope: ONLY the text/legal routes fade. The canvas routes (/, /works/*,
// /pixi, /showcase/*) run their own camera/intro motion, and an opacity
// fade over a live WebGL/DOM canvas looks cheap (and would briefly create
// a stacking context over it), so we leave them alone.
//
// Why opacity-only (the `.route-fade` class, no transform): every text
// view is `position: fixed inset-0 ...`. A `transform` on this wrapper
// would make it the containing block for those fixed panes and break
// their positioning. `opacity` establishes only a stacking context, not a
// containing block, so the fixed panes stay anchored to the viewport.
const FADE_ROUTES = new Set([
  "/bio",
  "/contact",
  "/news",
  "/grant",
  "/imprint",
  "/privacy",
]);

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Normalize trailing slash (the static-export mirror uses trailingSlash)
  // so the match holds on both deploy targets. basePath is already
  // stripped by usePathname().
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const fade = FADE_ROUTES.has(normalized);
  return <div className={fade ? "route-fade" : undefined}>{children}</div>;
}
