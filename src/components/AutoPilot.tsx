"use client";

import { useEffect, useState } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the /showcase route's looping
 * demo. Cycle:
 *
 *   first run only:
 *     splash logo plays (handled by <Splash forcePlay />)
 *     intro reveal — bento zooms 75% → 100% as tiles fade in
 *   bento overview holds briefly
 *   selectGroup(Bodies Under Construction) → camera flies in,
 *     tiles disperse from the diamond into the cluster grid
 *   group view lingers (3 s)
 *   expandGroup → FLIP-open into the gallery strip
 *   gallery auto-scrolls horizontally to the end (3 s)
 *   collapseGroup → FLIP-close (genie back to canvas tiles)
 *   resetToOverview → camera zooms back AND tiles re-pack into
 *     the bento diamond (the threshold change in useCanvas now
 *     fires dispersion=0 as the camera passes bentoFit)
 *   final diamond linger (3 s)
 *   white fades in over the diamond → loop resets
 *   subsequent iterations: white fades out → bento → repeat
 *
 * Recording tip: capture from page-load through one full white-
 * fade-in for the full intro experience (splash + first cycle).
 * For a tight repeating loop without the splash, capture from
 * one peak-white moment to the next — that gives ~24 s of clean
 * ambient demo with no branding overhead.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

// Each timing buffers a small comfort margin past the underlying
// animation duration so the next action doesn't trip mid-tween.
const T = {
  // First-run intro: Splash HOLD_MS (2200) + FADE_MS (1000) +
  // INTRO_REVEAL_MS (6000) + small buffer. The splash + intro
  // reveal play in full view (white overlay starts transparent)
  // before the demo cycle's actions fire.
  INITIAL_INTRO: 9500,
  WHITE_FADE: 800,
  WHITE_HOLD: 600,
  BENTO_HOLD: 1000,
  GROUP_FLY_IN: 5000, // animateTransform 4500 in nav effect + buffer
  GROUP_LINGER: 3000, // requested: hold the cluster on screen
  GALLERY_OPEN: 3000, // FLIP open = 2400 + decode buffer
  GALLERY_SCROLL: 3000, // requested: 3 s scroll-to-end
  GALLERY_CLOSE: 3000, // FLIP close = 2400 + buffer
  // Reset: 1500 ms camera animateTransform PLUS the tile re-bento
  // tween that fires once the camera crosses the bentoFit threshold
  // (WorkTile.transition = 2800 ms). Without that headroom the white
  // wipe starts before the diamond has finished re-forming.
  RESET_FLY_BACK: 4500,
  FINAL_DIAMOND_HOLD: 3000, // requested: linger on the diamond at the end
};

export function AutoPilot() {
  const selectGroup = useSelection((s) => s.selectGroup);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  // White overlay sits transparent for the first cycle so the
  // splash + intro reveal play in full view. After every demo
  // cycle ends it fades up to opaque, holds briefly as a clean
  // bookend frame, then fades out for the next iteration.
  const [whiteOpacity, setWhiteOpacity] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

    // Animate the gallery strip's scrollLeft from current to the
    // far right, with eased timing. We can't use scroll-behaviour:
    // smooth because that's browser-paced and won't honour our 3 s
    // duration; ease-in-out cubic on rAF gives a deterministic
    // glide that matches the rest of the site's motion language.
    function scrollGalleryToEnd(durationMs: number) {
      return new Promise<void>((resolve) => {
        const el = document.querySelector(
          "[data-gallery-strip]",
        ) as HTMLElement | null;
        if (!el) {
          resolve();
          return;
        }
        const startScroll = el.scrollLeft;
        const targetScroll = el.scrollWidth - el.clientWidth;
        if (targetScroll <= startScroll + 1) {
          resolve();
          return;
        }
        const startTs = performance.now();
        function tick(now: number) {
          if (cancelled) {
            resolve();
            return;
          }
          const t = Math.min(1, (now - startTs) / durationMs);
          // ease-in-out cubic: gentle start + finish, sustained mid.
          const eased =
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          el!.scrollLeft = startScroll + (targetScroll - startScroll) * eased;
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(tick);
      });
    }

    async function loop() {
      // First-run only: let the splash + intro reveal play out
      // before the demo cycle starts dispatching actions. The
      // white overlay is already transparent (initial state), so
      // the user actually sees the logo and tile fade-in.
      await wait(T.INITIAL_INTRO);
      if (cancelled) return;

      // First cycle skips the WHITE_FADE-out (already transparent)
      // and BENTO_HOLD (we just spent INTRO_INTRO holding the
      // bento at 100 % rest). Subsequent cycles run the full
      // dance: white fade out → bento hold → demo.
      let firstCycle = true;

      while (!cancelled) {
        if (!firstCycle) {
          // 1. Fade the white away to reveal the bento diamond.
          setWhiteOpacity(0);
          await wait(T.WHITE_FADE);
          if (cancelled) return;

          // 2. Bento holds for a beat.
          await wait(T.BENTO_HOLD);
          if (cancelled) return;
        }
        firstCycle = false;

        // 3. Select Birds of Paradise → camera flies into group.
        selectGroup(PROJECT_KEY);
        await wait(T.GROUP_FLY_IN);
        if (cancelled) return;

        // 4. Group view linger.
        await wait(T.GROUP_LINGER);
        if (cancelled) return;

        // 5. Open the gallery strip (FLIP-open animation).
        expandGroup(PROJECT_KEY);
        await wait(T.GALLERY_OPEN);
        if (cancelled) return;

        // 6. Auto-scroll the strip horizontally to its far end.
        await scrollGalleryToEnd(T.GALLERY_SCROLL);
        if (cancelled) return;

        // 7. Close the gallery — genie back to canvas tiles.
        collapseGroup();
        await wait(T.GALLERY_CLOSE);
        if (cancelled) return;

        // 8. Camera zooms out, back to the bento overview.
        resetToOverview();
        await wait(T.RESET_FLY_BACK);
        if (cancelled) return;

        // 9. Linger on the final diamond — gives the recording a
        // beat to "land" on the bento shape before the white wipe
        // takes it. Without this, the white starts fading in the
        // moment the camera arrives and the diamond never quite
        // settles for the viewer.
        await wait(T.FINAL_DIAMOND_HOLD);
        if (cancelled) return;

        // 10. Fade the white in to cover everything → loop reset.
        setWhiteOpacity(1);
        await wait(T.WHITE_FADE);
        if (cancelled) return;

        // 11. Hold full white briefly so a recording loop has a
        // crisp bookend frame to wrap on.
        await wait(T.WHITE_HOLD);
      }
    }

    void loop();

    return () => {
      cancelled = true;
    };
  }, [selectGroup, expandGroup, collapseGroup, resetToOverview]);

  // Full-screen white wipe. z-50 sits above the gallery (z-20),
  // the toolbars, and the project panel — it's the topmost layer
  // during transitions. pointer-events-none so it never intercepts
  // anything (the auto-pilot is the only intended interactor).
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 bg-canvas"
      style={{
        opacity: whiteOpacity,
        transition: `opacity ${T.WHITE_FADE}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    />
  );
}
