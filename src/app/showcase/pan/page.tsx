"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Diamond → fly to cluster → flick right (inertia carries) →
 * flick left (inertia carries back) → fly back to diamond.
 *
 * The two flicks should ~balance (matched magnitudes), but
 * residual drift is removed by the resetToOverview at the end —
 * the camera lands at the diamond bbox regardless.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcasePanPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const flickPan = useSelection((s) => s.flickPan);
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

    // 3. Hold cluster (so the flick doesn't immediately follow
    //    the camera tween's tail end).
    await wait(600);

    // 4. Flick right + glide.
    flickPan(1.4, 0);
    await wait(2100);

    await wait(500);

    // 5. Flick left + glide.
    flickPan(-1.4, 0);
    await wait(1600);

    // 6. Hold settled.
    await wait(800);

    // 7. Reset to diamond.
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
