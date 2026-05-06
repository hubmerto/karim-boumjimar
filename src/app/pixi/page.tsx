"use client";

import { CanvasPixi } from "@/components/CanvasPixi";
import { CrashOverlay } from "@/components/CrashOverlay";

/**
 * Test route for the WebGL canvas implementation.
 * Reach via /pixi (or /pixi/?canvas=1 on mobile to bypass the
 * fallback). The main / route still uses the DOM canvas / fallback.
 */
export default function PixiPage() {
  return (
    <>
      <CanvasPixi />
      <CrashOverlay />
    </>
  );
}
