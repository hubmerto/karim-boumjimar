"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  centerOn,
  clampScale,
  clampTransform,
  fitAllTransform,
  type Transform,
  worksBounds,
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
const SHEET_PEEK_H = 56; // mobile bottom-sheet peek height (matches InspectorSheet)

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
  const { selectedId, selectedGroupKey } = useSelection.getState();
  const leftW = isDesktop ? leftWidth() : 0;
  // Right panels render independently: Inspector when a tile is selected,
  // ProjectPanel when a group is selected. Subtract whichever are visible
  // so groups center within the actual free canvas area.
  const rightW = isDesktop
    ? (selectedId ? INSPECTOR_W : 0) + (selectedGroupKey ? PROJECT_PANEL_W : 0)
    : 0;
  const bottomChrome = isDesktop ? 0 : SHEET_PEEK_H;
  return {
    x: leftW,
    y: TOPBAR_H,
    w: window.innerWidth - leftW - rightW,
    h: window.innerHeight - TOPBAR_H - bottomChrome,
  };
}

export function useCanvas(works: Work[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bbox = useMemo(() => worksBounds(works), [works]);
  // Helper: clamp any candidate transform against the current viewport + bbox.
  const clamp = useCallback(
    (t: Transform) => clampTransform(t, viewportRect(), bbox),
    [bbox],
  );
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

  useLayoutEffect(() => {
    if (initializedRef.current || !works.length) return;
    initializedRef.current = true;
    setTransform(fitAllTransform(works, viewportRect()));
  }, [works]);

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

  const animateTransform = useCallback(
    (next: Transform) => {
      if (animateTimerRef.current) clearTimeout(animateTimerRef.current);
      setIsAnimating(true);
      setTransform(clamp(next));
      animateTimerRef.current = setTimeout(() => setIsAnimating(false), 420);
    },
    [clamp],
  );

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
        setTransform(
          clamp(zoomAt(t, factor, e.clientX, e.clientY, viewportRect())),
        );
      } else {
        // Pan in the direction of the wheel (deltaX / deltaY).
        setTransform(
          clamp({ tx: t.tx - e.deltaX, ty: t.ty - e.deltaY, scale: t.scale }),
        );
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [clamp]);

  // Pointer drag pan.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only pan from background drags (e.g. on the canvas itself), or with space held.
      const target = e.target as HTMLElement;
      const onWork = !!target.closest("[data-work-id]");
      if (onWork && !spaceHeld) return; // let the work get the click
      if (e.button !== 0 && e.pointerType === "mouse") return;
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
      setTransform(clamp({ tx: t.tx + dx, ty: t.ty + dy, scale: t.scale }));
    },
    [isDragging, clamp],
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
          clamp(zoomAt(t, factor, pinchCenter.x, pinchCenter.y, viewportRect())),
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
  }, [clamp]);

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
        setTransform(clamp(fitAllTransform(works, viewportRect())));
      } else if (e.key === "0") {
        // 100% zoom centred on the current view centre.
        const t = transformRef.current;
        const v = viewportRect();
        const centerCanvasX = (v.x + v.w / 2 - t.tx) / t.scale;
        const centerCanvasY = (v.y + v.h / 2 - t.ty) / t.scale;
        setTransform(clamp(centerOn(v, centerCanvasX, centerCanvasY, 1)));
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
  }, [works, clamp]);

  const fitAll = useCallback(() => {
    animateTransform(fitAllTransform(works, viewportRect()));
  }, [works, animateTransform]);

  const zoomToWork = useCallback(
    (work: Work, scale = 1) => {
      const v = viewportRect();
      animateTransform(centerOn(v, work.position.x, work.position.y, scale));
    },
    [animateTransform],
  );

  // Listen for nav requests from outside the canvas (Index dropdown, group click, etc.).
  const navTargetWorkId = useSelection((s) => s.navTargetWorkId);
  const navTargetGroupKey = useSelection((s) => s.navTargetGroupKey);
  const clearNav = useSelection((s) => s.clearNav);
  useEffect(() => {
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
        // Defer one frame so the canvas container has begun its CSS transition
        // (left/right changing as toolbar slides + right panels mount). Reading
        // viewportRect on the next frame gives the same target dimensions, but
        // the visual animations stay in lockstep at 400ms each.
        requestAnimationFrame(() => {
          animateTransform(fitAllTransform(groupWorks, viewportRect(), 0.6));
        });
      }
      clearNav();
    }
  }, [navTargetWorkId, navTargetGroupKey, works, zoomToWork, clearNav, animateTransform]);

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
    /** Did the most recent pointer interaction move beyond the click threshold? */
    dragMovedRef,
  };
}
