"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { InspectorSheet } from "@/components/InspectorSheet";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Partial drag + snap. Drag handle up ~60 % of the distance to
 * full → release → sheet snaps the rest of the way to full
 * (production snap-to-nearest logic). Drag down ~40 % of the
 * distance back → release → snap to peek.
 *
 * Production sheet ALREADY supports partial-drag-and-snap via
 * real touch events. This route exposes a programmatic entry
 * point (setInspectorSheetDragDelta + releaseSheetDrag in the
 * store) that drives the same internal flow without simulating
 * pointer events.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

// Approximate distances between snap states. The InspectorSheet
// computes exact offsets from the viewport height; these constants
// are used only to scale the partial-drag delta (a fraction of
// the "peek → full" distance, in screen px).
const PEEK_TO_FULL_PX = 600;

// Smoothly animate the override delta from `from` to `to` over
// `durationMs`. Releasing at the end fires snap-to-nearest.
async function dragOverride(
  setInspectorSheetDragDelta: (v: number | null) => void,
  releaseSheetDrag: () => void,
  from: number,
  to: number,
  durationMs: number,
  wait: (ms: number) => Promise<void>,
) {
  const STEP_MS = 16;
  const steps = Math.max(1, Math.round(durationMs / STEP_MS));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased =
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    setInspectorSheetDragDelta(from + (to - from) * eased);
    await wait(STEP_MS);
  }
  releaseSheetDrag();
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

    // 0.5s — drag up ~60 % of the way (negative dy = up). 0.8s.
    await dragOverride(
      setInspectorSheetDragDelta,
      releaseSheetDrag,
      0,
      -PEEK_TO_FULL_PX * 0.6,
      800,
      wait,
    );
    // 1.3s — release: production snap-to-nearest picks "full"
    //        because 60 % is past the midpoint between peek and
    //        full. The 450 ms transition does the rest.
    await wait(400);

    // 1.7s — hold extended until 3.7s.
    await wait(2000);

    // 3.7s — drag down ~40 % of the way (positive dy = down). 0.6s.
    await dragOverride(
      setInspectorSheetDragDelta,
      releaseSheetDrag,
      0,
      PEEK_TO_FULL_PX * 0.4,
      600,
      wait,
    );
    // 4.3s — release: snap to peek.
    await wait(400);

    // 4.7s — hold collapsed until 8.0s.
    await wait(3300);
  });

  return (
    <DemoFrame>
      <ViewSwitcher />
      <InspectorSheet />
    </DemoFrame>
  );
}
