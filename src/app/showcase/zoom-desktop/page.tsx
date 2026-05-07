"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Same gesture as /showcase/zoom-mobile, desktop renderer. The
 * spec calls for "wheel events with ctrlKey:true" — instead we
 * route through the same zoomCameraBy action the mobile pinch
 * uses, which feeds into the existing clampedZoom path. The
 * dispersion-tracker fires on the threshold cross identically
 * to a real ctrl+wheel.
 */

const ZOOM_OUT_FACTOR = 1.6;
const ZOOM_IN_FACTOR = 1 / ZOOM_OUT_FACTOR;
const ZOOM_DURATION_MS = 1500;

export default function ShowcaseZoomDesktopPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const zoomCameraBy = useSelection((s) => s.zoomCameraBy);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(6500);

    // 0.0s — hold bento.
    await wait(1000);

    // 1.0s — pinch outward (1.5s).
    zoomCameraBy(ZOOM_OUT_FACTOR, ZOOM_DURATION_MS);
    await wait(1500);

    // 2.5s — hold spread until 4.5s.
    await wait(2000);

    // 4.5s — pinch inward (1.5s).
    zoomCameraBy(ZOOM_IN_FACTOR, ZOOM_DURATION_MS);
    await wait(1500);

    // 6.0s — hold bento until 8.0s.
    await wait(2000);
  });

  return (
    <DemoFrame>
      <ViewSwitcher />
    </DemoFrame>
  );
}
