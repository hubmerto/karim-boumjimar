"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelection } from "@/lib/store";
import { DefaultView } from "@/components/InspectorContent";
import { ProjectContent } from "@/components/ProjectPanel";

type Snap = "peek" | "mid" | "full";

// At peek state we want to see the grab handle plus the first
// section's "Work / About + arrow" header poking out, so the user
// gets a tactile hint that the sheet can be dragged up. 72 px
// accounts for the thicker drag handle (30 px hit area) plus the
// section header bar peeking through.
const PEEK_PX = 72;
const TOP_RESERVE_PX = 80; // 64 px mobile TopBar + 16 px breathing room

/** Effective sheet height in CSS px given current viewport height. */
function sheetHeightPx(vh: number) {
  return Math.max(200, vh - TOP_RESERVE_PX);
}

/** Convert a snap state to its translateY in CSS pixels (positive = pushed down). */
function snapToOffsetPx(snap: Snap, vh: number) {
  const sheetH = sheetHeightPx(vh);
  if (snap === "full") return 0;
  if (snap === "mid") return sheetH * 0.45; // shows ~55% of sheet height
  return sheetH - PEEK_PX; // peek: only header visible
}

export function InspectorSheet() {
  const view = useSelection((s) => s.view);
  const selectedId = useSelection((s) => s.selectedId);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);

  const [snap, setSnap] = useState<Snap>("peek");
  const [dragDelta, setDragDelta] = useState(0);
  const [vh, setVh] = useState(0);

  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Track viewport height so transforms recompute on resize / orientation change.
  useEffect(() => {
    function update() {
      setVh(window.innerHeight);
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // When a work is selected (entering group view), reset the
  // sheet to peek so the info bars are CLOSED and out of the
  // way of the cluster. The user can drag the handle up to read
  // (mid -> full snap states still work via the drag gesture).
  useEffect(() => {
    if (selectedId && !expandedGroupKey) {
      setSnap("peek");
    }
  }, [selectedId, expandedGroupKey]);

  // When the gallery opens, snap the sheet down to peek so it doesn't
  // sit over the strip. When it closes, leave whatever snap the user
  // had so the group view returns to a sensible state.
  useEffect(() => {
    if (expandedGroupKey) {
      setSnap("peek");
    }
  }, [expandedGroupKey]);

  // Programmatic snap override (used by /showcase/mobile to pull the
  // tab up + down for the recording loop). Real users never set this
  // because nothing in the production UI dispatches the action — it
  // only flips when an auto-pilot demo is driving the surface.
  const externalSnap = useSelection((s) => s.inspectorSheetSnap);
  useEffect(() => {
    if (externalSnap) setSnap(externalSnap);
  }, [externalSnap]);

  // Programmatic drag override for /showcase/sheet-snap. When
  // non-null, the sheet renders at its current snap + this delta
  // (no transition). When the override goes back to null,
  // we run the same snap-to-nearest logic the real release path
  // uses, so the sheet snaps to whichever stop is closest.
  const externalDragDelta = useSelection(
    (s) => s.inspectorSheetDragDelta,
  );
  const lastExternalDragDeltaRef = useRef(externalDragDelta);
  useEffect(() => {
    const prev = lastExternalDragDeltaRef.current;
    lastExternalDragDeltaRef.current = externalDragDelta;
    if (externalDragDelta == null && prev != null) {
      // Released — snap to the nearest state from the held delta.
      const baseOffset = snapToOffsetPx(snap, vh);
      const targetOffset = baseOffset + prev;
      const candidates: Snap[] = ["full", "mid", "peek"];
      let best: Snap = snap;
      let bestDist = Infinity;
      for (const c of candidates) {
        const d = Math.abs(snapToOffsetPx(c, vh) - targetOffset);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      setSnap(best);
    }
  }, [externalDragDelta, snap, vh]);

  // Programmatic content scroll for /showcase/sheet. Animates the
  // sheet's content area scrollTop to a target over a duration.
  const inspectorSheetScrollToken = useSelection(
    (s) => s.inspectorSheetScrollToken,
  );
  const inspectorSheetScrollTargetTop = useSelection(
    (s) => s.inspectorSheetScrollTargetTop,
  );
  const inspectorSheetScrollDurationMs = useSelection(
    (s) => s.inspectorSheetScrollDurationMs,
  );
  const lastScrollTokenRef = useRef(inspectorSheetScrollToken);
  useEffect(() => {
    if (inspectorSheetScrollToken === lastScrollTokenRef.current) return;
    lastScrollTokenRef.current = inspectorSheetScrollToken;
    if (inspectorSheetScrollToken === 0) return;
    const el = sheetRef.current?.querySelector(
      "[data-inspector-sheet-content]",
    ) as HTMLElement | null;
    if (!el) return;
    const startTop = el.scrollTop;
    const targetTop = inspectorSheetScrollTargetTop;
    const startTs = performance.now();
    const dur = inspectorSheetScrollDurationMs;
    let raf: number | null = null;
    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function tick(now: number) {
      if (
        inspectorSheetScrollToken !== lastScrollTokenRef.current ||
        !el
      )
        return;
      const t = Math.min(1, (now - startTs) / dur);
      el.scrollTop = startTop + (targetTop - startTop) * ease(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [
    inspectorSheetScrollToken,
    inspectorSheetScrollTargetTop,
    inspectorSheetScrollDurationMs,
  ]);

  // Handle drag from the grab region.
  const onGrabPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartYRef.current = e.clientY;
      isDraggingRef.current = true;
    },
    [],
  );

  const onGrabPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || dragStartYRef.current === null) return;
      const delta = e.clientY - dragStartYRef.current;
      setDragDelta(delta);
    },
    [],
  );

  const onGrabPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      const baseOffset = snapToOffsetPx(snap, vh);
      const targetOffset = baseOffset + dragDelta;
      const candidates: Snap[] = ["full", "mid", "peek"];
      let best: Snap = snap;
      let bestDist = Infinity;
      for (const c of candidates) {
        const d = Math.abs(snapToOffsetPx(c, vh) - targetOffset);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      setSnap(best);
      setDragDelta(0);
      dragStartYRef.current = null;
    },
    [snap, vh, dragDelta],
  );

  const offsetPx = useMemo(() => {
    // External drag (autopilot demo) takes precedence over the
    // user's real drag — they're never simultaneous in production.
    const effectiveDelta =
      externalDragDelta != null ? externalDragDelta : dragDelta;
    return Math.max(0, snapToOffsetPx(snap, vh) + effectiveDelta);
  }, [snap, vh, dragDelta, externalDragDelta]);

  const isDragging =
    isDraggingRef.current || externalDragDelta != null;
  // Slower than the original 220 ms — the snap reads as a gentle
  // pull instead of a punchy click, which fits the rest of the
  // site's settle-language (camera 1500-4500 ms, gallery FLIP
  // 2400 ms, tile dispersion 2800 ms). 450 ms is still snappy
  // enough for everyday taps on the handle.
  const transition = isDragging
    ? "none"
    : "transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)";

  // Toggle handler shared by every section header arrow (Work,
  // About). Tapping flips between peek and mid; from full it goes
  // to peek (one tap closes regardless of how high it was pulled).
  const toggleSnap = useCallback(() => {
    setSnap((s) => (s === "peek" ? "mid" : "peek"));
  }, []);

  const isOpen = snap !== "peek";
  const sheetToggle = useMemo(
    () => ({ isOpen, onToggle: toggleSnap }),
    [isOpen, toggleSnap],
  );

  // Only meaningful on the exhibitions canvas; other views show their own full content.
  // Must come AFTER all hooks to satisfy the rules of hooks.
  if (view !== "exhibitions") return null;
  // Hide unless the user has actively selected something. The default
  // (no-selection) sheet was clutter; site navigation lives in the top
  // menu now.
  if (!selectedId && !selectedGroupKey) return null;

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{
        height: vh ? `${sheetHeightPx(vh)}px` : "calc(100dvh - 64px)",
        transform: `translate3d(0, ${offsetPx}px, 0)`,
        transition,
        willChange: "transform",
      }}
      role="dialog"
      aria-label="Inspector"
    >
      <div className="flex h-full flex-col border-t border-line bg-canvas shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]">
        {/* Drag handle. Just the grab line — the section header bars
            below carry the label + ↑/↓ toggle, so a dedicated title
            bar here would be a duplicate. The wrapper carries
            generous vertical padding so the touch target (~30 px)
            is much larger than the visible pill, which made the
            handle hard to grab on phones. */}
        <div
          className="cursor-grab touch-none select-none py-3 active:cursor-grabbing"
          onPointerDown={onGrabPointerDown}
          onPointerMove={onGrabPointerMove}
          onPointerUp={onGrabPointerUp}
          onPointerCancel={onGrabPointerUp}
          aria-label="Drag to resize"
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-mute/60" />
        </div>
        <div
          data-inspector-sheet-content
          className="flex-1 space-y-8 overflow-y-auto px-4 pt-3 pb-5"
          style={{ overscrollBehavior: "contain" }}
        >
          {selectedGroupKey || selectedId ? (
            <ProjectContent sheetToggle={sheetToggle} />
          ) : (
            <DefaultView />
          )}
        </div>
      </div>
    </div>
  );
}
