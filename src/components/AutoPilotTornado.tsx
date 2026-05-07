"use client";

import { useEffect } from "react";
import { useSelection } from "@/lib/store";

/**
 * Headless component that drives the /showcase/tornado route's
 * looping demo. Cycle:
 *
 *   diamond appears (fast intro reveal)
 *   tiles sit at rest in the diamond for 2 s
 *   tiles swirl in a chaotic tornado for 3 s, easing back to rest
 *   loop
 *
 * Implementation: each tile keeps its existing
 * `transform: translate(dx, dy)` from WorkTile (the bento offset).
 * On top of that we set `style.translate` and `style.rotate` —
 * the individual CSS transform properties, which COMPOSE with
 * `transform` instead of overriding it. So setting
 * `translate: 100px 50px` on a tile pushes it 100/50 px relative
 * to its bento slot without touching React's managed transform
 * style. Clearing `translate`/`rotate` between phases returns
 * tiles to their bento slot exactly.
 *
 * Per-tile orbit parameters are derived from a stable hash of the
 * tile id, so the swirl is deterministic — every loop iteration
 * paints the same trajectories.
 *
 * Recording: capture from one rest moment to the next (~5 s total
 * per cycle). The trajectory ends exactly where it started, so
 * the video loops invisibly without a white wipe.
 *
 * Desktop only. The mobile Pixi canvas doesn't have DOM tiles to
 * grab via querySelector; if you load this on a phone width the
 * swirl simply has no targets and the diamond just sits there.
 */

const T = {
  // Wait for the fast intro reveal to land before the loop starts.
  // Matches getIntroRevealMs(true) in CanvasPixi (3500) plus a
  // small buffer; useCanvas (desktop) uses INTRO_REVEAL_MS = 6000
  // so on desktop the intro is 6s — but the route doesn't set
  // __FAST_INTRO__ since the desktop Canvas doesn't read it (yet).
  // Bumped to 6500 so the desktop intro fully lands.
  INITIAL_INTRO: 6500,
  // "sit back" beat — tiles at rest in the diamond.
  REST: 2000,
  // tornado swirl duration.
  SWIRL: 3000,
};

// Envelope on the swirl: ramps in over RAMP_IN ms, holds at 1,
// ramps back to 0 over RAMP_OUT ms. Means the swirl ends exactly
// at the bento positions (translate / rotate both reach 0), which
// is what makes the loop seamless.
const RAMP_IN = 400;
const RAMP_OUT = 600;

function envelope(elapsed: number, totalMs: number): number {
  if (elapsed <= 0 || elapsed >= totalMs) return 0;
  if (elapsed < RAMP_IN) {
    const t = elapsed / RAMP_IN;
    return t * t * (3 - 2 * t); // smoothstep
  }
  if (elapsed > totalMs - RAMP_OUT) {
    const t = (totalMs - elapsed) / RAMP_OUT;
    return t * t * (3 - 2 * t);
  }
  return 1;
}

// Stable per-tile hash → 0..1 float, used to seed orbit parameters
// so every cycle paints the same trajectories.
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

export function AutoPilotTornado() {
  const setSplashGone = useSelection((s) => s.setSplashGone);

  useEffect(() => {
    setSplashGone(true);

    let cancelled = false;
    let rafId: number | null = null;

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });
    }

    // Reset every tile's translate / rotate so they sit at their
    // bento slot. Called between phases and on unmount.
    function clearSwirl() {
      const tiles =
        document.querySelectorAll<HTMLElement>("[data-work-id]");
      tiles.forEach((tile) => {
        tile.style.translate = "";
        tile.style.rotate = "";
      });
    }

    function runSwirl(durationMs: number): Promise<void> {
      return new Promise((resolve) => {
        const tiles = Array.from(
          document.querySelectorAll<HTMLElement>("[data-work-id]"),
        );
        if (tiles.length === 0) {
          resolve();
          return;
        }
        // Cache per-tile orbit params. Two independent seeds per
        // tile (one for primary orbit, one for vertical sway) so
        // the motion has visible counter-rotation between
        // neighbours and doesn't read as a uniform rotation of
        // the whole bento.
        const orbits = tiles.map((tile) => {
          const id = tile.getAttribute("data-work-id") ?? "_";
          const s1 = hash01(id);
          const s2 = hash01(id + "::sway");
          const dir = s1 < 0.5 ? -1 : 1;
          return {
            tile,
            radius: 80 + 220 * s1, // px
            angularSpeed: dir * (1.4 + 2.6 * s1) * Math.PI * 2, // rad/s
            phase: s2 * Math.PI * 2,
            sway: 30 + 90 * s2, // px vertical sway
            swayFreq: (0.7 + 1.3 * s2) * Math.PI * 2, // rad/s
            rotSpeed: (s1 - 0.5) * 720, // deg/s, can be negative
          };
        });

        const startTs = performance.now();
        function tick(now: number) {
          if (cancelled) {
            clearSwirl();
            resolve();
            return;
          }
          const elapsedMs = now - startTs;
          const elapsedSec = elapsedMs / 1000;
          const env = envelope(elapsedMs, durationMs);

          for (const o of orbits) {
            const angle = o.angularSpeed * elapsedSec + o.phase;
            const r = o.radius * env;
            const dx = r * Math.cos(angle);
            const dy =
              r * Math.sin(angle) +
              env * o.sway * Math.sin(o.swayFreq * elapsedSec);
            const rot = env * o.rotSpeed * elapsedSec;
            o.tile.style.translate = `${dx}px ${dy}px`;
            o.tile.style.rotate = `${rot}deg`;
          }

          if (elapsedMs >= durationMs) {
            clearSwirl();
            resolve();
            return;
          }
          rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);
      });
    }

    async function loop() {
      // Wait for the diamond to appear (intro reveal) before the
      // loop starts. The first cycle's REST coincides with the end
      // of the reveal — viewer sees the diamond settle, then the
      // tornado kicks off.
      await wait(T.INITIAL_INTRO);
      if (cancelled) return;

      while (!cancelled) {
        // 1. Sit at rest in the diamond.
        await wait(T.REST);
        if (cancelled) return;

        // 2. Swirl, ending exactly back at the diamond.
        await runSwirl(T.SWIRL);
        if (cancelled) return;
      }
    }

    void loop();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      clearSwirl();
    };
  }, [setSplashGone]);

  return null;
}
