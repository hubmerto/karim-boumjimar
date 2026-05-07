"use client";

if (typeof window !== "undefined") {
  // Halve the intro reveal duration so each replay reads in 3-4 s
  // rather than the production 6 s.
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect, useState } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Loops the diamond appearing animation. Each cycle:
 *
 *   1. white wipe covers everything
 *   2. canvas remounts (fresh internal state)
 *   3. white fades out
 *   4. intro reveal plays — staggered tile fade-in + 75 % → 100 %
 *      camera tween
 *   5. hold the completed bento
 *   6. white wipe covers, restart
 *
 * The remount is achieved by changing the `key` prop on
 * <ViewSwitcher /> — React tears down all child state, including
 * useCanvas's userInteractedRef, so the intro reveal effect fires
 * on the false → true edge of splashGone like a fresh page load.
 */
export default function ShowcaseBentoEntryPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);

  const [cycleKey, setCycleKey] = useState(0);
  const [whiteOpacity, setWhiteOpacity] = useState(1);

  useEffect(() => {
    setView("exhibitions");
  }, [setView]);

  useAutopilot(async ({ wait }) => {
    // 1. Cover with white. The cover state is also our loop seam:
    //    every iteration starts with white at 1 and ends with
    //    white at 1. Recordings naturally loop on the white frame.
    setWhiteOpacity(1);
    setSplashGone(false);
    await wait(400);

    // 2. Remount the canvas — fresh state. New mount has
    //    splashGone === false, so the intro effect doesn't fire
    //    yet.
    setCycleKey((k) => k + 1);
    await wait(80); // let React commit the remount

    // 3. Reveal — fade white away.
    setWhiteOpacity(0);
    await wait(400);

    // 4. Trigger the intro reveal. splashGone false → true is the
    //    edge useCanvas / CanvasPixi watch.
    setSplashGone(true);

    // 5. Wait for the fast intro to land (~3.5 s with __FAST_INTRO__).
    await wait(4200);

    // 6. Hold the completed bento.
    await wait(2000);
  });

  return (
    <DemoFrame>
      <div style={{ position: "fixed", inset: 0 }}>
        <ViewSwitcher key={cycleKey} />
      </div>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--color-canvas, #fff)",
          zIndex: 60,
          pointerEvents: "none",
          opacity: whiteOpacity,
          transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </DemoFrame>
  );
}
