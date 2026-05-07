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
 * Tap an image in the cluster grid → FLIP into the strip. Tap
 * close → FLIP back to the tile. Round-trip clean: start and
 * end at the cluster grid view, same selectedId, same camera
 * position.
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

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(6500);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
      // Lock the tile that the FLIP will animate from.
      selectWork(WORK_ID, PROJECT_KEY);
    }

    // 0.0s — hold gallery (cluster grid view).
    await wait(500);

    // 0.5s — open strip (FLIP, 0.8s nominal).
    expandGroup(PROJECT_KEY);
    await wait(800);

    // 1.3s — hold strip until 4.5s.
    await wait(3200);

    // 4.5s — close strip (FLIP back to tile).
    collapseGroup();
    await wait(800);

    // 5.3s — hold gallery until 7.0s.
    await wait(1700);
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
