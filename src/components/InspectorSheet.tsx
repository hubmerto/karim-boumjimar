"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelection } from "@/lib/store";
import { WORKS } from "@/data/works";
import { DefaultView, SelectedView } from "@/components/InspectorContent";
import { ProjectContent } from "@/components/ProjectPanel";

type Snap = "peek" | "mid" | "full";

// At peek state we want to see the grab handle plus the first
// section's "Work / About + arrow" header poking out, so the user
// gets a tactile hint that the sheet can be dragged up. 64 px lands
// just below that bar — more than the previous 56 px so the arrow
// doesn't get cropped on small phones.
const PEEK_PX = 64;
const TOP_RESERVE_PX = 64; // always leave 64px for the top bar + breathing room

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
  const selected = selectedId
    ? (WORKS.find((w) => w.id === selectedId) ?? null)
    : null;

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
    if (selected && !expandedGroupKey) {
      setSnap("peek");
    }
  }, [selected, expandedGroupKey]);

  // When the gallery opens, snap the sheet down to peek so it doesn't
  // sit over the strip. When it closes, leave whatever snap the user
  // had so the group view returns to a sensible state.
  useEffect(() => {
    if (expandedGroupKey) {
      setSnap("peek");
    }
  }, [expandedGroupKey]);

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
    return Math.max(0, snapToOffsetPx(snap, vh) + dragDelta);
  }, [snap, vh, dragDelta]);

  const isDragging = isDraggingRef.current;
  const transition = isDragging
    ? "none"
    : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";

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
  if (!selected && !selectedGroupKey) return null;

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
            bar here would be a duplicate. */}
        <div
          className="cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onGrabPointerDown}
          onPointerMove={onGrabPointerMove}
          onPointerUp={onGrabPointerUp}
          onPointerCancel={onGrabPointerUp}
          aria-label="Drag to resize"
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-line" />
        </div>
        <div
          className="flex-1 space-y-8 overflow-y-auto px-4 pt-3 pb-5"
          style={{ overscrollBehavior: "contain" }}
        >
          {selected ? (
            <SelectedView work={selected} sheetToggle={sheetToggle} />
          ) : null}
          {selectedGroupKey ? (
            <div className={selected ? "border-t border-line pt-6" : ""}>
              <ProjectContent sheetToggle={sheetToggle} />
            </div>
          ) : null}
          {!selected && !selectedGroupKey ? <DefaultView /> : null}
        </div>
      </div>
    </div>
  );
}
