"use client";

import { useEffect } from "react";
import { useSelection } from "@/lib/store";

/**
 * Drives /showcase/navigation. Cycle:
 *
 *   anchor at Pandemonium Paradiso (index open, highlight on
 *     Pandemonium, camera at the cluster)
 *   index switches to Beauty is the Best Defense → camera flies
 *   index switches to Queer Ecologies → camera flies
 *   index switches back to Pandemonium → camera flies
 *   loop (now back at the cycle's start state)
 *
 * Pandemonium is the anchor: every cycle starts and ends at the
 * same Pandemonium-cluster + index-open state. No reset to the
 * diamond — the navigation demo's natural rest is "at a project
 * with the index open", not the overview.
 */

const ANCHOR = "Pandemonium Paradiso|2025";
const VISITS = [
  "Beauty is the Best Defense|2026",
  "Queer Ecologies|2023",
] as const;

const T = {
  INITIAL_INTRO: 6500,
  // Setup-only: open the index drawer + fly to the anchor before
  // the loop body starts.
  INITIAL_SETTLE: 800,
  GROUP_FLY_IN: 5000,
  // Hold each visited project for a beat after the camera arrives.
  PROJECT_LINGER: 1500,
};

export function AutoPilotNav() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);

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
      // First-run setup: intro reveal, open the index, and fly to
      // the anchor cluster. The anchor matches the loop seam, so
      // subsequent cycles never touch the diamond — they just
      // sweep through the rotation.
      await wait(T.INITIAL_INTRO);
      if (cancelled) return;
      setIndexOpen(true);
      await wait(T.INITIAL_SETTLE);
      navigateToGroup(ANCHOR);
      await wait(T.GROUP_FLY_IN);
      if (cancelled) return;

      while (!cancelled) {
        // 1. Hold the anchor (Pandemonium).
        await wait(T.PROJECT_LINGER);
        if (cancelled) return;

        // 2. Visit each project in the rotation. Index highlight
        //    follows because Index syncs to selectedGroupKey.
        for (const key of VISITS) {
          navigateToGroup(key);
          await wait(T.GROUP_FLY_IN);
          if (cancelled) return;
          await wait(T.PROJECT_LINGER);
          if (cancelled) return;
        }

        // 3. Loop back to the anchor — camera lands on Pandemonium
        //    in the same state the cycle began with.
        navigateToGroup(ANCHOR);
        await wait(T.GROUP_FLY_IN);
      }
    }

    void loop();

    return () => {
      cancelled = true;
    };
  }, [setSplashGone, setIndexOpen, navigateToGroup]);

  return null;
}
