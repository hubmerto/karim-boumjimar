"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Programmatic pinch outward (zoom in past the dispersion
 * threshold) → settles in spread → pinch inward (back to bento)
 * → loop. Drives the real dispersion logic via zoomCameraBy
 * (which animates `transform.scale` through the same path the
 * production touch pinch handler uses), not a CSS transform.
 *
 * Round-trip is exact because zoom factor 1.6 followed by 1/1.6
 * lands at the original scale, and the camera centre never
 * moves (zoomCameraBy anchors on the viewport centre).
 */

const ZOOM_OUT_FACTOR = 1.6; // past 1.25× threshold → dispersion=1
const ZOOM_IN_FACTOR = 1 / ZOOM_OUT_FACTOR;
const ZOOM_DURATION_MS = 1500;

export default function ShowcaseZoomMobilePage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const zoomCameraBy = useSelection((s) => s.zoomCameraBy);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Wait for the fast intro reveal to settle.
      await wait(4000);
    }

    // 0.0s — hold bento.
    await wait(500);

    // 0.5s — pinch outward (1.5s).
    zoomCameraBy(ZOOM_OUT_FACTOR, ZOOM_DURATION_MS);
    await wait(1500);

    // 2.0s — hold spread until 4.5s.
    await wait(2500);

    // 4.5s — pinch inward (1.5s).
    zoomCameraBy(ZOOM_IN_FACTOR, ZOOM_DURATION_MS);
    await wait(1500);

    // 6.0s — hold bento until 8.0s.
    await wait(2000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
    </DemoFrame>
  );
}
