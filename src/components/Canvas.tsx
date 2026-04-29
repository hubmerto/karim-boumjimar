"use client";

import { useCallback, useEffect, useMemo } from "react";
import { WORKS } from "@/data/works";
import { useCanvas } from "@/lib/useCanvas";
import { groupTilesByTitle, workBounds } from "@/lib/canvas-math";
import { DispersionContext } from "@/lib/dispersion";
import { useSelection } from "@/lib/store";
import { WorkTile } from "@/components/WorkTile";
import { GroupOutline } from "@/components/GroupOutline";
import { ExpandedGroup } from "@/components/ExpandedGroup";

// Bento layout dimensions (canvas-space). Tiles keep their natural
// width/height; only the centre of each tile is snapped to its slot.
// Cells are sized just barely larger than the largest tile so
// 20-50px gaps remain between neighbours after the natural-width
// jitter is applied.
export const BENTO_COLS = 7;
export const BENTO_ROWS = 6;
export const BENTO_CELL_W = 950;
export const BENTO_CELL_H = 720;
export const BENTO_GAP = 30;
// Per-tile jitter on bento positions (canvas-space). Adds a small
// imperfect feel: not every tile is on the same line.
export const BENTO_JITTER = 60;

// Pre-computed bento bbox in canvas space (centred on origin).
const BENTO_TOTAL_W =
  BENTO_COLS * BENTO_CELL_W + (BENTO_COLS - 1) * BENTO_GAP;
const BENTO_TOTAL_H =
  BENTO_ROWS * BENTO_CELL_H + (BENTO_ROWS - 1) * BENTO_GAP;
const BENTO_BBOX = {
  minX: -BENTO_TOTAL_W / 2,
  maxX: BENTO_TOTAL_W / 2,
  minY: -BENTO_TOTAL_H / 2,
  maxY: BENTO_TOTAL_H / 2,
};

export function Canvas() {
  const {
    containerRef,
    transform,
    cursor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dragMovedRef,
    isAnimating,
    animDuration,
  } = useCanvas(WORKS, BENTO_BBOX);
  const deselect = useSelection((s) => s.deselect);
  const selectedId = useSelection((s) => s.selectedId);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const condensed = !!(selectedId || selectedGroupKey);
  // Inspector renders for a tile (300px); ProjectPanel for a group (360px).
  // Canvas right edge must clear whichever are visible so tiles aren't hidden.
  const rightClass = selectedId && selectedGroupKey
    ? "md:right-[660px]"
    : selectedGroupKey
      ? "md:right-[360px]"
      : selectedId
        ? "md:right-[300px]"
        : "md:right-0";
  const groups = useMemo(() => groupTilesByTitle(WORKS), []);

  // Bento layout: every tile gets a slot in a packed grid centred on
  // (0,0). Order is reverse-chronological by group, then by tile index
  // within group, so adjacent works tend to be from the same era — but
  // group identity is ignored in the layout, as requested.
  const tileOffsets = useMemo(() => {
    const ordered: typeof WORKS = [];
    const sorted = [...groups].sort((a, b) => {
      const ay = typeof a.year === "number" ? a.year : parseInt(String(a.year), 10) || 0;
      const by = typeof b.year === "number" ? b.year : parseInt(String(b.year), 10) || 0;
      return by - ay || a.label.localeCompare(b.label);
    });
    for (const g of sorted) ordered.push(...g.works);
    const totalW = BENTO_COLS * BENTO_CELL_W + (BENTO_COLS - 1) * BENTO_GAP;
    const totalH = BENTO_ROWS * BENTO_CELL_H + (BENTO_ROWS - 1) * BENTO_GAP;
    const startX = -totalW / 2 + BENTO_CELL_W / 2;
    const startY = -totalH / 2 + BENTO_CELL_H / 2;
    const map = new Map<string, { x: number; y: number }>();
    // Deterministic pseudo-random jitter so the layout reads as a tight
    // packed bento, not a perfectly aligned grid.
    const rand = (seed: number) => {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    ordered.forEach((work, i) => {
      const col = i % BENTO_COLS;
      const row = Math.floor(i / BENTO_COLS);
      const jx = (rand(i + 1) - 0.5) * 2 * BENTO_JITTER;
      const jy = (rand(i + 17) - 0.5) * 2 * BENTO_JITTER;
      const slotCx = startX + col * (BENTO_CELL_W + BENTO_GAP) + jx;
      const slotCy = startY + row * (BENTO_CELL_H + BENTO_GAP) + jy;
      const wb = workBounds(work);
      const tileCx = wb.minX + wb.width / 2;
      const tileCy = wb.minY + wb.height / 2;
      map.set(work.id, { x: slotCx - tileCx, y: slotCy - tileCy });
    });
    return map;
  }, [groups]);

  const intro = useSelection((s) => s.intro);
  const dispCtx = useMemo(
    () => ({ dispersion: intro ? 0 : 1, tileOffsets }),
    [intro, tileOffsets],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") deselect();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deselect]);

  const onBackgroundClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Real bg clicks only - not at the tail of a pan-drag, not on a tile.
      if (dragMovedRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-work-id]")) return;
      deselect();
    },
    [deselect, dragMovedRef],
  );

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 top-12 overflow-hidden bg-canvas transition-[left,right] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        condensed ? "md:left-[24px]" : "md:left-[200px]"
      } ${rightClass}`}
      style={{
        cursor,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onBackgroundClick}
      role="application"
      aria-label="Works canvas - pan and zoom to navigate"
    >
      <DispersionContext.Provider value={dispCtx}>
        <div
          className="absolute left-0 top-0"
          style={{
            transformOrigin: "0 0",
            transform: `translate3d(${transform.tx}px, ${transform.ty}px, 0) scale(${transform.scale})`,
            // Slow + soft easing for nav animations. Duration varies:
            // 5000ms for the auto-zoom 200→100%, 1100ms otherwise.
            transition: isAnimating
              ? `transform ${animDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`
              : "none",
            willChange: "transform",
          }}
        >
          {groups.map((g) => (
            <GroupOutline
              key={g.key}
              groupKey={g.key}
              workIds={g.works.map((w) => w.id)}
              minX={g.minX}
              minY={g.minY}
              maxX={g.maxX}
              maxY={g.maxY}
              label={g.label}
              year={g.year}
              canvasScale={transform.scale}
            />
          ))}
          {WORKS.map((w) => (
            <WorkTile key={w.id} work={w} />
          ))}
        </div>
      </DispersionContext.Provider>
      <ExpandedGroup />
    </div>
  );
}
