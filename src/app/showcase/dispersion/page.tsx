"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Loops the dispersion transition: bento at rest → spread (camera
 * flies to a project cluster, tiles fan out from the diamond) →
 * back to bento (logo reset → camera returns, tiles re-pack into
 * the diamond). ~17 s loop.
 *
 * Uses the production canvas, store, and dispersion math — the
 * autopilot is a thin scripted layer that calls the same
 * navigateToGroup + resetToOverview actions a real user would.
 */
export default function ShowcaseDispersionPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  // Skip splash so the recording starts at a stable bento.
  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Wait for the canvas's intro reveal to complete before the
      // demo's first action — otherwise we'd interrupt the
      // 75 % → 100 % bento tween mid-flight.
      await wait(6500);
    }

    // 1. Hold bento at rest.
    await wait(2000);

    // 2. Camera flies to the Bodies Under Construction cluster
    //    (5 × 4 grid — visually rich for the dispersion).
    navigateToGroup("Bodies Under Construction|2026");
    await wait(5000);

    // 3. Hold the spread.
    await wait(2500);

    // 4. Reset → camera returns, dispersion flips back to 0,
    //    tiles re-pack into the bento diamond.
    resetToOverview();
    await wait(5000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
    </DemoFrame>
  );
}
