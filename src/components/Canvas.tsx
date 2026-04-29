"use client";

import { useCallback, useEffect, useMemo } from "react";
import { WORKS } from "@/data/works";
import { useCanvas } from "@/lib/useCanvas";
import { fitAllTransform, groupTilesByTitle, workBounds } from "@/lib/canvas-math";
import { DispersionContext } from "@/lib/dispersion";
import { useSelection } from "@/lib/store";
import { WorkTile } from "@/components/WorkTile";
import { GroupOutline } from "@/components/GroupOutline";
import { ExpandedGroup } from "@/components/ExpandedGroup";

// 7-column Pinterest-style masonry, matching the user's Figma reference
// (each column packs tiles top-down with their natural heights). Column
// horizontal spacing is set by the widest tile so columns never overlap.
export const BENTO_COLS = 7;
// Horizontal gap between columns (canvas-space).
export const BENTO_COL_GAP = 80;
// Vertical gap between tiles within a column.
export const BENTO_ROW_GAP = 60;
// Per-tile jitter in canvas-space, kept small so tiles never overlap.
export const BENTO_JITTER_X = 25;
export const BENTO_JITTER_Y = 25;

// Pre-computed bento bbox in canvas space (centred on origin). Static
// estimate sized for the worst case (widest tiles + tallest stacks);
// the camera fits to this so the whole masonry is visible at the
// "100%" view from the user's reference.
const BENTO_BBOX = {
  minX: -5800,
  maxX: 5800,
  minY: -4400,
  maxY: 4400,
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
    // Pinterest-style masonry: pick the column with the lowest current
    // y for each tile, place it there, then advance that column's y by
    // the tile's natural height + gap. Columns are spaced wide enough
    // for the widest tile so they never overlap.
    const tileBounds = ordered.map((w) => workBounds(w));
    const maxTileW = tileBounds.reduce((m, b) => Math.max(m, b.width), 0);
    const colSpacing = maxTileW + BENTO_COL_GAP;
    const colCenters = Array.from(
      { length: BENTO_COLS },
      (_, i) => (i - (BENTO_COLS - 1) / 2) * colSpacing,
    );
    const colYs = new Array(BENTO_COLS).fill(0);
    const placements: Array<{ id: string; cx: number; cy: number }> = [];
    const rand = (seed: number) => {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    ordered.forEach((work, i) => {
      // Shortest-column packing for a hand-laid masonry feel.
      let col = 0;
      for (let c = 1; c < BENTO_COLS; c++)
        if (colYs[c] < colYs[col]) col = c;
      const wb = tileBounds[i];
      const cy = colYs[col] + wb.height / 2;
      placements.push({ id: work.id, cx: colCenters[col], cy });
      colYs[col] += wb.height + BENTO_ROW_GAP;
    });
    // Centre the masonry vertically: shift everything by -avg height.
    const totalH = Math.max(...colYs) - BENTO_ROW_GAP;
    const yShift = -totalH / 2;
    const map = new Map<string, { x: number; y: number }>();
    placements.forEach((p, i) => {
      const work = ordered[i];
      const wb = tileBounds[i];
      const jx = (rand(i + 1) - 0.5) * 2 * BENTO_JITTER_X;
      const jy = (rand(i + 17) - 0.5) * 2 * BENTO_JITTER_Y;
      const tileCx = wb.minX + wb.width / 2;
      const tileCy = wb.minY + wb.height / 2;
      map.set(work.id, {
        x: p.cx + jx - tileCx,
        y: p.cy + yShift + jy - tileCy,
      });
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

  // Zoom indicator: 100% = fit-all of the true works bbox. Computed
  // once from a viewport approximation; the indicator updates as the
  // user zooms.
  const fitScale = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return fitAllTransform(WORKS, {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    }).scale;
  }, []);
  const zoomPct = Math.round((transform.scale / fitScale) * 100);

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
      {/* Zoom indicator: bottom-right of the canvas, hidden during the
          gallery view. Shows current scale relative to fit-all. */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute bottom-4 right-4 z-10 italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute"
      >
        {zoomPct}%
      </div>
    </div>
  );
}
