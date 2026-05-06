"use client";

import {
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
const INSPECTOR_W = 300;
const PROJECT_PANEL_W = 360;
const SHEET_TOP_RESERVE = 64; // matches InspectorSheet TOP_RESERVE_PX
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
  const { selectedId, selectedGroupKey, expandedGroupKey } =
    useSelection.getState();
  const leftW = isDesktop ? leftWidth() : 0;
  // Right panels render independently: Inspector when a tile is selected,
  // ProjectPanel when a group is selected. Subtract whichever are visible
  // so groups center within the actual free canvas area.
  const rightW = isDesktop
    ? (selectedId ? INSPECTOR_W : 0) + (selectedGroupKey ? PROJECT_PANEL_W : 0)
    : 0;
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
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Identical initial state on server and client to keep hydration deterministic.
  // The 75% framing is applied via useLayoutEffect below, runs synchronously after
  // mount, before paint, so users never see the un-framed state.
  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: TOPBAR_H,
    scale: 0.15,
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;
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

  useLayoutEffect(() => {
    if (initializedRef.current || !works.length) return;
    initializedRef.current = true;
    if (bentoBbox) {
      // Initial framing: bento at 75% of its fit scale. Tiles are packed and
      // sit small with breathing room around them so the whole mound reads at
      // a glance while there's room for an auto-zoom to follow.
      const v = viewportRect();
      const fit = fitBboxTransform(bentoBbox, v).scale;
      const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
      const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
      const startScale = fit * 0.75;
      setTransform({
        tx: v.w / 2 - cx * startScale,
        ty: v.h / 2 - cy * startScale,
        scale: startScale,
      });
    } else {
      setTransform(fitAllTransform(works, viewportRect()));
    }
  }, [works, bentoBbox]);

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
    setTransform((t) => ({ ...t, tx: t.tx + txDelta }));
  }, [condensed]);

  const [isDragging, setIsDragging] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  // True while a navigation-driven transform change is animating. Keeps a CSS
  // transition on the wrapper for ~400ms then turns off so pan/zoom feels instant.
  const [isAnimating, setIsAnimating] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef(false);
  const animateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [animDuration, setAnimDuration] = useState(1800);
  // True while a programmatic camera animation is in flight. The
  // zoom-driven dispersion and gallery effects skip when this is true,
  // otherwise they'd fire as the camera sweeps through their thresholds
  // mid-animation (eg. opening the gallery briefly during a nav-to-group
  // before settling below threshold).
  const programmaticAnimRef = useRef(false);
  const animateTransform = useCallback((next: Transform, duration = 1800) => {
    if (animateTimerRef.current) clearTimeout(animateTimerRef.current);
    programmaticAnimRef.current = true;
    setIsAnimating(true);
    setAnimDuration(duration);
    setTransform(next);
    animateTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      programmaticAnimRef.current = false;
    }, duration + 80);
  }, []);

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

  // Drive dispersion from the current zoom level with hysteresis. The
  // tiles spread out (groups apart) once the camera passes 125% of the
  // bento fit, and re-pack to bento once it drops back below 75%. The
  // 50% gap is hysteresis so the layout doesn't flicker near a threshold.
  useEffect(() => {
    if (!bentoFit) return;
    if (transform.scale > bentoFit * 1.25 && dispersion === 0) {
      setDispersion(1);
    } else if (transform.scale <= bentoFit * 0.75 && dispersion === 1) {
      setDispersion(0);
    }
  }, [transform.scale, bentoFit, dispersion]);

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
      const t = transformRef.current;
      // Mac trackpad pinch sets ctrlKey; explicit Cmd/Ctrl+wheel also zooms.
      // Sensitivity is dialled down (0.005 from 0.01) so the camera moves
      // calmly; users had complained the zoom was twitchy.
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.005);
        setTransform(
          clampedZoom(t, factor, e.clientX, e.clientY, viewportRect()),
        );
        return;
      }
      // Trackpads emit deltaX + deltaY natively. Wheel mice only emit
      // deltaY; Shift+wheel converts that into horizontal pan (Figma
      // convention). Pan sensitivity dialled to 60% for the same reason.
      const PAN_SENS = 0.6;
      let dx = e.deltaX * PAN_SENS;
      let dy = e.deltaY * PAN_SENS;
      if (e.shiftKey && Math.abs(e.deltaX) < 0.001) {
        dx = dy;
        dy = 0;
      }
      setTransform(
        clampedPan(
          { tx: t.tx - dx, ty: t.ty - dy, scale: t.scale },
          viewportRect(),
        ),
      );
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [clampedZoom, clampedPan]);

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
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      dragMovedRef.current = false;
    },
    [spaceHeld],
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
      setTransform(
        clampedPan(
          { tx: t.tx + rawDx, ty: t.ty + rawDy, scale: t.scale },
          viewportRect(),
        ),
      );
    },
    [isDragging, clampedPan],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragOriginRef.current = null;
    },
    [isDragging],
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
        pinchStartDistance = distance(e.touches[0], e.touches[1]);
        pinchStartScale = transformRef.current.scale;
        pinchCenter = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
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
        setTransform(
          clampedZoom(t, factor, pinchCenter.x, pinchCenter.y, viewportRect()),
        );
      }
    }
    function onTouchEnd() {
      pinchCenter = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [clampedZoom]);

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
        setTransform(fitAllTransform(works, viewportRect()));
      } else if (e.key === "0") {
        // 100% zoom centred on the current view centre.
        const t = transformRef.current;
        const v = viewportRect();
        const centerCanvasX = (v.x + v.w / 2 - t.tx) / t.scale;
        const centerCanvasY = (v.y + v.h / 2 - t.ty) / t.scale;
        setTransform(centerOn(v, centerCanvasX, centerCanvasY, 1));
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
  }, [works]);

  const fitAll = useCallback(() => {
    animateTransform(fitAllTransform(works, viewportRect()), 2800);
  }, [works, animateTransform]);

  const zoomToWork = useCallback(
    (work: Work, scale = 1) => {
      const v = viewportRect();
      const off = destOffsets?.get(work.id) ?? { x: 0, y: 0 };
      animateTransform(
        centerOn(v, work.position.x + off.x, work.position.y + off.y, scale),
        2800,
      );
    },
    [animateTransform, destOffsets],
  );

  // Listen for nav requests from outside the canvas (Index dropdown, group click, etc.).
  const navTargetWorkId = useSelection((s) => s.navTargetWorkId);
  const navTargetGroupKey = useSelection((s) => s.navTargetGroupKey);
  const clearNav = useSelection((s) => s.clearNav);
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
            2800,
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
