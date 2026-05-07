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
 * Diamond → fly to cluster → tap image (FLIP open into strip) →
 * close (FLIP back to tile) → fly back to diamond. Each cycle
 * starts and ends at the same diamond rest state.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const WORK_ID = "bodies-04";

export default function ShowcaseStripDesktopPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(6500);

    // 1. Diamond at rest.
    await wait(800);

    // 2. Fly to cluster.
    navigateToGroup(PROJECT_KEY);
    await wait(5000);

    // 3. Lock the tile that the FLIP will animate from + open.
    selectWork(WORK_ID, PROJECT_KEY);
    expandGroup(PROJECT_KEY);
    await wait(3000); // FLIP open (2.4 s + buffer)

    // 4. Hold strip.
    await wait(2500);

    // 5. Close strip — FLIP back to tile.
    collapseGroup();
    await wait(3000);

    // 6. Reset to diamond.
    resetToOverview();
    await wait(5000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <PreloadGalleryImages />
    </DemoFrame>
  );
}
