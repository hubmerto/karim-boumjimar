"use client";

if (typeof window !== "undefined") {
  // ViewSwitcher reads this and unconditionally renders the mobile
  // branch (Pixi canvas + InspectorSheet) regardless of viewport
  // — recordings of the mobile sheet UX don't require resizing the
  // browser.
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  // Cut the canvas's intro reveal in half (3.5 s vs 6 s) so the
  // setup before the loop is shorter.
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
 * Mobile-only. Loops the InspectorSheet swipe gesture: pull from
 * peek to full, hold long enough to read the project statement,
 * pull back to peek, hold, repeat.
 *
 * Pre-positioned at a project cluster with the sheet already
 * mounted. setInspectorSheetSnap("full" / "peek") drives the
 * sheet through its 450 ms transition; the autopilot waits for
 * each transition to land before the next snap change.
 */

const PROJECT_KEY = "Symbiosis (MFA)|2025";

export default function ShowcaseMobileSheetPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const selectGroup = useSelection((s) => s.selectGroup);
  const setInspectorSheetSnap = useSelection((s) => s.setInspectorSheetSnap);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Wait for the fast intro reveal, then fly to the cluster.
      await wait(4000);
      selectGroup(PROJECT_KEY);
      await wait(5000);
    }

    // 1. Sheet at peek — settle.
    setInspectorSheetSnap("peek");
    await wait(1200);

    // 2. Pull all the way up to full.
    setInspectorSheetSnap("full");
    // 450 ms transition + 2 s "reading" hold.
    await wait(2500);

    // 3. Drop back to peek.
    setInspectorSheetSnap("peek");
    // 450 ms transition + 1 s collapsed hold.
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
