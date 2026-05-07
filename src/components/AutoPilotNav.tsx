"use client";

import { useEffect } from "react";
import { useSelection } from "@/lib/store";

/**
 * Drives /showcase/navigation. Cycle:
 *
 *   diamond + index closed (rest)
 *   open index
 *   navigate Beauty → Pandemonium → Spring (camera flies + index
 *     highlight follows)
 *   close index
 *   reset to diamond
 *   loop
 *
 * Each cycle starts and ends at the same diamond rest state.
 */

const PROJECTS = [
  "Beauty is the Best Defense|2026",
  "Pandemonium Paradiso|2025",
  "Spring Has Arrived|2023",
] as const;

const T = {
  INITIAL_INTRO: 6500,
  DIAMOND_HOLD: 800,
  INDEX_OPEN_HOLD: 600,
  GROUP_FLY_IN: 5000,
  PROJECT_LINGER: 1500,
  INDEX_CLOSE_HOLD: 600,
  RESET_FLY_BACK: 5000,
};

export function AutoPilotNav() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);

    let cancelled = false;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

    async function loop() {
      // First-run intro reveal.
      await wait(T.INITIAL_INTRO);
      if (cancelled) return;

      while (!cancelled) {
        // 1. Diamond, index closed.
        await wait(T.DIAMOND_HOLD);
        if (cancelled) return;

        // 2. Open index drawer.
        setIndexOpen(true);
        await wait(T.INDEX_OPEN_HOLD);
        if (cancelled) return;

        // 3. Sweep through projects — camera flies to each, index
        //    highlight follows because Index syncs to selectedGroupKey.
        for (const key of PROJECTS) {
          navigateToGroup(key);
          await wait(T.GROUP_FLY_IN);
          if (cancelled) return;
          await wait(T.PROJECT_LINGER);
          if (cancelled) return;
        }

        // 4. Close the index drawer.
        setIndexOpen(false);
        await wait(T.INDEX_CLOSE_HOLD);
        if (cancelled) return;

        // 5. Reset to diamond — camera flies back, tiles re-pack.
        resetToOverview();
        await wait(T.RESET_FLY_BACK);
        if (cancelled) return;
      }
    }

    void loop();

    return () => {
      cancelled = true;
    };
  }, [setSplashGone, setIndexOpen, navigateToGroup, resetToOverview]);

  return null;
}
