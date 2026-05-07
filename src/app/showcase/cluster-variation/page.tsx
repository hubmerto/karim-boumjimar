"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Sweeps through projects with visually distinct cluster grids
 * so the recording shows how the per-project layouts (5 × 4,
 * 5 × 3, 4 × 2, adaptive 3-col, etc.) all share the same camera
 * + outline language but compose differently.
 *
 * The camera flies directly between clusters — no reset to
 * overview between hops, since the cluster-to-cluster trajectory
 * itself is part of what the recording shows.
 */

const PROJECTS = [
  // 5 × 4 grid, picked first because the cycle's anchor.
  "Bodies Under Construction|2026",
  // 5 × 3 grid (last row partial).
  "Pandemonium Paradiso|2025",
  // 4 × 2 grid.
  "Stockholm Cosmologies|2025",
  // 3-tile single-row adaptive.
  "Deep Cuts|2025",
  // Adaptive 3-col grid, ~9 photos.
  "Birds of Paradise|2026",
] as const;

export default function ShowcaseClusterVariationPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(6500);
      // Park at the first cluster as the anchor.
      navigateToGroup(PROJECTS[0]);
      await wait(5000);
    }

    // Hold the current cluster.
    await wait(2000);

    // Cycle through the rest, then land back at PROJECTS[0]
    // — the loop seam.
    for (let i = 1; i < PROJECTS.length; i++) {
      navigateToGroup(PROJECTS[i]);
      await wait(5000);
      await wait(2000);
    }

    // Loop back to anchor.
    navigateToGroup(PROJECTS[0]);
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
