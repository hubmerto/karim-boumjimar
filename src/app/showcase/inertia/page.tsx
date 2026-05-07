"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Demonstrates the kinetic pan inertia. Pre-positioned at a
 * cluster (zoomed-in enough that pan is meaningful), then loops:
 *
 *   flick right → glide → settle → hold
 *   flick down  → glide → settle → hold
 *   flick diag  → glide → settle → hold
 *   recenter (camera animates back to the cluster) → loop
 *
 * The flick is brief; the visible moment is the post-release
 * deceleration. Velocities are in screen px / ms — same units the
 * production wheel + drag handlers feed into the inertia loop.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcaseInertiaPage() {
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

    // Hold a beat so the start frame matches the loop seam.
    await wait(1000);

    // 1. Hard right flick.
    flickPan(1.6, 0);
    // Glide takes ~0.8 s to settle (200 ms half-life on 1.6 px/ms).
    await wait(1500);

    // 2. Down flick.
    flickPan(0, 1.4);
    await wait(1500);

    // 3. Diagonal flick (down-left).
    flickPan(-1.2, -1.0);
    await wait(1500);

    // 4. Recenter — re-flying to the cluster cancels any residual
    //    inertia (animateTransform calls cancelInertia internally)
    //    and the loop seam matches the post-arrival cluster view.
    navigateToGroup(PROJECT_KEY);
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
