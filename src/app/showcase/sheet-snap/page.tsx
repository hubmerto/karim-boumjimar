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
 * Diamond → fly to cluster → partial drag up → snap-to-full →
 * partial drag down → snap-to-peek → fly back to diamond.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const PEEK_TO_FULL_PX = 600;

async function dragOverride(
  set: (v: number | null) => void,
  release: () => void,
  from: number,
  to: number,
  durationMs: number,
  wait: (ms: number) => Promise<void>,
) {
  const STEP_MS = 16;
  const steps = Math.max(1, Math.round(durationMs / STEP_MS));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    set(from + (to - from) * eased);
    await wait(STEP_MS);
  }
  release();
}

export default function ShowcaseSheetSnapPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const setInspectorSheetSnap = useSelection(
    (s) => s.setInspectorSheetSnap,
  );
  const setInspectorSheetDragDelta = useSelection(
    (s) => s.setInspectorSheetDragDelta,
  );
  const releaseSheetDrag = useSelection((s) => s.releaseSheetDrag);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(4000);

    await wait(800);

    navigateToGroup(PROJECT_KEY);
    await wait(5000);
    setInspectorSheetSnap("peek");
    await wait(700);

    // Partial drag up → release → snap to full.
    await dragOverride(
      setInspectorSheetDragDelta,
      releaseSheetDrag,
      0,
      -PEEK_TO_FULL_PX * 0.6,
      800,
      wait,
    );
    await wait(400);
    await wait(2000);

    // Partial drag down → release → snap to peek.
    await dragOverride(
      setInspectorSheetDragDelta,
      releaseSheetDrag,
      0,
      PEEK_TO_FULL_PX * 0.4,
      600,
      wait,
    );
    await wait(400);
    await wait(1500);

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
