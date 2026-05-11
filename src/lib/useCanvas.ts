"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  centerOn,
  clampPan,
  clampScale,
  clampTransform,
  fitAllTransform,
  fitBboxTransform,
  workBounds,
  type Transform,
  zoomAt,
} from "@/lib/canvas-math";
import { useSelection } from "@/lib/store";
import type { Work } from "@/types/work";

const TOPBAR_H = 48;
export const LEFT_TOOLBAR_W_FULL = 200;
// Width of the slim "show sections" handle when the toolbar is hidden.
export const LEFT_TOOLBAR_W_CONDENSED = 24;
// Single merged ProjectPanel covers both the work fields and the
// project description. The previous Inspector aside is gone.
const PROJECT_PANEL_W = 420;
// Works Index drawer on the left when open — same width as
// ProjectPanel for visual symmetry. We treat it as additional
// left chrome in viewport math so groups still center within the
// FREE canvas area, not behind the drawer.
const INDEX_DRAWER_W = 420;
const SHEET_TOP_RESERVE = 80; // matches InspectorSheet TOP_RESERVE_PX
const SHEET_MID_FRACTION = 0.45; // matches InspectorSheet "mid" snap

function leftWidth() {
  if (typeof window === "undefined") return LEFT_TOOLBAR_W_FULL;
  const condensed = !!(
    useSelection.getState().selectedId ||
    useSelection.getState().selectedGroupKey
  );
  return condensed ? LEFT_TOOLBAR_W_CONDENSED : LEFT_TOOLBAR_W_FULL;
}

function viewportRect() {
  if (typeof window === "undefined") {
    return {
      x: LEFT_TOOLBAR_W_FULL,
      y: TOPBAR_H,
      w: 1024 - LEFT_TOOLBAR_W_FULL,
      h: 600,
    };
  }
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  const { selectedId, selectedGroupKey, expandedGroupKey, indexOpen } =
    useSelection.getState();
  // The index drawer slides over the LeftToolbar so we don't add
  // both — pick the wider of the two when the drawer is open.
  const baseLeft = isDesktop ? leftWidth() : 0;
  const leftW =
    isDesktop && indexOpen ? Math.max(baseLeft, INDEX_DRAWER_W) : baseLeft;
  // Single ProjectPanel renders when anything is selected. Subtract
  // its width so groups center within the actual free canvas area.
  const rightW =
    isDesktop && (selectedId || selectedGroupKey) ? PROJECT_PANEL_W : 0;
  // Mobile bottom sheet: only renders when the user has actively selected
  // something AND the gallery isn't open. When it's visible it sits at
  // "mid" snap (~55% of its full height showing), so subtract the matching
  // height so groups center in the actually-visible canvas area above it.
  let bottomChrome = 0;
  if (!isDesktop) {
    const sheetVisible =
      !!(selectedId || selectedGroupKey) && !expandedGroupKey;
    if (sheetVisible) {
      const sheetH = Math.max(200, window.innerHeight - SHEET_TOP_RESERVE);
      bottomChrome =
        window.innerHeight - (SHEET_TOP_RESERVE + sheetH * SHEET_MID_FRACTION);
    }
  }
  return {
    x: leftW,
    y: TOPBAR_H,
    w: window.innerWidth - leftW - rightW,
    h: window.innerHeight - TOPBAR_H - bottomChrome,
  };
}

type Bbox = { minX: number; minY: number; maxX: number; maxY: number };

export function useCanvas(
  works: Work[],
  bentoBbox?: Bbox,
  /** The works' natural bbox once spread (groups apart). When dispersion
   * flips to 1, pan clamping switches from bento to this. */
  spreadBbox?: Bbox,
  /** Per-tile offset from its natural position to where it actually
   * renders post-spread. Mobile uses this to stack groups in a 2-col
   * vertical layout; on desktop it's empty. The camera must apply it
   * when navigating, otherwise nav-to-group lands on empty space where
   * the bbox sits in canvas coords but no tile is rendered. */
  destOffsets?: Map<string, { x: number; y: number }>,
  /** The inner wrapper div that carries the camera transform. Pan +
   * zoom mutate `wrapperRef.current.style.transform` directly each
   * frame so React doesn't re-render Canvas (and its 133-tile JSX
   * tree) at 60 Hz. The component MUST omit `transform` from this
   * div's JSX style so React doesn't overwrite our DOM mutations
   * on its next render. */
  wrapperRef?: RefObject<HTMLDivElement | null>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Identical initial state on server and client to keep hydration deterministic.
  // The 75% framing is applied via useLayoutEffect below, runs synchronously after
  // mount, before paint, so users never see the un-framed state.
  //
  // NOTE: this React state is now a "committed" snapshot, not the live
  // camera position. Per-frame pan/zoom updates write to transformRef
  // + wrapperRef.style.transform via applyTransform(); React state is
  // only synced on natural endpoints (wheel-idle, pointerup, inertia
  // stop, programmatic-tween end). See applyTransform / commitTransform
  // below.
  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: TOPBAR_H,
    scale: 0.15,
  });
  const transformRef = useRef(transform);
  // Intentionally NOT mirroring `transform` to `transformRef.current` on
  // every render — applyTransform owns the ref. Mirroring would clobber
  // a fresh in-flight update with stale React state.
  const initializedRef = useRef(false);
  // True when the user has interacted (click, drag, wheel, pinch). Used to
  // skip the auto-zoom from 75% to 100% if the user took action first.
  const userInteractedRef = useRef(false);
  // dispersion is a binary 0/1 with hysteresis driven by zoom level
  //   - scale > bentoFit * 1.25  -> dispersion = 1 (spread, groups apart)
  //   - scale <= bentoFit * 0.75 -> dispersion = 0 (bento, packed mound)
  // Anywhere between, the value sticks to its previous setting.
  const [dispersion, setDispersion] = useState(0);
  // bentoFit is computed once per viewport / bento bbox change. Stable so
  // pan/zoom math doesn't fluctuate as the user interacts.
  const bentoFit = useMemo(() => {
    if (typeof window === "undefined" || !bentoBbox) return 1;
    return fitBboxTransform(bentoBbox, {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    }).scale;
  }, [bentoBbox]);
  // User can zoom from 75% (re-bento threshold) up to 7.5x of bento fit.
  const userScaleBounds = useMemo(
    () => ({ min: bentoFit * 0.75, max: bentoFit * 7.5 }),
    [bentoFit],
  );
  // Active bbox for pan/zoom clamping. Switches between bento and spread
  // following dispersion. 15% padding so edges feel like a soft cushion,
  // not a wall.
  const panBbox = useMemo<Bbox | undefined>(() => {
    const b = dispersion === 0 ? bentoBbox : spreadBbox;
    if (!b) return undefined;
    const padX = (b.maxX - b.minX) * 0.15;
    const padY = (b.maxY - b.minY) * 0.15;
    return {
      minX: b.minX - padX,
      maxX: b.maxX + padX,
      minY: b.minY - padY,
      maxY: b.maxY + padY,
    };
  }, [dispersion, bentoBbox, spreadBbox]);
  const clampedZoom = useCallback(
    (
      t: Transform,
      rawFactor: number,
      sx: number,
      sy: number,
      vp: { x: number; y: number; w: number; h: number },
    ) => {
      const target = Math.max(
        userScaleBounds.min,
        Math.min(userScaleBounds.max, t.scale * rawFactor),
      );
      const effective = target / t.scale;
      const next = zoomAt(t, effective, sx, sy, vp);
      return panBbox ? clampTransform(next, vp, panBbox) : next;
    },
    [userScaleBounds, panBbox],
  );
  // Clamp a pure-pan transform so the user can't drift into white space.
  // Uses clampPan (not clampTransform) so the user's scale is never
  // snapped mid-gesture: only tx/ty are constrained.
  const clampedPan = useCallback(
    (next: Transform, vp: { x: number; y: number; w: number; h: number }) =>
      panBbox ? clampPan(next, vp, panBbox) : next,
    [panBbox],
  );

  // ─── Hot-path transform plumbing ─────────────────────────────────
  //
  // `applyTransform(next)` is the per-frame DOM mutation called from
  // wheel / pointer / inertia handlers. It writes to the wrapper's
  // style.transform directly so React doesn't have to re-render
  // Canvas (and reconcile its 133-tile JSX tree) at 60 Hz.
  //
  // `commitTransform()` syncs React state with the live ref. Called
  // on natural endpoints (wheel-idle, pointerup, inertia stop) so
  // any consumer that reads `transform` from the hook output sees
  // the settled value when the gesture ends.
  //
  // Mirror dispersion + bentoFit into refs so applyTransform can
  // run the dispersion threshold check synchronously without
  // forcing the user to wait until commit-on-idle to see tiles
  // start spreading.
  const dispersionRef = useRef(0);
  const bentoFitRef = useRef(bentoFit);
  bentoFitRef.current = bentoFit;

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    const el = wrapperRef?.current;
    if (el) {
      el.style.transform = `translate3d(${next.tx}px, ${next.ty}px, 0) scale(${next.scale})`;
    }
    // Dispersion threshold check on the hot path — fires immediately
    // when the user crosses the threshold mid-gesture, so tiles start
    // spreading without waiting for commit-on-idle. The actual
    // setDispersion / showToolbar work happens at most twice per
    // session (one flip up, one flip back), so this is cheap.
    const bf = bentoFitRef.current;
    if (bf > 0) {
      const d = dispersionRef.current;
      if (next.scale > bf * 1.25 && d === 0) {
        dispersionRef.current = 1;
        setDispersion(1);
      } else if (next.scale <= bf && d === 1) {
        dispersionRef.current = 0;
        setDispersion(0);
        const s = useSelection.getState();
        if (!s.expandedGroupKey && (s.selectedId || s.selectedGroupKey)) {
          s.showToolbar();
        }
      }
    }
  }, [wrapperRef]);

  // Sync React state with the live ref. Call after a gesture has
  // settled (wheel-idle, pointerup, inertia stop) so anything that
  // reads `transform` via the hook's return value sees the final
  // committed position.
  const commitTransform = useCallback(() => {
    setTransform(transformRef.current);
  }, []);

  useLayoutEffect(() => {
    if (initializedRef.current || !works.length) return;
    initializedRef.current = true;
    let initial: Transform;
    if (bentoBbox) {
      // Initial framing: bento at 75% of its fit scale. Tiles are packed and
      // sit small with breathing room around them so the whole mound reads at
      // a glance while there's room for an auto-zoom to follow.
      const v = viewportRect();
      const fit = fitBboxTransform(bentoBbox, v).scale;
      const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
      const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
      const startScale = fit * 0.75;
      initial = {
        tx: v.w / 2 - cx * startScale,
        ty: v.h / 2 - cy * startScale,
        scale: startScale,
      };
    } else {
      initial = fitAllTransform(works, viewportRect());
    }
    // applyTransform writes to ref + DOM; setTransform mirrors React
    // state so the first paint of the wrapper sees the right transform
    // and so anything reading `transform` from the hook output starts
    // with the right value.
    applyTransform(initial);
    setTransform(initial);
  }, [works, bentoBbox, applyTransform]);

  // When the left toolbar slides out / back in (desktop only), the canvas
  // container's left edge shifts by (LEFT_TOOLBAR_W_FULL - LEFT_TOOLBAR_W_CONDENSED).
  // Compensate the tx so tile screen positions stay anchored. The toolbar is
  // hidden on mobile (md:flex), so this compensation must NOT run there or
  // the canvas content jumps 176px every time the user makes a selection.
  const condensed = useSelection((s) => !!(s.selectedId || s.selectedGroupKey));
  const prevCondensedRef = useRef(condensed);
  useEffect(() => {
    if (prevCondensedRef.current === condensed) return;
    prevCondensedRef.current = condensed;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const widthDelta = LEFT_TOOLBAR_W_FULL - LEFT_TOOLBAR_W_CONDENSED; // 176
    // Toolbar shrinking, container shifts left, bump tx right to compensate.
    const txDelta = condensed ? widthDelta : -widthDelta;
    const next = {
      ...transformRef.current,
      tx: transformRef.current.tx + txDelta,
    };
    applyTransform(next);
    setTransform(next);
  }, [condensed, applyTransform]);

  const [isDragging, setIsDragging] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  // True while a navigation-driven transform change is animating. Keeps a CSS
  // transition on the wrapper for ~400ms then turns off so pan/zoom feels instant.
  const [isAnimating, setIsAnimating] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef(false);
  const animateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Kinetic inertia ──────────────────────────────────────────
  // After the user stops scrolling / pinching / panning, the camera
  // keeps gliding for a beat with exponential friction. Captures
  // velocity from gesture events via EMA, then a rAF loop drains
  // it. New input cancels in-flight inertia so the user always has
  // direct control during a gesture.
  const velocityRef = useRef({
    vx: 0, // pan velocity, screen px / ms
    vy: 0,
    vScale: 0, // log-scale velocity per ms (positive = zoom in)
    cx: 0, // last gesture center x — used to keep inertia zooming
    cy: 0, // around the same point the user was pinching/wheeling.
  });
  const wheelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inertiaRafRef = useRef<number | null>(null);
  // Last-seen wheel timestamp, so we can compute per-event dt for
  // the EMA. NaN/Infinity-safe: handler clamps dt to [1, 64] ms.
  const lastWheelTsRef = useRef<number>(0);
  const lastPinchTsRef = useRef<number>(0);
  // Ring of recent pointer-move samples for release-velocity. We
  // average across ~80 ms of samples instead of using just the
  // last frame, otherwise the release velocity is whatever jitter
  // the user's last pixel of motion happened to be.
  const dragSamplesRef = useRef<{ x: number; y: number; t: number }[]>([]);

  // Stop any in-flight inertia rAF loop and pending wheel-idle
  // timer. Does NOT zero velocity — call sites that need a fresh
  // gesture (eg. pointerdown, touchstart) reset velocity manually.
  const cancelInertia = useCallback(() => {
    if (inertiaRafRef.current != null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    if (wheelIdleTimerRef.current != null) {
      clearTimeout(wheelIdleTimerRef.current);
      wheelIdleTimerRef.current = null;
    }
  }, []);

  // Begin draining velocityRef via rAF + exponential friction.
  // No-op if there's already a loop running or if velocity is
  // below the minimum threshold (no perceptible glide).
  const startInertia = useCallback(() => {
    if (inertiaRafRef.current != null) return;
    const v0 = velocityRef.current;
    if (
      Math.abs(v0.vx) < 0.02 &&
      Math.abs(v0.vy) < 0.02 &&
      Math.abs(v0.vScale) < 0.0001
    ) {
      return;
    }
    let lastTs = performance.now();
    function tick(now: number) {
      const v = velocityRef.current;
      // Cap dt so a tab returning from background doesn't catapult
      // the camera (one giant frame of accumulated dt × velocity).
      const dt = Math.min(40, now - lastTs);
      lastTs = now;
      // Velocity halves every ~200 ms — long enough to read as a
      // glide, short enough to settle before the user wonders if
      // something's broken. ~95% gone by 800 ms.
      const friction = Math.pow(0.5, dt / 200);
      v.vx *= friction;
      v.vy *= friction;
      v.vScale *= friction;
      let next = transformRef.current;
      let any = false;
      if (Math.abs(v.vScale) > 0.00003) {
        const factor = Math.exp(v.vScale * dt);
        next = clampedZoom(next, factor, v.cx, v.cy, viewportRect());
        any = true;
      }
      if (Math.abs(v.vx) > 0.015 || Math.abs(v.vy) > 0.015) {
        next = clampedPan(
          {
            tx: next.tx + v.vx * dt,
            ty: next.ty + v.vy * dt,
            scale: next.scale,
          },
          viewportRect(),
        );
        any = true;
      }
      if (!any) {
        v.vx = 0;
        v.vy = 0;
        v.vScale = 0;
        inertiaRafRef.current = null;
        // Sync React state once the inertia loop is done so anything
        // that reads `transform` (gallery FLIP source rect, navigation
        // effects) sees the settled value.
        commitTransform();
        return;
      }
      applyTransform(next);
      inertiaRafRef.current = requestAnimationFrame(tick);
    }
    inertiaRafRef.current = requestAnimationFrame(tick);
  }, [clampedZoom, clampedPan, applyTransform, commitTransform]);

  const [animDuration, setAnimDuration] = useState(1800);
  // True while a programmatic camera animation is in flight. The
  // zoom-driven dispersion and gallery effects skip when this is true,
  // otherwise they'd fire as the camera sweeps through their thresholds
  // mid-animation (eg. opening the gallery briefly during a nav-to-group
  // before settling below threshold).
  const programmaticAnimRef = useRef(false);
  const animateTransform = useCallback(
    (next: Transform, duration = 1800) => {
      if (animateTimerRef.current) clearTimeout(animateTimerRef.current);
      // A programmatic camera move overrides any user-gesture
      // inertia — otherwise the glide fights the tween.
      cancelInertia();
      velocityRef.current.vx = 0;
      velocityRef.current.vy = 0;
      velocityRef.current.vScale = 0;
      programmaticAnimRef.current = true;
      setIsAnimating(true);
      setAnimDuration(duration);
      // applyTransform mutates wrapper.style.transform; CSS transition
      // (which the wrapper has while isAnimating=true) animates from
      // the OLD DOM value to this new value over `duration` ms.
      applyTransform(next);
      // Sync React state so consumers reading `transform` see the
      // settled value immediately (the visual interpolation runs in
      // browser compositing land, not in JS).
      setTransform(next);
      animateTimerRef.current = setTimeout(() => {
        setIsAnimating(false);
        programmaticAnimRef.current = false;
      }, duration + 80);
    },
    [cancelInertia, applyTransform],
  );

  // Auto-zoom from 75% to 100% of bento fit, starting THE INSTANT
  // the splash clears and running over INTRO_REVEAL_MS (= 6000).
  // Same duration as the per-tile fade-in window so the camera
  // settles the same moment the last tile reaches alpha 1.
  // Skipped if the user has already interacted in that window.
  const INTRO_REVEAL_MS = 6000;
  const splashGone = useSelection((s) => s.splashGone);
  useEffect(() => {
    if (!bentoBbox || !splashGone) return;
    if (userInteractedRef.current) return;
    const v = viewportRect();
    const fit = fitBboxTransform(bentoBbox, v).scale;
    const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
    const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
    animateTransform(
      {
        tx: v.w / 2 - cx * fit,
        ty: v.h / 2 - cy * fit,
        scale: fit,
      },
      INTRO_REVEAL_MS,
    );
  }, [bentoBbox, splashGone, animateTransform]);

  // Top-bar logo click → animate the camera back to the bento fit.
  // The store action also clears selection / toolbarHidden / view,
  // so all we have to do here is run the camera tween. Skip the
  // first render: the token starts at 0 and we don't want to
  // animate on mount (the intro reveal handles that).
  const navResetOverviewToken = useSelection(
    (s) => s.navResetOverviewToken,
  );
  const lastResetTokenRef = useRef(navResetOverviewToken);
  useEffect(() => {
    if (navResetOverviewToken === lastResetTokenRef.current) return;
    lastResetTokenRef.current = navResetOverviewToken;
    if (!bentoBbox) return;
    const v = viewportRect();
    const fit = fitBboxTransform(bentoBbox, v).scale;
    const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
    const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
    animateTransform(
      {
        tx: v.w / 2 - cx * fit,
        ty: v.h / 2 - cy * fit,
        scale: fit,
      },
      1500,
    );
  }, [navResetOverviewToken, bentoBbox, animateTransform]);

  // Replay-intro token. Demo routes (notably /showcase/bento-entry)
  // bump the token via store.replayIntro() to loop the diamond
  // appearing animation. Snaps the camera back to the 75 %-bento
  // start position, clears the user-interaction gate, and
  // animates back to 100 % bento — same trajectory as the regular
  // first-paint intro.
  const introReplayToken = useSelection((s) => s.introReplayToken);
  const lastIntroReplayTokenRef = useRef(introReplayToken);
  useEffect(() => {
    if (introReplayToken === lastIntroReplayTokenRef.current) return;
    lastIntroReplayTokenRef.current = introReplayToken;
    if (!bentoBbox) return;
    const v = viewportRect();
    const fit = fitBboxTransform(bentoBbox, v).scale;
    const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
    const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
    // Snap to 75 %-bento with no transition so the replay starts
    // from the same place the natural intro does. The follow-up
    // animateTransform handles the visible reveal.
    const startSnap = {
      tx: v.w / 2 - cx * fit * 0.75,
      ty: v.h / 2 - cy * fit * 0.75,
      scale: fit * 0.75,
    };
    applyTransform(startSnap);
    setTransform(startSnap);
    // Clear the user-interaction gate so the dispersion-tracker
    // and dispersion don't behave as if mid-session.
    userInteractedRef.current = false;
    // Tween to settled bento on the next frame.
    requestAnimationFrame(() => {
      animateTransform(
        {
          tx: v.w / 2 - cx * fit,
          ty: v.h / 2 - cy * fit,
          scale: fit,
        },
        4000,
      );
    });
  }, [introReplayToken, bentoBbox, animateTransform, applyTransform]);

  // Flick-pan injection. /showcase/inertia bumps flickPanToken
  // with desired (vx, vy) in screen px / ms. We seed velocityRef
  // with those values and kick off the same kinetic-inertia rAF
  // loop a real wheel / drag release would trigger, so the demo
  // exercises the production glide path rather than a one-off
  // replica.
  const flickPanToken = useSelection((s) => s.flickPanToken);
  const flickPanVx = useSelection((s) => s.flickPanVx);
  const flickPanVy = useSelection((s) => s.flickPanVy);
  const lastFlickTokenRef = useRef(flickPanToken);
  useEffect(() => {
    if (flickPanToken === lastFlickTokenRef.current) return;
    lastFlickTokenRef.current = flickPanToken;
    if (flickPanToken === 0) return;
    cancelInertia();
    velocityRef.current.vx = flickPanVx;
    velocityRef.current.vy = flickPanVy;
    velocityRef.current.vScale = 0;
    startInertia();
  }, [flickPanToken, flickPanVx, flickPanVy, cancelInertia, startInertia]);

  // Programmatic zoom-by-factor. Demos call zoomCameraBy(factor, ms)
  // to animate the camera's scale by the supplied factor centered
  // on the viewport. Drives the same clampedZoom path the wheel
  // handler uses, so the dispersion-tracker + tile transitions
  // fire on the threshold cross identically to a real pinch.
  const zoomCameraToken = useSelection((s) => s.zoomCameraToken);
  const zoomCameraFactor = useSelection((s) => s.zoomCameraFactor);
  const zoomCameraDurationMs = useSelection(
    (s) => s.zoomCameraDurationMs,
  );
  const lastZoomTokenRef = useRef(zoomCameraToken);
  useEffect(() => {
    if (zoomCameraToken === lastZoomTokenRef.current) return;
    lastZoomTokenRef.current = zoomCameraToken;
    if (zoomCameraToken === 0) return;
    const v = viewportRect();
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const startScale = transformRef.current.scale;
    const targetScale = startScale * zoomCameraFactor;
    const startTs = performance.now();
    let raf: number | null = null;
    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function tick(now: number) {
      if (zoomCameraToken !== lastZoomTokenRef.current) return;
      const t = Math.min(1, (now - startTs) / zoomCameraDurationMs);
      const eased = ease(t);
      const scale = startScale * Math.pow(targetScale / startScale, eased);
      const factor = scale / transformRef.current.scale;
      const next = clampedZoom(
        transformRef.current,
        factor,
        cx,
        cy,
        viewportRect(),
      );
      applyTransform(next);
      // Sync React state at the END of the tween only.
      if (t >= 1) setTransform(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [
    zoomCameraToken,
    zoomCameraFactor,
    zoomCameraDurationMs,
    clampedZoom,
    applyTransform,
  ]);

  // Drive dispersion from the current zoom level with hysteresis. The
  // tiles spread out (groups apart) once the camera passes 125% of the
  // bento fit, and re-pack to bento once it drops back to or below
  // bentoFit. The 25 % gap (1.0 → 1.25) is hysteresis so the layout
  // doesn't flicker near the threshold.
  //
  // The lower bound used to be 0.75 * bentoFit, but at that aggressive
  // a value the dispersion-tracker never fired during a logo-reset
  // (whose camera target is exactly bentoFit), and the bento "diamond"
  // never re-formed at the end of the cycle — tiles stayed at their
  // cluster positions even though the camera was framed at overview
  // scale. Tightening the lower bound to bentoFit makes the reset
  // tween cross the threshold cleanly and tiles re-pack into the
  // diamond as the camera lands.
  //
  // When we re-pack to bento we're visually back at the overview, so
  // any pinned project context (Inspector + ProjectPanel) is no longer
  // relevant — drop it AND reveal the LeftToolbar (showToolbar clears
  // toolbarHidden + the selection in one go). Returning to overview is
  // a clear "I'm done with this project" signal, so the site nav
  // should be there waiting. Skip if the gallery is open: that flow
  // has its own close path and we don't want a stray scale change
  // while ExpandedGroup is mounted to nuke the selection underneath
  // it.
  useEffect(() => {
    if (!bentoFit) return;
    if (transform.scale > bentoFit * 1.25 && dispersion === 0) {
      setDispersion(1);
    } else if (transform.scale <= bentoFit && dispersion === 1) {
      setDispersion(0);
      const s = useSelection.getState();
      if (!s.expandedGroupKey && (s.selectedId || s.selectedGroupKey)) {
        s.showToolbar();
      }
    }
  }, [transform.scale, bentoFit, dispersion]);

  // Mirror dispersion state into dispersionRef so the hot-path
  // applyTransform() check sees the latest value. Without this the
  // ref would drift if dispersion ever changes via this useEffect
  // (during programmatic anims that go via setTransform alone).
  useEffect(() => {
    dispersionRef.current = dispersion;
  }, [dispersion]);

  // Re-fit on resize (only the first time we set it; respect the user's pan/zoom afterwards).
  // We *don't* auto-refit on every resize because that would yank the user out of context.
  // We DO clamp scale on resize so the user doesn't get stranded with empty space.
  useEffect(() => {
    function onResize() {
      // No auto-refit. Could expose a "fit" button if needed.
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cancel any in-flight inertia on unmount so the rAF loop and
  // wheel-idle timer don't outlive the component (would dispatch
  // setTransform on an unmounted hook).
  useEffect(() => {
    return () => {
      cancelInertia();
    };
  }, [cancelInertia]);

  // Wheel handler (must be non-passive to call preventDefault).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      userInteractedRef.current = true;
      // Cancel any in-flight programmatic animation: the user is taking
      // over the camera, the long CSS transition would make their input
      // feel laggy.
      if (animateTimerRef.current) {
        clearTimeout(animateTimerRef.current);
        animateTimerRef.current = null;
      }
      programmaticAnimRef.current = false;
      setIsAnimating(false);
      // If a wheel event arrives while inertia is running, the user
      // is taking back direct control — kill the glide and reset
      // velocity so direction changes feel instant. Inside the same
      // active wheel burst (no inertia running), velocity keeps
      // accumulating via EMA so it survives across events.
      if (inertiaRafRef.current != null) {
        cancelAnimationFrame(inertiaRafRef.current);
        inertiaRafRef.current = null;
        velocityRef.current.vx = 0;
        velocityRef.current.vy = 0;
        velocityRef.current.vScale = 0;
      }
      if (wheelIdleTimerRef.current != null) {
        clearTimeout(wheelIdleTimerRef.current);
        wheelIdleTimerRef.current = null;
      }
      const now = performance.now();
      const dt = Math.max(
        1,
        Math.min(64, now - (lastWheelTsRef.current || now)),
      );
      lastWheelTsRef.current = now;
      const t = transformRef.current;
      const v = velocityRef.current;
      // Mac trackpad pinch sets ctrlKey; explicit Cmd/Ctrl+wheel also zooms.
      // Sensitivity dialled down further (0.0025 from 0.005) so the camera
      // glides instead of snapping — the previous setting still felt abrupt
      // on Mac trackpads where deltaY arrives in larger increments.
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0025);
        applyTransform(
          clampedZoom(t, factor, e.clientX, e.clientY, viewportRect()),
        );
        // Track zoom velocity in log-scale per ms. EMA with
        // alpha=0.35 — recent samples weighted heavier but the
        // tail of older fast samples isn't washed out by the OS
        // momentum-decay events that arrive last.
        const sample = (-e.deltaY * 0.0025) / dt;
        v.vScale = v.vScale * 0.65 + sample * 0.35;
        v.vx = 0;
        v.vy = 0;
        v.cx = e.clientX;
        v.cy = e.clientY;
      } else {
        // Trackpads emit deltaX + deltaY natively. Wheel mice only emit
        // deltaY; Shift+wheel converts that into horizontal pan (Figma
        // convention). Pan sensitivity dialled to 35% so panning feels
        // calmer — 60% was still overshooting on touchpads.
        const PAN_SENS = 0.35;
        let dx = e.deltaX * PAN_SENS;
        let dy = e.deltaY * PAN_SENS;
        if (e.shiftKey && Math.abs(e.deltaX) < 0.001) {
          dx = dy;
          dy = 0;
        }
        applyTransform(
          clampedPan(
            { tx: t.tx - dx, ty: t.ty - dy, scale: t.scale },
            viewportRect(),
          ),
        );
        // Track pan velocity in screen px / ms. Same EMA shape as
        // the zoom branch.
        const sampleVx = -dx / dt;
        const sampleVy = -dy / dt;
        v.vx = v.vx * 0.65 + sampleVx * 0.35;
        v.vy = v.vy * 0.65 + sampleVy * 0.35;
        v.vScale = 0;
      }
      // Schedule inertia for 80 ms after this event. If another
      // wheel event arrives first, the timer is reset above and
      // inertia never fires — the user is still actively scrolling.
      // Once events truly stop, the timer fires and the camera
      // glides with whatever velocity the EMA captured. The
      // inertia loop will commit the final transform to React state
      // when it stops; if the velocity is below the threshold and
      // inertia is a no-op, commit here so React state catches up.
      wheelIdleTimerRef.current = setTimeout(() => {
        wheelIdleTimerRef.current = null;
        const v0 = velocityRef.current;
        const willGlide =
          Math.abs(v0.vx) >= 0.02 ||
          Math.abs(v0.vy) >= 0.02 ||
          Math.abs(v0.vScale) >= 0.0001;
        if (willGlide) {
          startInertia();
        } else {
          commitTransform();
        }
      }, 80);
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [clampedZoom, clampedPan, startInertia, applyTransform, commitTransform]);

  // Pointer drag pan. Triggers on:
  //  - background left-click drag (click on canvas, not on a tile)
  //  - any drag while spacebar held (Figma convention)
  //  - middle-click drag (Figma convention)
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const onWork = !!target.closest("[data-work-id]");
      const isMouse = e.pointerType === "mouse";
      const isMiddle = isMouse && e.button === 1;
      const isLeft = isMouse && e.button === 0;
      // Skip non-left/middle mouse buttons (right-click etc).
      if (isMouse && !isLeft && !isMiddle) return;
      // For left-click, let tile clicks through unless space is held.
      if (isLeft && onWork && !spaceHeld) return;
      // Middle-click should always pan, even on a tile (Figma).
      if (isMiddle) e.preventDefault();
      userInteractedRef.current = true;
      if (animateTimerRef.current) {
        clearTimeout(animateTimerRef.current);
        animateTimerRef.current = null;
      }
      programmaticAnimRef.current = false;
      setIsAnimating(false);
      // Pointer-down is a fresh gesture: kill any glide and zero
      // velocity so the user starts from rest.
      cancelInertia();
      velocityRef.current.vx = 0;
      velocityRef.current.vy = 0;
      velocityRef.current.vScale = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      dragMovedRef.current = false;
      // Seed the sample ring so the FIRST move event has something
      // to compute a delta against.
      dragSamplesRef.current = [
        { x: e.clientX, y: e.clientY, t: performance.now() },
      ];
    },
    [spaceHeld, cancelInertia],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragOriginRef.current) return;
      const rawDx = e.clientX - dragOriginRef.current.x;
      const rawDy = e.clientY - dragOriginRef.current.y;
      if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3)
        dragMovedRef.current = true;
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      // Drag pan is 1:1 with the cursor/finger so the canvas follows the
      // pointer exactly -- otherwise it feels uncalibrated, especially
      // on touch where the user expects the tile under their finger to
      // stay there.
      const t = transformRef.current;
      applyTransform(
        clampedPan(
          { tx: t.tx + rawDx, ty: t.ty + rawDy, scale: t.scale },
          viewportRect(),
        ),
      );
      // Record the sample for release-velocity. Trim to the most
      // recent ~80 ms — older samples are slower-moving fragments
      // of the gesture that would dilute the post-release glide
      // into the wrong direction.
      const samples = dragSamplesRef.current;
      const now = performance.now();
      samples.push({ x: e.clientX, y: e.clientY, t: now });
      const cutoff = now - 80;
      while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
    },
    [isDragging, clampedPan, applyTransform],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragOriginRef.current = null;
      // Kick off inertia using the velocity captured over the last
      // 80 ms of pointer-move samples. Sign matches drag direction
      // (drag moves the canvas *with* the pointer, 1:1), so no
      // negation needed here — opposite of the wheel pan branch.
      const samples = dragSamplesRef.current;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = Math.max(1, last.t - first.t);
        velocityRef.current.vx = (last.x - first.x) / dt;
        velocityRef.current.vy = (last.y - first.y) / dt;
        velocityRef.current.vScale = 0;
        startInertia();
      }
      // If the user just tapped without flicking (no inertia), commit
      // the small drag delta to React state so consumers see the
      // settled position. startInertia commits at its own end.
      if (samples.length < 2) {
        commitTransform();
      }
      dragSamplesRef.current = [];
    },
    [isDragging, startInertia, commitTransform],
  );

  // Pinch zoom (touch). Tracks two-finger distance and scales accordingly.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let pinchCenter: { x: number; y: number } | null = null;

    function distance(t1: Touch, t2: Touch) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        userInteractedRef.current = true;
        if (animateTimerRef.current) {
          clearTimeout(animateTimerRef.current);
          animateTimerRef.current = null;
        }
        programmaticAnimRef.current = false;
        setIsAnimating(false);
        // Fresh pinch — clear any glide and zero velocity so the
        // gesture starts from rest.
        cancelInertia();
        velocityRef.current.vx = 0;
        velocityRef.current.vy = 0;
        velocityRef.current.vScale = 0;
        pinchStartDistance = distance(e.touches[0], e.touches[1]);
        pinchStartScale = transformRef.current.scale;
        pinchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        lastPinchTsRef.current = performance.now();
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchCenter) return;
      e.preventDefault();
      const d = distance(e.touches[0], e.touches[1]);
      const scaleTarget = clampScale(
        pinchStartScale * (d / pinchStartDistance),
      );
      const t = transformRef.current;
      const factor = scaleTarget / t.scale;
      if (factor !== 1) {
        applyTransform(
          clampedZoom(t, factor, pinchCenter.x, pinchCenter.y, viewportRect()),
        );
      }
      // Track scale velocity so a quick pinch-and-release glides
      // a touch further. Sample is log(factor) per ms (matches the
      // wheel branch's units), EMA with the same alpha=0.35.
      const now = performance.now();
      const dt = Math.max(1, Math.min(64, now - lastPinchTsRef.current));
      lastPinchTsRef.current = now;
      const sample = factor === 1 ? 0 : Math.log(factor) / dt;
      const vel = velocityRef.current;
      vel.vScale = vel.vScale * 0.65 + sample * 0.35;
      vel.cx = pinchCenter.x;
      vel.cy = pinchCenter.y;
      vel.vx = 0;
      vel.vy = 0;
    }
    function onTouchEnd(e: TouchEvent) {
      // When the second finger lifts, kick off inertia from the
      // velocity captured during the pinch. With less than 2
      // touches there's no live pinch to track anymore, so the
      // gesture is over.
      if (e.touches.length < 2 && pinchCenter) {
        pinchCenter = null;
        startInertia();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [clampedZoom, cancelInertia, startInertia, applyTransform]);

  // Keyboard shortcuts. Spacebar (held) for pan-cursor, "1" for fit, "0" for 100%, Esc handled at app level.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === " " && !e.repeat) {
        // Don't steal space from inputs.
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setSpaceHeld(true);
      } else if (e.key === "1") {
        const next = fitAllTransform(works, viewportRect());
        applyTransform(next);
        setTransform(next);
      } else if (e.key === "0") {
        // 100% zoom centred on the current view centre.
        const t = transformRef.current;
        const v = viewportRect();
        const centerCanvasX = (v.x + v.w / 2 - t.tx) / t.scale;
        const centerCanvasY = (v.y + v.h / 2 - t.ty) / t.scale;
        const next = centerOn(v, centerCanvasX, centerCanvasY, 1);
        applyTransform(next);
        setTransform(next);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [works, applyTransform]);

  const fitAll = useCallback(() => {
    animateTransform(fitAllTransform(works, viewportRect()), 2800);
  }, [works, animateTransform]);

  const zoomToWork = useCallback(
    (work: Work, scale = 1) => {
      const v = viewportRect();
      const off = destOffsets?.get(work.id) ?? { x: 0, y: 0 };
      animateTransform(
        centerOn(v, work.position.x + off.x, work.position.y + off.y, scale),
        4500,
      );
    },
    [animateTransform, destOffsets],
  );

  // Listen for nav requests from outside the canvas (Index dropdown, group click, etc.).
  const navTargetWorkId = useSelection((s) => s.navTargetWorkId);
  const navTargetGroupKey = useSelection((s) => s.navTargetGroupKey);
  const clearNav = useSelection((s) => s.clearNav);
  const indexOpen = useSelection((s) => s.indexOpen);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  useEffect(() => {
    // Tile / group clicks count as the first interaction. The animations
    // below take the camera past the spread threshold, which then drives
    // dispersion from the scale-watcher above.
    if (navTargetWorkId || navTargetGroupKey) {
      userInteractedRef.current = true;
    }
    if (navTargetWorkId) {
      const target = works.find((w) => w.id === navTargetWorkId);
      if (target) zoomToWork(target, 0.6);
      clearNav();
      return;
    }
    if (navTargetGroupKey) {
      const groupWorks = works.filter(
        (w) => `${w.title}|${w.year}` === navTargetGroupKey,
      );
      if (groupWorks.length) {
        // Build the shifted bbox: on mobile each tile renders at its
        // workBounds plus the destination offset (2-col group stack).
        // Without this, fitAllTransform centres the camera on the
        // ORIGINAL canvas positions, which on mobile is empty space.
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const w of groupWorks) {
          const wb = workBounds(w);
          const off = destOffsets?.get(w.id) ?? { x: 0, y: 0 };
          minX = Math.min(minX, wb.minX + off.x);
          minY = Math.min(minY, wb.minY + off.y);
          maxX = Math.max(maxX, wb.maxX + off.x);
          maxY = Math.max(maxY, wb.maxY + off.y);
        }
        // Expand to include the GroupOutline padding (56px) and the
        // group label that floats above the outline. Without this,
        // wider/longer titles ("Spring Has Arrived" etc.) clipped off
        // the top of the canvas frame after the camera settled.
        const OUTLINE_PAD = 56;
        const TITLE_HEAD_ROOM = 90;
        const groupBbox = {
          minX: minX - OUTLINE_PAD,
          minY: minY - OUTLINE_PAD - TITLE_HEAD_ROOM,
          maxX: maxX + OUTLINE_PAD,
          maxY: maxY + OUTLINE_PAD,
        };
        // Defer one frame so the canvas container has begun its CSS
        // transition (left/right changing as toolbar slides + right
        // panels mount). 2800ms is the sweet spot: calm without feeling
        // sluggish. fitPadding 0.92 lets the focused group fill almost
        // the whole visible canvas area instead of sitting small.
        requestAnimationFrame(() => {
          animateTransform(
            fitBboxTransform(groupBbox, viewportRect(), 0.92),
            4500,
          );
        });
      }
      clearNav();
    }
  }, [
    navTargetWorkId,
    navTargetGroupKey,
    works,
    zoomToWork,
    clearNav,
    animateTransform,
    destOffsets,
  ]);

  // When the Index drawer toggles while a group is selected, re-fit
  // the camera so the cluster lands in the canvas area BETWEEN the
  // index (left) and the project panel (right). viewportRect already
  // treats the open index as 420 px of left chrome, so the same
  // fitBboxTransform call relocates the cluster correctly. Without
  // this, opening the index over a settled group view leaves the
  // group sitting partly behind the drawer.
  useEffect(() => {
    if (!selectedGroupKey) return;
    const groupWorks = works.filter(
      (w) => `${w.title}|${w.year}` === selectedGroupKey,
    );
    if (!groupWorks.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of groupWorks) {
      const wb = workBounds(w);
      const off = destOffsets?.get(w.id) ?? { x: 0, y: 0 };
      minX = Math.min(minX, wb.minX + off.x);
      minY = Math.min(minY, wb.minY + off.y);
      maxX = Math.max(maxX, wb.maxX + off.x);
      maxY = Math.max(maxY, wb.maxY + off.y);
    }
    const OUTLINE_PAD = 56;
    const TITLE_HEAD_ROOM = 90;
    const groupBbox = {
      minX: minX - OUTLINE_PAD,
      minY: minY - OUTLINE_PAD - TITLE_HEAD_ROOM,
      maxX: maxX + OUTLINE_PAD,
      maxY: maxY + OUTLINE_PAD,
    };
    requestAnimationFrame(() => {
      animateTransform(
        fitBboxTransform(groupBbox, viewportRect(), 0.92),
        1500,
      );
    });
    // selectedGroupKey is intentionally NOT in deps: this effect's
    // job is to react to indexOpen specifically. selectedGroupKey
    // changes are already handled by the navTargetGroupKey effect
    // above — re-running here would double-animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexOpen]);

  const cursor = isDragging ? "grabbing" : spaceHeld ? "grab" : "default";

  return {
    containerRef,
    transform,
    cursor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    fitAll,
    zoomToWork,
    isDragging,
    spaceHeld,
    isAnimating,
    animDuration,
    /** 0 (bento) or 1 (spread). Driven by zoom level with hysteresis. */
    dispersion,
    /** Did the most recent pointer interaction move beyond the click threshold? */
    dragMovedRef,
  };
}
