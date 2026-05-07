"use client";

import { useEffect, useState } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the /showcase route's looping
 * demo. Cycle:
 *
 *   white covers screen → fade out
 *   bento overview holds briefly
 *   selectGroup(Birds of Paradise) → camera flies in, tiles
 *     disperse, outlines fade in
 *   group view lingers (3 s)
 *   expandGroup → FLIP-open into the gallery strip
 *   gallery auto-scrolls horizontally to the end (3 s)
 *   collapseGroup → FLIP-close (genie back to canvas tiles)
 *   resetToOverview → camera zooms back to bento
 *   white fades back in over the bento → loop resets
 *
 * Recording tip: capture from one peak-white moment to the next
 * peak-white moment for a perfectly seamless loop. The first
 * iteration runs the canvas's intro reveal under the white
 * cover, so by the time the white fades out the bento is
 * already at its 100 % rest scale.
 */

const PROJECT_KEY = "Birds of Paradise|2026";

// Each timing buffers a small comfort margin past the underlying
// animation duration so the next action doesn't trip mid-tween.
const T = {
  // First-run cover: long enough for INTRO_REVEAL_MS (6000) + tile
  // fade stagger to land. Subsequent loops only see WHITE_HOLD.
  INITIAL_COVER: 6500,
  WHITE_FADE: 800,
  WHITE_HOLD: 600,
  BENTO_HOLD: 1000,
  GROUP_FLY_IN: 5000, // animateTransform 4500 in nav effect + buffer
  GROUP_LINGER: 3000, // requested: hold the cluster on screen
  GALLERY_OPEN: 3000, // FLIP open = 2400 + decode buffer
  GALLERY_SCROLL: 3000, // requested: 3 s scroll-to-end
  GALLERY_CLOSE: 3000, // FLIP close = 2400 + buffer
  RESET_FLY_BACK: 2000, // reset animateTransform = 1500 + buffer
};

export function AutoPilot() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const selectGroup = useSelection((s) => s.selectGroup);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  // White overlay covers everything between cycles. Starts at 1
  // so the first paint of /showcase is solid white — the canvas's
  // intro reveal animation plays under it, hidden, and is already
  // settled by the time we fade the white away.
  const [whiteOpacity, setWhiteOpacity] = useState(1);

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
      // First-run cover: hold the white in place while the canvas
      // does its intro reveal under it.
      await wait(T.INITIAL_COVER);
      if (cancelled) return;

      while (!cancelled) {
        // 1. Fade the white away to reveal the bento diamond.
        setWhiteOpacity(0);
        await wait(T.WHITE_FADE);
        if (cancelled) return;

        // 2. Bento holds for a beat.
        await wait(T.BENTO_HOLD);
        if (cancelled) return;

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

        // 9. Fade the white in to cover everything → loop reset.
        setWhiteOpacity(1);
        await wait(T.WHITE_FADE);
        if (cancelled) return;

        // 10. Hold full white briefly so a recording loop has a
        // crisp bookend frame to wrap on.
        await wait(T.WHITE_HOLD);
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
