"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { useSelection } from "@/lib/store";
import { WORKS } from "@/data/works";
import { DefaultView, SelectedView } from "@/components/InspectorContent";

type Snap = "peek" | "mid" | "full";
type Mode = "default" | "index";

const PEEK_PX = 56; // height visible at "peek" snap (just header)
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
    ? WORKS.find((w) => w.id === selectedId) ?? null
    : null;

  const [snap, setSnap] = useState<Snap>("peek");
  const [mode, setMode] = useState<Mode>("default");
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

  // Auto-expand when a work is selected so the user can see its metadata.
  useEffect(() => {
    if (selected) {
      setMode("default");
      setSnap((s) => (s === "peek" ? "mid" : s));
    }
  }, [selected]);

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
  const transition = isDragging ? "none" : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";

  // Only meaningful on the exhibitions canvas; other views show their own full content.
  // Must come AFTER all hooks to satisfy the rules of hooks.
  if (view !== "exhibitions") return null;
  // Hide entirely while the gallery view is open so the horizontal strip
  // gets the full canvas height on mobile.
  if (expandedGroupKey) return null;
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
        <div
          className="cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onGrabPointerDown}
          onPointerMove={onGrabPointerMove}
          onPointerUp={onGrabPointerUp}
          onPointerCancel={onGrabPointerUp}
          aria-label="Drag to resize"
        >
          <div className="mx-auto my-2 h-1 w-10 rounded-full bg-line" />
          <div className="flex h-10 items-center justify-between border-b border-line px-4">
            <button
              type="button"
              onClick={() => {
                if (mode === "index") setMode("default");
                else setSnap((s) => (s === "peek" ? "mid" : "peek"));
              }}
              className="text-[13px] text-ink"
            >
              {mode === "index" ? "← back" : selected ? selected.title : ARTIST_NAME}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (mode === "index") {
                  setMode("default");
                } else {
                  setMode("index");
                  setSnap("full");
                }
              }}
              className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute hover:text-ink"
            >
              {mode === "index" ? "Close" : "Index"}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5" style={{ overscrollBehavior: "contain" }}>
          {mode === "index" ? (
            <SheetIndex onPick={() => setMode("default")} />
          ) : selected ? (
            <SelectedView work={selected} />
          ) : (
            <DefaultView />
          )}
        </div>
      </div>
    </div>
  );
}

function SheetIndex({ onPick }: { onPick: () => void }) {
  const navigateTo = useSelection((s) => s.navigateTo);
  const entries = useMemo(() => {
    const seen = new Map<
      string,
      { id: string; title: string; year: number | string; venue?: string }
    >();
    for (const w of WORKS) {
      const key = `${w.title}|${w.year}`;
      if (!seen.has(key)) {
        seen.set(key, { id: w.id, title: w.title, year: w.year, venue: w.venue });
      }
    }
    return Array.from(seen.values()).sort((a, b) => {
      const ay = typeof a.year === "number" ? a.year : parseInt(String(a.year), 10) || 0;
      const by = typeof b.year === "number" ? b.year : parseInt(String(b.year), 10) || 0;
      return by - ay;
    });
  }, []);

  return (
    <ul className="-mx-4">
      {entries.map((e) => (
        <li key={`${e.title}-${e.year}`}>
          <button
            type="button"
            onClick={() => {
              navigateTo(e.id);
              onPick();
            }}
            className="grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-3 text-left text-[14px] text-ink active:bg-line"
          >
            <span className="truncate">
              {e.title}
              {e.venue ? <span className="text-mute"> · {e.venue}</span> : null}
            </span>
            <span className="italic text-[12px] text-mute">{e.year}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
