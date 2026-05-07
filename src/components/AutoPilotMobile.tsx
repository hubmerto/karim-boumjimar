"use client";

import { useEffect, useState } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the /showcase/mobile route's
 * looping demo. Designed for screen-recording at a phone-width
 * viewport (open the route at ≤ 767 px width or via Chrome
 * DevTools mobile emulation so ViewSwitcher mounts the WebGL
 * Pixi canvas instead of the desktop DOM canvas).
 *
 * Cycle:
 *
 *   diamond appearing animation (FAST mode — ~3.5 s, vs the
 *     production 6 s. Triggered by window.__FAST_INTRO__ which
 *     /showcase/mobile/page.tsx sets before mount, and which
 *     CanvasPixi reads lazily for both the camera tween and
 *     the per-tile fade-in stagger)
 *   bento holds briefly
 *   selectGroup(Symbiosis (MFA)) — camera flies to the cluster
 *   group view linger
 *   InspectorSheet pulls up to mid → holds 2 s → drops to peek
 *   expandGroup → FLIP-open into the gallery strip
 *   strip auto-scrolls to the far end (3 s)
 *   collapseGroup → FLIP-close (genie back to canvas tiles)
 *   tiles settle in cluster grid → linger
 *   resetToOverview → camera flies back AND tiles re-pack into
 *     the bento diamond
 *   white fades in over the diamond → recording bookend
 *
 * Recording: open the page, hit record at the moment the
 * diamond starts appearing, capture one full cycle (~30 s),
 * stop on the white frame. The video file can be set to loop
 * — the cycle ends on a white frame matching how it began
 * (mid splash-equivalent), so the loop is invisible.
 */

const PROJECT_KEY = "Symbiosis (MFA)|2025";

const T = {
  // Fast intro: 3500 ms reveal + 900 ms tile fade + decode buffer.
  // Matches getIntroRevealMs() inside CanvasPixi when
  // window.__FAST_INTRO__ is true.
  INTRO: 4000,
  BENTO_HOLD: 600,
  GROUP_FLY_IN: 5000,
  GROUP_LINGER: 800,
  // InspectorSheet sequence: pull-up (220 ms transition) + 2 s hold
  // + pull-down (220 ms) + brief settle.
  SHEET_UP_HOLD: 2200,
  SHEET_SETTLE: 600,
  GALLERY_OPEN: 3000,
  GALLERY_SCROLL: 3000,
  GALLERY_CLOSE: 3000,
  POST_CLOSE_LINGER: 1000,
  // Reset: 1500 ms camera + 2800 ms tile re-bento.
  RESET_FLY_BACK: 4500,
  FINAL_DIAMOND_HOLD: 2000,
  WHITE_FADE: 800,
  WHITE_HOLD: 600,
};

export function AutoPilotMobile() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const selectGroup = useSelection((s) => s.selectGroup);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);
  const setInspectorSheetSnap = useSelection((s) => s.setInspectorSheetSnap);

  // White overlay sits transparent for the cycle and only fades up
  // at the very end as a recording bookend. The diamond appearing
  // animation is the actual entry — we don't want to mask it.
  const [whiteOpacity, setWhiteOpacity] = useState(0);

  useEffect(() => {
    // Trigger the canvas's intro reveal animation (CanvasPixi will
    // read getIntroRevealMs() lazily and use the fast value because
    // /showcase/mobile/page.tsx already set window.__FAST_INTRO__).
    setSplashGone(true);

    let cancelled = false;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

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
      while (!cancelled) {
        // 1. Diamond appearing animation (fast mode).
        await wait(T.INTRO);
        if (cancelled) return;

        // 2. Bento holds briefly.
        await wait(T.BENTO_HOLD);
        if (cancelled) return;

        // 3. Tap on Symbiosis (MFA) — camera flies to the cluster.
        selectGroup(PROJECT_KEY);
        await wait(T.GROUP_FLY_IN);
        if (cancelled) return;

        // 4. Group view holds for a beat.
        await wait(T.GROUP_LINGER);
        if (cancelled) return;

        // 5. Pull the info tab up to "mid" — hold for 2 s — drop
        //    back to "peek". The InspectorSheet's external-snap
        //    effect picks up these store changes and animates the
        //    sheet through its 220 ms transition.
        setInspectorSheetSnap("mid");
        await wait(T.SHEET_UP_HOLD);
        if (cancelled) return;
        setInspectorSheetSnap("peek");
        await wait(T.SHEET_SETTLE);
        if (cancelled) return;
        // Hand control of the snap back to the sheet's internal
        // logic so the rest of the cycle behaves like a real user
        // session (the gallery-open effect would re-snap to peek
        // anyway, but releasing the override keeps things tidy).
        setInspectorSheetSnap(null);

        // 6. Open the gallery strip → genie open.
        expandGroup(PROJECT_KEY);
        await wait(T.GALLERY_OPEN);
        if (cancelled) return;

        // 7. Auto-scroll the strip to the far end.
        await scrollGalleryToEnd(T.GALLERY_SCROLL);
        if (cancelled) return;

        // 8. Close the gallery → genie close back to canvas tiles.
        collapseGroup();
        await wait(T.GALLERY_CLOSE);
        if (cancelled) return;

        // 9. Tiles settle in cluster grid — linger so the viewer
        //    sees the photographs land where they belong on the
        //    overview before we pull out.
        await wait(T.POST_CLOSE_LINGER);
        if (cancelled) return;

        // 10. Close group view → camera zooms back AND tiles
        //     re-pack into the bento diamond.
        resetToOverview();
        await wait(T.RESET_FLY_BACK);
        if (cancelled) return;

        // 11. Linger on the reformed diamond.
        await wait(T.FINAL_DIAMOND_HOLD);
        if (cancelled) return;

        // 12. White fades in for the loop bookend.
        setWhiteOpacity(1);
        await wait(T.WHITE_FADE);
        if (cancelled) return;
        await wait(T.WHITE_HOLD);
        if (cancelled) return;

        // 13. Loop reset: snap white back to 0 (no transition) so
        //     the next iteration's intro reveal plays in full view.
        //     We also need to retrigger the intro by toggling
        //     splashGone — but the canvas only fires its reveal
        //     effect on the false→true edge, and once true it
        //     stays. So subsequent loops just see the bento at
        //     rest with no fresh diamond animation. Recording one
        //     full cycle and using video-file looping is the
        //     intended workflow — the file's first frame is the
        //     diamond appearing, which seamlessly follows the
        //     last frame's white.
        setWhiteOpacity(0);
        // Without retriggering the intro reveal, the rest of the
        // loop body would race ahead immediately. Insert a hold
        // matching INTRO so the cycle pacing matches the first
        // iteration even though the visual won't.
        await wait(T.INTRO);
      }
    }

    void loop();

    return () => {
      cancelled = true;
      // Release the snap override on unmount so navigating away
      // from /showcase/mobile leaves the production sheet behaviour
      // intact for the next route.
      setInspectorSheetSnap(null);
    };
  }, [
    setSplashGone,
    selectGroup,
    expandGroup,
    collapseGroup,
    resetToOverview,
    setInspectorSheetSnap,
  ]);

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
