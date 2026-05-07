"use client";

import { useEffect } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the showcase route's looping
 * demo. Dispatches store actions on a fixed schedule that matches
 * the actual animation durations elsewhere in the codebase, so
 * each beat fully lands before the next one fires.
 *
 * Loop shape:
 *   intro reveal → for each project:
 *     selectGroup     → camera flies in, tiles disperse, outlines fade
 *     expandGroup     → FLIP open into the gallery strip
 *     hold            → beat showing the photos
 *     collapseGroup   → FLIP close (the genie effect)
 *     hold            → beat showing the spread again
 *     resetToOverview → camera flies back to the bento
 *     hold            → brief beat at overview
 *
 * Renders nothing — it only manipulates the store. Cancellable
 * via unmount; all timers honour a `cancelled` flag so a route
 * change doesn't leave actions firing into a dead store.
 */

// Curated project list for the demo cycle. Each entry is a
// `${title}|${year}` group key matching what works.ts produces.
// Pick visually rich, well-photographed projects so the gallery
// strip looks great in the recording.
const SHOWCASE_PROJECTS = [
  "Bodies Under Construction|2026",
  "Pandemonium Paradiso|2025",
  "Birds of Paradise|2026",
];

// Each timing buffers a small comfort margin past the underlying
// animation duration so the next action doesn't trip mid-tween.
//   - INTRO_SETTLE: useCanvas INTRO_REVEAL_MS (6000) + buffer
//   - GROUP_FLY_IN: animateTransform 4500 in the navTargetGroupKey effect
//   - GALLERY_OPEN/CLOSE: ExpandedGroup TRANSITION_MS (2400) + buffer
//   - RESET_FLY_BACK: animateTransform 1500 in the logo-reset effect
const T = {
  INTRO_SETTLE: 6500,
  GROUP_FLY_IN: 5000,
  GALLERY_OPEN: 3000,
  GALLERY_HOLD: 2500,
  GALLERY_CLOSE: 3000,
  SPREAD_HOLD: 1200,
  RESET_FLY_BACK: 2000,
  BENTO_HOLD: 800,
};

export function AutoPilot() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const selectGroup = useSelection((s) => s.selectGroup);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    // Splash is intentionally not mounted on the showcase route,
    // so splashGone never flips on its own. Flip it manually so
    // the canvas's intro reveal effect (75% → 100% bento) fires.
    setSplashGone(true);

    let cancelled = false;
    let cycle = 0;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

    async function loop() {
      // Wait for the intro reveal to play out once at the very
      // start. Subsequent cycles already begin at the bento
      // overview thanks to resetToOverview, so they only need
      // BENTO_HOLD between iterations.
      await wait(T.INTRO_SETTLE);
      if (cancelled) return;

      while (!cancelled) {
        const key = SHOWCASE_PROJECTS[cycle % SHOWCASE_PROJECTS.length];
        cycle++;

        selectGroup(key);
        await wait(T.GROUP_FLY_IN);
        if (cancelled) return;

        expandGroup(key);
        await wait(T.GALLERY_OPEN + T.GALLERY_HOLD);
        if (cancelled) return;

        collapseGroup();
        await wait(T.GALLERY_CLOSE);
        if (cancelled) return;

        await wait(T.SPREAD_HOLD);
        if (cancelled) return;

        resetToOverview();
        await wait(T.RESET_FLY_BACK);
        if (cancelled) return;

        await wait(T.BENTO_HOLD);
      }
    }

    void loop();

    return () => {
      cancelled = true;
    };
  }, [
    setSplashGone,
    selectGroup,
    expandGroup,
    collapseGroup,
    resetToOverview,
  ]);

  return null;
}
