"use client";

import { useEffect, useState } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Shows the full reset cascade from the deepest state — gallery
 * open on a single image — back to the bento overview. Every
 * intermediate transition fires in sequence: gallery genie-closes
 * to canvas tile, camera flies back, tiles re-pack into the
 * diamond.
 *
 * Re-entry to the deep state is masked by a white overlay so the
 * recording loops on the visible cascade only, not the
 * setup-tap-and-zoom.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const WORK_ID = "bodies-04";

export default function ShowcaseResetCascadePage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const selectGroup = useSelection((s) => s.selectGroup);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  const [whiteOpacity, setWhiteOpacity] = useState(0);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Wait for intro reveal to settle.
      await wait(6500);
      // Cover with white while we set up the deep state, so the
      // recording starts inside the cascade demo loop only.
      setWhiteOpacity(1);
      await wait(400);
      selectGroup(PROJECT_KEY);
      await wait(5000);
      selectWork(WORK_ID, PROJECT_KEY);
      expandGroup(PROJECT_KEY);
      await wait(3000);
      // Reveal: gallery is open, ready for the cascade.
      setWhiteOpacity(0);
      await wait(800);
    }

    // 1. Hold the gallery (deepest state).
    await wait(1500);

    // 2. Trigger the cascade. resetToOverview clears expandedGroupKey
    //    (gallery FLIP-closes), then the navResetOverviewToken
    //    bumps the camera back to bento, then dispersion flips to
    //    0 and tiles re-pack into the diamond.
    resetToOverview();
    // FLIP close (~3 s) + camera back (1.5 s) + tile re-bento
    // tween (2.8 s, overlapping the camera). 5 s buffer to land.
    await wait(5500);

    // 3. Hold the bento at rest.
    await wait(2000);

    // 4. Hide everything with white, re-build the deep state in
    //    secret, then reveal.
    setWhiteOpacity(1);
    await wait(800);
    selectGroup(PROJECT_KEY);
    await wait(5000);
    selectWork(WORK_ID, PROJECT_KEY);
    expandGroup(PROJECT_KEY);
    await wait(3000);
    setWhiteOpacity(0);
    await wait(800);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <PreloadGalleryImages />
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--color-canvas, #fff)",
          zIndex: 60,
          pointerEvents: "none",
          opacity: whiteOpacity,
          transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </DemoFrame>
  );
}
