"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
// These arrays are the DESIGN INTENT — the shape we want. The runtime
// uses `balanceColCounts` to absorb any drift between the hardcoded
// sum and the actual displayWorks length: if a photo is added or
// removed from works.ts, the difference is added to (or subtracted
// from) the middle column so no tile ever ends up stranded at (0, 0).
// You can therefore add/remove photos freely without having to keep
// these arrays in lockstep — the diamond just gets a slightly taller
// or shorter middle column.
//
// Sums at last design pass: desktop = 122 (every WORKS entry), mobile
// = 39 (3 representative tiles per project × 13 projects). The
// gallery view fetches the full project on tap regardless of which
// thumbs the canvas curated, so users always see every image.
// Diamond column counts. Sums must match the live work count or the
// runtime balancer dumps the difference into the middle column,
// turning the diamond into a stalk. Re-tune this when you add or
// remove projects:
//   - desktop: sum to WORKS.length
//   - mobile:  sum to (number of projects) * MOBILE_TILES_PER_PROJECT
// Current: 133 works (sum 133), 14 projects × 3 = 42 mobile tiles.
export const BENTO_COL_COUNTS_DESKTOP = [
  3, 4, 5, 7, 8, 9, 11, 13, 13, 13, 11, 9, 8, 7, 5, 4, 3,
];
export const BENTO_COL_COUNTS_MOBILE = [3, 5, 8, 10, 8, 5, 3];

/** Adjusts a hardcoded column-count array so its sum equals
 * `target`. The diff is absorbed by the middle column, which keeps
 * the diamond's overall shape recognisable while remaining tolerant
 * to additions / removals. Middle cap is 1 (a 0 col would silently
 * eat a tile). */
function balanceColCounts(
  target: number,
  base: readonly number[],
): number[] {
  const adjusted = [...base];
  const sum = base.reduce((a, b) => a + b, 0);
  const diff = target - sum;
  if (diff === 0) return adjusted;
  const middle = Math.floor(adjusted.length / 2);
  adjusted[middle] = Math.max(1, adjusted[middle] + diff);
  return adjusted;
}

/** Per-project explicit column counts for the desktop cluster grid
 * (shown when a project is in group view). Keys match
 * `${title}|${year}` from works.ts. Adaptive ramp covers anything
 * not in this map: ≤3 photos = `count` cols, 4-9 = 3, 10+ = 4.
 *
 *   - Bodies Under Construction (20 photos) → 5 × 4
 *   - Pandemonium Paradiso (14)              → 5 × 3 (last partial)
 *   - Stockholm Cosmologies (7)              → 4 × 2 (4 + 3)
 *
 * Deep Cuts deliberately stays on the adaptive default of 3 cols
 * here (= 3 photos in 1 row). The mobile version flips to 1 col
 * for a vertical strip; the artist's spec was "3 cols on desktop,
 * inverted on mobile". */
const PROJECT_CLUSTER_COLS_DESKTOP: Record<string, number> = {
  "Bodies Under Construction|2026": 5,
  "Pandemonium Paradiso|2025": 5,
  "Stockholm Cosmologies|2025": 4,
};

const CLUSTER_COL_GAP = 80;
const CLUSTER_ROW_GAP = 80;

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
  const indexOpen = useSelection((s) => s.indexOpen);
  const condensed = !!(selectedId || selectedGroupKey);
  // Single merged ProjectPanel (420 px) covers both the work fields
  // and the project description. Canvas right edge must clear it
  // when anything is selected so tiles aren't hidden behind it.
  const rightClass = condensed ? "md:right-[420px]" : "md:right-0";
  // Left edge: matches whatever's covering the canvas on the left.
  // When the Works Index drawer is open it reserves 420 px on the
  // left, so the canvas wrapper has to start at 420 too — otherwise
  // fitBboxTransform's tx (computed for a viewport at x=420) ends up
  // applied to a wrapper that begins at x=24, and the cluster lands
  // 396 px to the left of where it should be (visible behind the
  // drawer). Index has top priority because it covers the toolbar.
  const leftClass = indexOpen
    ? "md:left-[420px]"
    : condensed
      ? "md:left-[24px]"
      : "md:left-[200px]";
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
    // (desktop = 17-col mound; mobile = 7-col diamond). Each column is
    // centred vertically so middle columns extend further up + down.
    const tileBounds = ordered.map((w) => workBounds(w));
    const maxTileW = tileBounds.reduce((m, b) => Math.max(m, b.width), 0);
    const colSpacing = maxTileW + BENTO_COL_GAP;
    // Auto-balance the column counts to the actual number of works on
    // screen, so adding/removing photos never strands tiles at (0, 0)
    // (sum < count) or crashes by reading past the array (sum > count).
    const balancedCounts = balanceColCounts(ordered.length, colCounts);
    const cols = balancedCounts.length;
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
    balancedCounts.forEach((requestedCount, col) => {
      // Defensive cap: even after balancing, never read past `ordered`.
      // A misconfigured base array (e.g. a future edit that forgets to
      // update the diamond) just truncates here instead of crashing.
      const remaining = ordered.length - cursor;
      const count = Math.min(Math.max(0, requestedCount), remaining);
      if (count === 0) return;
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

  // baseOffsets: where each tile lands when the bento is fully
  // spread (group view zoom level).
  //
  // Desktop: tiles within a project flow into a clean grid centred
  // at the project's natural centroid. Group view then zooms into
  // that grid — same per-project cluster shape as mobile (in
  // CanvasPixi.tsx), just sourced from each tile's natural
  // position rather than the curated bento slot. Column counts
  // come from PROJECT_CLUSTER_COLS_DESKTOP, otherwise an adaptive
  // ramp keeps clusters square-ish.
  //
  // Mobile fallback (this Canvas component is desktop-only at
  // runtime — ViewSwitcher mounts CanvasPixi for mobile — but the
  // mobile branch is kept for the rare case Canvas does render at
  // a phone width): a 2-col group stack so the canvas reads tall.
  const baseOffsets = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (colCounts !== BENTO_COL_COUNTS_MOBILE) {
      // Desktop: per-project cluster grid.
      for (const g of groups) {
        const ordered = g.works;
        if (ordered.length === 0) continue;
        const COLS =
          PROJECT_CLUSTER_COLS_DESKTOP[g.key] ??
          (ordered.length <= 3
            ? Math.max(1, ordered.length)
            : ordered.length <= 9
              ? 3
              : 4);
        // Cluster anchor: centroid of the group's natural canvas
        // positions, so the cluster stays roughly where the group
        // already lives in the bento (camera doesn't have to fly
        // far when you tap into group view).
        let cx = 0;
        let cy = 0;
        for (const w of ordered) {
          const wb = workBounds(w);
          cx += (wb.minX + wb.maxX) / 2;
          cy += (wb.minY + wb.maxY) / 2;
        }
        cx /= ordered.length;
        cy /= ordered.length;
        // Cell size: largest tile in the group, so wider tiles
        // never overflow into adjacent slots.
        let cellW = 0;
        let cellH = 0;
        for (const w of ordered) {
          const wb = workBounds(w);
          if (wb.width > cellW) cellW = wb.width;
          if (wb.height > cellH) cellH = wb.height;
        }
        const stride = cellW + CLUSTER_COL_GAP;
        const rowH = cellH + CLUSTER_ROW_GAP;
        const totalRows = Math.ceil(ordered.length / COLS);
        const gridH = totalRows * cellH + (totalRows - 1) * CLUSTER_ROW_GAP;
        const yStart = cy - gridH / 2 + cellH / 2;
        ordered.forEach((w, i) => {
          const wb = workBounds(w);
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const slotCx = cx + (col - (COLS - 1) / 2) * stride;
          const slotCy = yStart + row * rowH;
          const tileCx = wb.minX + wb.width / 2;
          const tileCy = wb.minY + wb.height / 2;
          map.set(w.id, { x: slotCx - tileCx, y: slotCy - tileCy });
        });
      }
      return map;
    }
    // Mobile fallback (Canvas-on-phone): 2-col group stack.
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

  // Per-group bbox of where tiles actually land at full dispersion
  // (the cluster-grid layout above). Used by GroupOutline so the
  // frame fits the cluster, not the natural workBounds — without
  // this, the new per-project cluster math leaves some tiles
  // outside the outline. When a tile has no baseOffset (mobile
  // overview, or fallback), it defaults to (0,0) which is the
  // natural position — same as the old behaviour.
  const spreadBboxByGroup = useMemo(() => {
    const result = new Map<
      string,
      { minX: number; minY: number; maxX: number; maxY: number }
    >();
    for (const g of groups) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const w of g.works) {
        const wb = workBounds(w);
        const off = baseOffsets.get(w.id) ?? { x: 0, y: 0 };
        minX = Math.min(minX, wb.minX + off.x);
        minY = Math.min(minY, wb.minY + off.y);
        maxX = Math.max(maxX, wb.maxX + off.x);
        maxY = Math.max(maxY, wb.maxY + off.y);
      }
      result.set(g.key, { minX, minY, maxX, maxY });
    }
    return result;
  }, [groups, baseOffsets]);

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

  // The inner wrapper that carries the camera transform. Pan/zoom
  // mutates `wrapperRef.current.style.transform` directly each frame
  // so React doesn't re-render Canvas (and reconcile its 133-tile
  // JSX tree) at 60 Hz. Pass the ref into useCanvas; the wrapper
  // div's JSX must NOT include `transform` in its style or React
  // will overwrite our DOM mutations on its next render.
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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
  } = useCanvas(displayWorks, bentoBbox, spreadBbox, baseOffsets, wrapperRef);

  // ── Tile virtualization (desktop only) ─────────────────────────────
  //
  // Two end positions per tile: bento (dispersion=0, packed mound) and
  // spread (dispersion=1, per-project cluster). The dispersion state
  // is binary with hysteresis (see useCanvas) — by the time React
  // re-renders Canvas with a new transform, dispersion is already at
  // its final 0/1 value and the WorkTile's inline `transform: translate(dx,dy)`
  // has been set to the matching endpoint. CSS interpolates the visual
  // motion over 2.8 s, but the React-side position is the endpoint.
  //
  // Filter strategy:
  // - Settled (dispersion stable for >3 s): use the offset map matching
  //   the current dispersion. Tile is at its endpoint, no in-flight
  //   motion to worry about. Tight virtualization (1-4 tiles at max zoom).
  // - In transition (dispersion just flipped, CSS animation in flight):
  //   use the UNION of both endpoint bboxes. Otherwise we'd unmount
  //   tiles mid-flight that are still physically on screen heading toward
  //   an off-screen spread position — visible pop. The union keeps them
  //   mounted until the animation lands, then the next idle commit
  //   trims them.
  //
  // 3 s is a small margin past the 2.8 s WorkTile transition duration.

  // Track the canvas container's on-screen size so we can convert it
  // into a viewport rect in canvas coordinates. The container's width
  // changes when the project panel slides in / the toolbar collapses,
  // so a ResizeObserver is required (a one-shot useEffect would miss
  // those layout shifts).
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      setContainerSize((prev) =>
        prev.w === r.width && prev.h === r.height
          ? prev
          : { w: r.width, h: r.height },
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // dispersionSettled: false for 3 s after a dispersion change, then
  // true. While false, virtualization uses the union of bento + spread
  // bboxes to avoid unmounting in-flight tiles.
  const [dispersionSettled, setDispersionSettled] = useState(true);
  useEffect(() => {
    setDispersionSettled(false);
    const t = window.setTimeout(() => setDispersionSettled(true), 3000);
    return () => window.clearTimeout(t);
  }, [dispersion]);

  // Buffer (per side) around the visible viewport, expressed as a
  // fraction of the viewport's canvas-space size. 0.25 means the
  // buffered window is 1.5× viewport in each dimension. Generous
  // enough that a typical inertia glide settles inside the buffer
  // before commit-on-idle re-runs this filter, so the user never sees
  // tiles popping in past the edge during a fling.
  const VIRT_BUFFER_RATIO = 0.25;

  // visibleWorkIds: set of tile ids whose effective bbox intersects
  // the buffered viewport. Returns null on the first render (before
  // the ResizeObserver has reported a size) so all tiles render once
  // and we trim down on the next pass.
  //
  // Recomputes only when `transform` changes — and `transform` is now
  // commit-on-idle (per Step 2), so this filter does NOT run 60 times
  // per second during pan/zoom. The wrapper translates via direct DOM
  // mutation; mounted tiles ride along until the gesture settles, then
  // we trim.
  //
  // Mobile is excluded both via `isMobileLayout` (defensive — Canvas
  // shouldn't mount on phones) and structurally — ViewSwitcher mounts
  // CanvasPixi for mobile, which is a separate WebGL renderer with
  // its own per-frame culling.
  const visibleWorkIds = useMemo<Set<string> | null>(() => {
    if (isMobileLayout) return null;
    if (containerSize.w === 0 || containerSize.h === 0) return null;
    const { tx, ty, scale } = transform;
    if (scale <= 0) return null;
    // Container-local screen viewport → canvas coords. The wrapper's
    // CSS transform is `translate3d(tx, ty, 0) scale(scale)` relative
    // to the container, so a canvas point (cx, cy) renders at
    // (tx + cx*scale, ty + cy*scale) in container-local space.
    const canvasL = (0 - tx) / scale;
    const canvasT = (0 - ty) / scale;
    const canvasR = (containerSize.w - tx) / scale;
    const canvasB = (containerSize.h - ty) / scale;
    const bufX = (canvasR - canvasL) * VIRT_BUFFER_RATIO;
    const bufY = (canvasB - canvasT) * VIRT_BUFFER_RATIO;
    const vMinX = canvasL - bufX;
    const vMinY = canvasT - bufY;
    const vMaxX = canvasR + bufX;
    const vMaxY = canvasB + bufY;
    const ids = new Set<string>();
    const settledMap = dispersion === 0 ? tileOffsets : baseOffsets;
    for (const w of displayWorks) {
      const wb = workBounds(w);
      let minX: number, minY: number, maxX: number, maxY: number;
      if (dispersionSettled) {
        const off = settledMap.get(w.id) ?? { x: 0, y: 0 };
        minX = wb.minX + off.x;
        minY = wb.minY + off.y;
        maxX = wb.maxX + off.x;
        maxY = wb.maxY + off.y;
      } else {
        const o1 = tileOffsets.get(w.id) ?? { x: 0, y: 0 };
        const o2 = baseOffsets.get(w.id) ?? { x: 0, y: 0 };
        minX = Math.min(wb.minX + o1.x, wb.minX + o2.x);
        minY = Math.min(wb.minY + o1.y, wb.minY + o2.y);
        maxX = Math.max(wb.maxX + o1.x, wb.maxX + o2.x);
        maxY = Math.max(wb.maxY + o1.y, wb.maxY + o2.y);
      }
      if (maxX < vMinX || minX > vMaxX) continue;
      if (maxY < vMinY || minY > vMaxY) continue;
      ids.add(w.id);
    }
    return ids;
  }, [
    transform,
    containerSize,
    dispersion,
    dispersionSettled,
    tileOffsets,
    baseOffsets,
    displayWorks,
    isMobileLayout,
  ]);

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
      className={`fixed inset-0 top-12 overflow-hidden bg-canvas transition-[left,right] duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${leftClass} ${rightClass}`}
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
      data-canvas-container
    >
      <DispersionContext.Provider value={dispCtx}>
        <div
          ref={wrapperRef}
          className="absolute left-0 top-0"
          style={{
            transformOrigin: "0 0",
            // NOTE: `transform` is INTENTIONALLY omitted here.
            // useCanvas mutates `wrapperRef.current.style.transform`
            // directly on every wheel / pointer / inertia tick so
            // React doesn't have to reconcile the 133-tile subtree
            // 60 times per second during pan/zoom. If you put
            // `transform` back in this style block, React will
            // overwrite the DOM mutation on its next render.
            transition: isAnimating
              ? `transform ${animDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : "none",
            willChange: "transform",
            backfaceVisibility: "hidden",
            // Do NOT add `contain: layout paint` here. The wrapper is
            // `position: absolute; left:0; top:0` with no explicit
            // width / height — `contain: layout` would prevent the box
            // from expanding to its absolutely-positioned children
            // (which sit at canvas-space coords like -5000,-3000), so
            // the wrapper resolves to 0 × 0. `contain: paint` then
            // clips every tile to that 0 × 0 box: tiles still LAYOUT
            // (`getBoundingClientRect` returns positions) but never
            // PAINT, and `loading="lazy"` images never enter the
            // viewport from the IntersectionObserver's perspective so
            // they're never fetched. Result: blank canvas. The other
            // compositor hints (`willChange`, `backfaceVisibility`,
            // `transformOrigin`) already give the GPU enough info to
            // promote this layer; we don't need containment.
          }}
        >
          {groups.map((g) => {
            // Use the spread bbox (where tiles actually land at
            // dispersion=1) so the outline frames the cluster
            // grid. Falls back to the natural worksBounds if the
            // spread map hasn't populated yet.
            const sb = spreadBboxByGroup.get(g.key);
            const minX = sb?.minX ?? g.minX;
            const minY = sb?.minY ?? g.minY;
            const maxX = sb?.maxX ?? g.maxX;
            const maxY = sb?.maxY ?? g.maxY;
            return (
              <GroupOutline
                key={g.key}
                groupKey={g.key}
                workIds={g.works.map((w) => w.id)}
                minX={minX}
                minY={minY}
                maxX={maxX}
                maxY={maxY}
                label={g.label}
                year={g.year}
                canvasScale={transform.scale}
              />
            );
          })}
          {displayWorks.map((w) =>
            visibleWorkIds && !visibleWorkIds.has(w.id) ? null : (
              <WorkTile key={w.id} work={w} />
            ),
          )}
        </div>
        <ExpandedGroup />
      </DispersionContext.Provider>
    </div>
  );
}
