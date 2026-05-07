"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Diamond → fly to cluster (sheet slides up to peek) → drag handle
 * up → scroll content down → scroll back up → drag handle down →
 * fly back to diamond.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const SCROLL_TARGET_PX = 1500;

export default function ShowcaseSheetPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const setInspectorSheetSnap = useSelection(
    (s) => s.setInspectorSheetSnap,
  );
  const scrollSheetContentTo = useSelection(
    (s) => s.scrollSheetContentTo,
  );
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(4000);

    // 1. Diamond at rest.
    await wait(800);

    // 2. Fly to cluster.
    navigateToGroup(PROJECT_KEY);
    await wait(5000);
    setInspectorSheetSnap("peek");
    await wait(700);

    // 3. Drag handle up.
    setInspectorSheetSnap("full");
    await wait(1000);
    await wait(800);

    // 4. Scroll content down to end.
    scrollSheetContentTo(SCROLL_TARGET_PX, 2500);
    await wait(2500);
    await wait(700);

    // 5. Scroll content up to top.
    scrollSheetContentTo(0, 2500);
    await wait(2500);
    await wait(700);

    // 6. Drag handle down.
    setInspectorSheetSnap("peek");
    await wait(1000);
    await wait(700);

    // 7. Release the snap override + reset to diamond.
    setInspectorSheetSnap(null);
    resetToOverview();
    await wait(5000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <InspectorSheet />
    </DemoFrame>
  );
}
