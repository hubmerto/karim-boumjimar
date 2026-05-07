"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Loops the gallery FLIP transition: tile flies into the strip
 * (genie open) → hold → photos fly back to canvas tiles (genie
 * close) → hold → repeat. Pre-positioned at a project cluster
 * with one specific work selected, so every cycle exercises
 * the same FLIP rect (recordings stay deterministic).
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const WORK_ID = "bodies-04";

export default function ShowcaseFlipPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const selectGroup = useSelection((s) => s.selectGroup);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Wait for intro reveal, then fly to the cluster. Subsequent
      // cycles start at the cluster (genie close lands us there).
      await wait(6500);
      selectGroup(PROJECT_KEY);
      await wait(5000);
    }

    // 1. Settle on the cluster.
    await wait(1000);

    // 2. Tap the work → FLIP open into the gallery strip.
    selectWork(WORK_ID, PROJECT_KEY);
    expandGroup(PROJECT_KEY);
    await wait(3000);

    // 3. Hold the strip on screen.
    await wait(1500);

    // 4. Auto-close → FLIP back to canvas tile.
    collapseGroup();
    await wait(3000);

    // 5. Hold the cluster before the next loop.
    await wait(1000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      {/* Warm the full-res cache so the gallery doesn't show a
          thumb→full-res swap mid-recording. */}
      <PreloadGalleryImages />
    </DemoFrame>
  );
}
