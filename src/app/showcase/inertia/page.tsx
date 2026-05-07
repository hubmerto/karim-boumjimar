"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Diamond → fly to cluster → flick right / down / diagonal,
 * each settling via inertia → fly back to diamond.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcaseInertiaPage() {
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

    await wait(800);

    navigateToGroup(PROJECT_KEY);
    await wait(5000);

    flickPan(1.6, 0);
    await wait(1500);

    flickPan(0, 1.4);
    await wait(1500);

    flickPan(-1.2, -1.0);
    await wait(1500);

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
