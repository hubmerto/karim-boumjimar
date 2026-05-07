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
 * Drag handle up to extended → hold → scroll content down to end
 * → hold → scroll content up to top → hold → drag handle down to
 * collapsed → loop. Round-trip is clean because:
 *   - sheet starts at peek, ends at peek
 *   - content scroll starts at top, ends at top
 *   - camera is parked at the cluster (no movement during cycle)
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

// Distance-to-end (or close to it) for the content scroll. The
// real content height varies by project; 1200 px is comfortably
// past the bottom of even the longest credit list — the easing
// caps at scrollHeight automatically.
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

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(4000);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
      setInspectorSheetSnap("peek");
      await wait(700);
    }

    // 0.0s — hold collapsed.
    await wait(500);

    // 0.5s — drag handle up to fully extended (1.0s transition).
    setInspectorSheetSnap("full");
    await wait(1000);

    // 1.5s — hold extended.
    await wait(1000);

    // 2.5s — scroll content down to end (2.5s).
    scrollSheetContentTo(SCROLL_TARGET_PX, 2500);
    await wait(2500);

    // 5.0s — hold at end.
    await wait(1000);

    // 6.0s — scroll content up to top (2.5s).
    scrollSheetContentTo(0, 2500);
    await wait(2500);

    // 8.5s — hold at top.
    await wait(1000);

    // 9.5s — drag handle down to collapsed (1.0s).
    setInspectorSheetSnap("peek");
    await wait(1000);

    // 10.5s — hold collapsed until 12.0s.
    await wait(1500);
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
