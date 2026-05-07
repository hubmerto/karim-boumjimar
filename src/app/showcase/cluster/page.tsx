"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Tap a cluster centroid → FLIP into the gallery (strip view).
 * Tap close → FLIP back to the cluster grid.
 *
 * The pre-positioned state has the camera at the cluster
 * (selectedGroupKey set, not expanded) — the cycle's start frame
 * shows the cluster grid with the InspectorSheet at peek; the
 * cycle's end frame is identical because expandGroup +
 * collapseGroup don't move the camera or change the cluster
 * selection.
 *
 * `Bodies Under Construction` chosen — its 5 × 4 grid is the
 * most visually distinct cluster shape.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcaseClusterPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(4000);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
    }

    // 0.0s — hold spread / cluster grid view.
    await wait(500);

    // 0.5s — FLIP into gallery (strip).
    expandGroup(PROJECT_KEY);
    await wait(1000);

    // 1.5s — hold gallery until 4.5s.
    await wait(3000);

    // 4.5s — FLIP back to grid.
    collapseGroup();
    await wait(1000);

    // 5.5s — hold cluster grid until 10.0s.
    await wait(4500);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <InspectorSheet />
      <PreloadGalleryImages />
    </DemoFrame>
  );
}
