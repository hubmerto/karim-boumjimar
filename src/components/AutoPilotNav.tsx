"use client";

import { useEffect } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the /showcase/navigation route's
 * looping demo. Cycle:
 *
 *   index drawer open, camera at Beauty is the Best Defense
 *     → linger 3 s
 *   index switches to Pandemonium Paradiso
 *     → camera flies to that cluster
 *     → linger 2 s
 *   index switches to Spring Has Arrived
 *     → camera flies
 *     → linger 2 s
 *   index switches back to Beauty is the Best Defense
 *     → camera flies
 *     → loop (now back at the cycle's start state)
 *
 * Recording tip: capture from one "Beauty 3 s linger" frame to
 * the next. Total cycle ~22 s. The loop is naturally seamless —
 * start and end both rest on Beauty with the index open and
 * highlighted on the same row, so no white wipe is needed.
 *
 * The Index component highlights whichever row matches the
 * store's `selectedGroupKey`, which `navigateToGroup` sets each
 * time AutoPilotNav calls it. So switching the highlight and
 * flying the camera are the same action.
 */

const PROJECTS = [
  "Beauty is the Best Defense|2026",
  "Pandemonium Paradiso|2025",
  "Spring Has Arrived|2023",
] as const;

const T = {
  // Brief settle so the index drawer mounts + the canvas decides
  // it's ready before the first navigateToGroup fires.
  INITIAL_SETTLE: 800,
  // The "anchor" linger on Beauty at the top of every cycle.
  ANCHOR_LINGER: 3000,
  // Linger after each subsequent project's camera arrival.
  PER_PROJECT_LINGER: 2000,
  // Camera fly-in. Matches animateTransform(4500) inside the
  // navTargetGroupKey effect, plus a small comfort buffer so the
  // next action doesn't fire while the wrapper transition is
  // still finishing.
  GROUP_FLY_IN: 5000,
};

export function AutoPilotNav() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);

  useEffect(() => {
    // Splash is not mounted on the showcase route — flip the gate
    // manually so tiles fade in and the canvas's intro reveal
    // animation fires.
    setSplashGone(true);
    // Open the works index drawer up front. It stays open for the
    // full cycle; navigateToGroup doesn't touch indexOpen, so the
    // drawer rides through every camera fly-in.
    setIndexOpen(true);

    let cancelled = false;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

    async function loop() {
      // First-run only: get the camera positioned at the cycle's
      // anchor (Beauty). Subsequent iterations end at Beauty
      // already so this only runs once.
      await wait(T.INITIAL_SETTLE);
      navigateToGroup(PROJECTS[0]);
      await wait(T.GROUP_FLY_IN);
      if (cancelled) return;

      while (!cancelled) {
        // 1. Anchor linger — index highlights Beauty, camera at
        //    Beauty's cluster.
        await wait(T.ANCHOR_LINGER);
        if (cancelled) return;

        // 2. Cycle through the rest of the projects in order.
        for (let i = 1; i < PROJECTS.length; i++) {
          navigateToGroup(PROJECTS[i]);
          await wait(T.GROUP_FLY_IN);
          if (cancelled) return;
          await wait(T.PER_PROJECT_LINGER);
          if (cancelled) return;
        }

        // 3. Loop back to the anchor — camera flies to Beauty,
        //    landing in the same state the cycle began with.
        navigateToGroup(PROJECTS[0]);
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
