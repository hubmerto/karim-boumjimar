"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Diamond → sweep through 5 visually distinct cluster grids
 * (5×4, 5×3, 4×2, 3 single-row, 3-col adaptive) → fly back to
 * diamond. Each cycle starts and ends at the same diamond
 * rest state.
 */

const PROJECTS = [
  "Bodies Under Construction|2026", // 5 × 4
  "Pandemonium Paradiso|2025", // 5 × 3
  "Stockholm Cosmologies|2025", // 4 × 2
  "Deep Cuts|2025", // single row
  "Birds of Paradise|2026", // 3-col adaptive
] as const;

export default function ShowcaseClusterVariationPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(6500);

    // Diamond at rest.
    await wait(800);

    // Sweep through clusters; each fly takes ~5 s + 2 s hold.
    for (const key of PROJECTS) {
      navigateToGroup(key);
      await wait(5000);
      await wait(2000);
    }

    // Reset to diamond.
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
