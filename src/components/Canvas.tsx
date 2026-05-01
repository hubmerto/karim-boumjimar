"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORKS } from "@/data/works";
import { useCanvas } from "@/lib/useCanvas";
import {
  groupTilesByTitle,
  workBounds,
  type Transform,
} from "@/lib/canvas-math";
import { DispersionContext } from "@/lib/dispersion";
import { useSelection } from "@/lib/store";
import { WorkTile } from "@/components/WorkTile";
import { GroupOutline } from "@/components/GroupOutline";
import { ExpandedGroup } from "@/components/ExpandedGroup";

// Diamond layouts. Column counts taper symmetrically from a tall middle
// column out toward shorter edges, producing a rhombus silhouette.
//
// Desktop sums to 123 (every WORKS entry). Mobile sums to ~39 because
// only 3 representative tiles per project are rendered on phones (the
// gallery view fetches the full project on tap). Change these together
// if the per-cluster cap or the number of projects changes, otherwise
// the bento leaves tiles at position (0, 0).
export const BENTO_COL_COUNTS_DESKTOP = [
  3, 4, 5, 6, 7, 8, 10, 12, 13, 12, 10, 8, 7, 6, 5, 4, 3,
];
export const BENTO_COL_COUNTS_MOBILE = [3, 5, 7, 9, 7, 5, 3];

// On mobile, render at most this many tiles per project on the canvas.
// The gallery view tap-target still fetches the full project, so users
// see every image -- we just keep the canvas memory footprint sane.
export const MOBILE_TILES_PER_PROJECT = 3;
// Horizontal gap between columns (canvas-space).
export const BENTO_COL_GAP = 80;
// Vertical gap between tiles within a column.
export const BENTO_ROW_GAP = 130;
// Per-tile jitter in canvas-space, kept small so tiles never overlap.
export const BENTO_JITTER_X = 25;
export const BENTO_JITTER_Y = 25;

export function Canvas() {
  const deselect = useSelection((s) => s.deselect);
  const selectedId = useSelection((s) => s.selectedId);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const condensed = !!(selectedId || selectedGroupKey);
  // Inspector renders for a tile (300px); ProjectPanel for a group (360px).
  // Canvas right edge must clear whichever are visible so tiles aren't hidden.
  const rightClass =
    selectedId && selectedGroupKey
      ? "md:right-[660px]"
      : selectedGroupKey
        ? "md:right-[360px]"
        : selectedId
          ? "md:right-[300px]"
          : "md:right-0";
  // Pick a column-count distribution based on viewport. Default to
  // desktop on the server (and on the client first render) so SSR and
  // CSR strings match; useEffect below switches to mobile after mount.
  const [colCounts, setColCounts] = useState<number[]>(
    BENTO_COL_COUNTS_DESKTOP,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () =>
      setColCounts(
        mq.matches ? BENTO_COL_COUNTS_MOBILE : BENTO_COL_COUNTS_DESKTOP,
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // On mobile, curate down to MOBILE_TILES_PER_PROJECT representative
  // tiles per project. The full WORKS is still passed to ExpandedGroup
  // so the gallery view shows every image of the tapped project.
  const isMobileLayout = colCounts === BENTO_COL_COUNTS_MOBILE;
  const displayWorks = useMemo(() => {
    if (!isMobileLayout) return WORKS;
    const byGroup = new Map<string, typeof WORKS>();
    for (const w of WORKS) {
      const key = `${w.title}|${w.year}`;
      let arr = byGroup.get(key);
      if (!arr) {
        arr = [];
        byGroup.set(key, arr);
      }
      arr.push(w);
    }
    const curated: typeof WORKS = [];
    for (const arr of byGroup.values()) {
      if (arr.length <= MOBILE_TILES_PER_PROJECT) {
        curated.push(...arr);
      } else {
        // Pick first / middle / last for a spread sample.
        curated.push(
          arr[0],
          arr[Math.floor(arr.length / 2)],
          arr[arr.length - 1],
        );
      }
    }
    return curated;
  }, [isMobileLayout]);

  // Groups derived from the displayed set so per-cluster bbox math
  // matches what's actually on the canvas.
  const groups = useMemo(() => groupTilesByTitle(displayWorks), [displayWorks]);

  // Bento layout: every tile gets a slot in a packed grid centred on
  // (0,0). Order is reverse-chronological by group, then by tile index
  // within group, so adjacent works tend to be from the same era — but
  // group identity is ignored in the layout, as requested.
  const tileOffsets = useMemo(() => {
    // Deterministic shuffle by tile-id hash so works from the same
    // group don't cluster in the bento. Same order across renders.
    const seedSort = (id: string) => {
      let h = 0;
      for (let i = 0; i < id.length; i++)
        h = ((h << 5) - h + id.charCodeAt(i)) | 0;
      const x = Math.sin(h * 0.0001) * 10000;
      return x - Math.floor(x);
    };
    const ordered = [...displayWorks].sort(
      (a, b) => seedSort(a.id) - seedSort(b.id),
    );
    // Per-column masonry: tile counts come from the chosen distribution
    // (desktop = 7-col mound; mobile = 4-col elongated). Each column is
    // centred vertically so middle columns extend further up + down.
    const tileBounds = ordered.map((w) => workBounds(w));
    const maxTileW = tileBounds.reduce((m, b) => Math.max(m, b.width), 0);
    const colSpacing = maxTileW + BENTO_COL_GAP;
    const cols = colCounts.length;
    const colCenters = Array.from(
      { length: cols },
      (_, i) => (i - (cols - 1) / 2) * colSpacing,
    );
    const rand = (seed: number) => {
      const x = Math.sin(seed * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    const map = new Map<string, { x: number; y: number }>();
    let cursor = 0;
    colCounts.forEach((count, col) => {
      // Sum heights for this column so we can centre the stack.
      let stackH = 0;
      for (let j = 0; j < count; j++) stackH += tileBounds[cursor + j].height;
      stackH += (count - 1) * BENTO_ROW_GAP;
      let y = -stackH / 2;
      for (let j = 0; j < count; j++) {
        const idx = cursor + j;
        const work = ordered[idx];
        const wb = tileBounds[idx];
        const jx = (rand(idx + 1) - 0.5) * 2 * BENTO_JITTER_X;
        const jy = (rand(idx + 17) - 0.5) * 2 * BENTO_JITTER_Y;
        const slotCx = colCenters[col] + jx;
        const slotCy = y + wb.height / 2 + jy;
        const tileCx = wb.minX + wb.width / 2;
        const tileCy = wb.minY + wb.height / 2;
        map.set(work.id, { x: slotCx - tileCx, y: slotCy - tileCy });
        y += wb.height + BENTO_ROW_GAP;
      }
      cursor += count;
    });
    return map;
  }, [colCounts, displayWorks]);

  // On mobile, after the spread, lay groups out in a 2-column vertical
  // stack so the canvas reads tall instead of wide. Per-tile offset =
  // (mobile group slot centre - original group centre). Empty on
  // desktop (=> tiles end at their true canvas positions).
  const baseOffsets = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (colCounts !== BENTO_COL_COUNTS_MOBILE) return map;
    const sortedGroups = [...groups].sort((a, b) => {
      const ay =
        typeof a.year === "number" ? a.year : parseInt(String(a.year), 10) || 0;
      const by =
        typeof b.year === "number" ? b.year : parseInt(String(b.year), 10) || 0;
      return by - ay || a.label.localeCompare(b.label);
    });
    const maxGroupW = sortedGroups.reduce(
      (m, g) => Math.max(m, g.maxX - g.minX),
      0,
    );
    const COLS = 2;
    const COL_GAP = 200;
    const ROW_GAP = 300;
    const colWidth = maxGroupW + COL_GAP;
    let yCursor = 0;
    let rowH = 0;
    sortedGroups.forEach((g, i) => {
      const col = i % COLS;
      const slotCx = (col - (COLS - 1) / 2) * colWidth;
      const gH = g.maxY - g.minY;
      const slotCy = yCursor + gH / 2;
      const origCx = (g.minX + g.maxX) / 2;
      const origCy = (g.minY + g.maxY) / 2;
      const offset = { x: slotCx - origCx, y: slotCy - origCy };
      for (const w of g.works) map.set(w.id, offset);
      rowH = Math.max(rowH, gH);
      if (col === COLS - 1 || i === sortedGroups.length - 1) {
        yCursor += rowH + ROW_GAP;
        rowH = 0;
      }
    });
    // Centre the whole stack vertically.
    const totalH = yCursor - ROW_GAP;
    const yShift = -totalH / 2;
    for (const [id, off] of map) map.set(id, { x: off.x, y: off.y + yShift });
    return map;
  }, [groups, colCounts]);

  // dispersion is now driven by zoom (set inside useCanvas), so it lives
  // alongside the transform from the same hook below.

  // Dynamic bento bbox: derive from the actual tile offsets of the
  // displayed set so the camera frames what's actually on screen.
  const bentoBbox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of displayWorks) {
      const wb = workBounds(w);
      const off = tileOffsets.get(w.id) ?? { x: 0, y: 0 };
      minX = Math.min(minX, wb.minX + off.x);
      minY = Math.min(minY, wb.minY + off.y);
      maxX = Math.max(maxX, wb.maxX + off.x);
      maxY = Math.max(maxY, wb.maxY + off.y);
    }
    return { minX, minY, maxX, maxY };
  }, [tileOffsets, displayWorks]);

  // Spread bbox: where tiles end up post-interaction. On mobile this
  // packs the curated subset into a 2-col group stack via baseOffsets.
  const spreadBbox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of displayWorks) {
      const wb = workBounds(w);
      const off = baseOffsets.get(w.id) ?? { x: 0, y: 0 };
      minX = Math.min(minX, wb.minX + off.x);
      minY = Math.min(minY, wb.minY + off.y);
      maxX = Math.max(maxX, wb.maxX + off.x);
      maxY = Math.max(maxY, wb.maxY + off.y);
    }
    return { minX, minY, maxX, maxY };
  }, [baseOffsets, displayWorks]);

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
    dispersion,
  } = useCanvas(displayWorks, bentoBbox, spreadBbox, baseOffsets);

  // Mirror the live transform in a ref so the gallery FLIP can read the
  // settled values without re-rendering ExpandedGroup on every pan/zoom.
  const transformRef = useRef<Transform>(transform);
  transformRef.current = transform;

  const dispCtx = useMemo(
    () => ({
      dispersion,
      tileOffsets,
      baseOffsets,
      transformRef,
      containerRef,
    }),
    [dispersion, tileOffsets, baseOffsets, containerRef],
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
          {displayWorks.map((w) => (
            <WorkTile key={w.id} work={w} />
          ))}
        </div>
        <ExpandedGroup />
      </DispersionContext.Provider>
    </div>
  );
}
