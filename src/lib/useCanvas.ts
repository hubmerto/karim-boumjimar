"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    return { x: LEFT_TOOLBAR_W_FULL, y: TOPBAR_H, w: 1024 - LEFT_TOOLBAR_W_FULL, h: 600 };
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
  /** Soft pan/zoom limit (with padding) for the current state. */
  panBbox?: Bbox,
  /** Per-tile offset from its natural position to where it actually
   * renders post-spread. Mobile uses this to stack groups in a 2-col
   * vertical layout; on desktop it's empty. The camera must apply it
   * when navigating, otherwise nav-to-group lands on empty space where
   * the bbox sits in canvas coords but no tile is rendered. */
  destOffsets?: Map<string, { x: number; y: number }>,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Identical initial state on server and client to keep hydration deterministic.
  // fitAll is applied via useLayoutEffect below - runs synchronously after mount,
  // before paint, so users never see the un-fit state.
  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: TOPBAR_H,
    scale: 0.15,
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const initializedRef = useRef(false);
  // Two-stage opening: start at half the standard fit-all scale so all
  // groups read as a small overview, then animate to fit-all on the
  // user's first wheel / pinch / click.
  const introRef = useRef(true);
  // Soft zoom bounds (75% .. 750% of fit-all). Computed once from a
  // viewport-derived fit; stable across the session.
  const userScaleBounds = useMemo(() => {
    if (typeof window === "undefined") return { min: 0.05, max: 1 };
    const fit = fitAllTransform(works, {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    }).scale;
    return { min: fit * 0.75, max: fit * 7.5 };
  }, [works]);
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
      // Initial framing matches the user's "200%" reference: bento sits
      // small and compact in the middle of the viewport. Then auto-eases
      // to a tighter "100%" where the bento fills more of the screen.
      const v = viewportRect();
      const fit = fitBboxTransform(bentoBbox, v, 1.05);
      const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
      const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
      const farScale = fit.scale * 0.4;
      setTransform({
        tx: v.w / 2 - cx * farScale,
        ty: v.h / 2 - cy * farScale,
        scale: farScale,
      });
    } else {
      setTransform(fitAllTransform(works, viewportRect()));
    }
  }, [works, bentoBbox]);

  // When the left toolbar slides out / back in, the canvas container's left
  // edge shifts by (LEFT_TOOLBAR_W_FULL - LEFT_TOOLBAR_W_CONDENSED).
  // Compensate the tx so tile screen positions stay anchored.
  const condensed = useSelection(
    (s) => !!(s.selectedId || s.selectedGroupKey),
  );
  const prevCondensedRef = useRef(condensed);
  useEffect(() => {
    if (prevCondensedRef.current === condensed) return;
    const widthDelta = LEFT_TOOLBAR_W_FULL - LEFT_TOOLBAR_W_CONDENSED; // 176
    // Toolbar shrinking → container shifts left → bump tx right to compensate.
    const txDelta = condensed ? widthDelta : -widthDelta;
    setTransform((t) => ({ ...t, tx: t.tx + txDelta }));
    prevCondensedRef.current = condensed;
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
  const animateTransform = useCallback(
    (next: Transform, duration = 1800) => {
      if (animateTimerRef.current) clearTimeout(animateTimerRef.current);
      setIsAnimating(true);
      setAnimDuration(duration);
      setTransform(next);
      animateTimerRef.current = setTimeout(
        () => setIsAnimating(false),
        duration + 80,
      );
    },
    [],
  );

  // First-interaction handler: ease from the bento intro into the
  // standard fit-all view (and tell the store so tiles also spread).
  // Returns true if the intro was just consumed. The 2200ms duration
  // here matches the WorkTile transform transition so camera and tiles
  // settle together without a "snap" feel.
  const endIntro = useSelection((s) => s.endIntro);
  const consumeIntro = useCallback(() => {
    if (!introRef.current) return false;
    introRef.current = false;
    endIntro();
    animateTransform(fitAllTransform(works, viewportRect()), 2200);
    return true;
  }, [works, animateTransform, endIntro]);

  // Slow approach from the user's "200%" wide-out framing all the way
  // past natural fit so the bento fills the viewport and a bit beyond.
  // User input cancels this via consumeIntro.
  useEffect(() => {
    if (!bentoBbox) return;
    const t1 = setTimeout(() => {
      if (!introRef.current) return;
      const v = viewportRect();
      const fit = fitBboxTransform(bentoBbox, v, 1.05);
      const cx = (bentoBbox.minX + bentoBbox.maxX) / 2;
      const cy = (bentoBbox.minY + bentoBbox.maxY) / 2;
      // Mobile gets a tighter zoom so each tile reads at a larger size
      // on the smaller screen.
      const isMobile = window.innerWidth < 768;
      const closer = fit.scale * (isMobile ? 3.4 : 2.2);
      animateTransform(
        {
          tx: v.w / 2 - cx * closer,
          ty: v.h / 2 - cy * closer,
          scale: closer,
        },
        7000,
      );
    }, 800);
    return () => clearTimeout(t1);
  }, [bentoBbox, animateTransform]);

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
      const t = transformRef.current;
      // Mac trackpad pinch sets ctrlKey; explicit Cmd/Ctrl+wheel also zooms.
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        setTransform(clampedZoom(t, factor, e.clientX, e.clientY, viewportRect()));
        return;
      }
      // Trackpads emit deltaX + deltaY natively. Wheel mice only emit
      // deltaY; Shift+wheel converts that into horizontal pan (Figma
      // convention).
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.shiftKey && dx === 0) {
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
      const dx = e.clientX - dragOriginRef.current.x;
      const dy = e.clientY - dragOriginRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      const t = transformRef.current;
      setTransform(
        clampedPan(
          { tx: t.tx + dx, ty: t.ty + dy, scale: t.scale },
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
    animateTransform(fitAllTransform(works, viewportRect()), 2200);
  }, [works, animateTransform]);

  const zoomToWork = useCallback(
    (work: Work, scale = 1) => {
      const v = viewportRect();
      const off = destOffsets?.get(work.id) ?? { x: 0, y: 0 };
      animateTransform(
        centerOn(v, work.position.x + off.x, work.position.y + off.y, scale),
        2200,
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
    // below transition us straight to the target from the overview, and
    // endIntro tells the tiles to spread alongside.
    if (navTargetWorkId || navTargetGroupKey) {
      if (introRef.current) {
        introRef.current = false;
        endIntro();
      }
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
        const groupBbox = { minX, minY, maxX, maxY };
        // Defer one frame so the canvas container has begun its CSS
        // transition (left/right changing as toolbar slides + right
        // panels mount). 2200ms keeps the camera move calm and gentle.
        requestAnimationFrame(() => {
          animateTransform(
            fitBboxTransform(groupBbox, viewportRect(), 0.6),
            2200,
          );
        });
      }
      clearNav();
    }
  }, [navTargetWorkId, navTargetGroupKey, works, zoomToWork, clearNav, animateTransform, endIntro, destOffsets]);

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
    /** Did the most recent pointer interaction move beyond the click threshold? */
    dragMovedRef,
  };
}
