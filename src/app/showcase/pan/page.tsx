"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Pan flick → inertia carries → settles → flick back → settles
 * exactly at original centre. Round-trip is exact because we
 * end the cycle by recalling the original camera centre via
 * navigateToGroup (which always lands at the same target — the
 * spread-bbox of the chosen cluster).
 *
 * Pure flick math wouldn't quite round-trip — friction-based
 * inertia integrates to ~0.5 % of input velocity in displacement
 * by 1.5 s, which is a few pixels of drift on the loop seam.
 * The recall snaps to exact match.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcasePanPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const flickPan = useSelection((s) => s.flickPan);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(6500);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
    }

    // 0.0s — hold centre.
    await wait(400);

    // 0.4s — flick right (vx px/ms; visible glide ~1.5s).
    flickPan(1.4, 0);
    await wait(2100);

    // 2.5s — hold right extent.
    await wait(700);

    // 3.2s — flick left.
    flickPan(-1.4, 0);
    await wait(1600);

    // 4.8s — hold centre. The two flicks should ~balance, but
    //        recall the cluster centre to remove residual drift
    //        so the loop seam is exact.
    navigateToGroup(PROJECT_KEY);
    await wait(2200);
  });

  return (
    <DemoFrame>
      <ViewSwitcher />
    </DemoFrame>
  );
}
