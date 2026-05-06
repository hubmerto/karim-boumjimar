"use client";

import { Application, extend, useTick } from "@pixi/react";
import {
  Assets,
  Container,
  Sprite,
  Texture,
  type Container as PixiContainerType,
  type Sprite as PixiSpriteType,
} from "pixi.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { WORKS } from "@/data/works";
import { workBounds } from "@/lib/canvas-math";
import { setFlipRects } from "@/lib/flipRects";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";
import { thumbSrc } from "@/lib/thumbs";

extend({ Container, Sprite });

/**
 * WebGL canvas rendering of the works. One <canvas> element, all tiles
 * drawn as GPU sprites. Replaces the DOM-per-tile approach that iOS
 * Safari was killing with the hung-page watchdog.
 *
 * On mobile we render only N representative tiles per project (the
 * gallery view shows the full set when the user taps in). Desktop
 * renders all 123 sprites.
 */
const MOBILE_TILES_PER_PROJECT = 3;

type Transform = { tx: number; ty: number; scale: number };

/** Pick first / middle / last for a project so the canvas has a spread
 * sample rather than three near-identical installation shots. */
function curateForMobile() {
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
  const out: typeof WORKS = [];
  for (const arr of byGroup.values()) {
    if (arr.length <= MOBILE_TILES_PER_PROJECT) {
      out.push(...arr);
    } else {
      out.push(
        arr[0],
        arr[Math.floor(arr.length / 2)],
        arr[arr.length - 1],
      );
    }
  }
  return out;
}

const BENTO_COL_GAP = 80;
const BENTO_ROW_GAP = 130;

/** Build a symmetric diamond column-count array that sums to N tiles.
 * Tall diamond (more rows than columns) for portrait phones. */
function diamondColCounts(n: number): number[] {
  // Pick column count proportional to sqrt(n) but biased toward fewer
  // columns so it reads tall on a phone. ~7 cols for 39 tiles.
  const cols = Math.max(3, Math.round(Math.sqrt(n) * 1.1));
  const half = Math.floor(cols / 2);
  // Triangular weights peaking in the middle.
  const weights = Array.from({ length: cols }, (_, i) =>
    1 + (cols % 2 === 1 ? half - Math.abs(i - half) : Math.min(i, cols - 1 - i)),
  );
  const sumW = weights.reduce((a, b) => a + b, 0);
  // Initial distribution proportional to weights.
  const counts = weights.map((w) => Math.round((w / sumW) * n));
  // Adjust so the sum matches exactly n.
  let diff = n - counts.reduce((a, b) => a + b, 0);
  let i = Math.floor(cols / 2);
  while (diff !== 0) {
    counts[i] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
    i = (i + 1) % cols;
  }
  // Each column needs at least 1 tile.
  for (let j = 0; j < counts.length; j++) {
    if (counts[j] < 1) {
      counts[j] = 1;
      // Borrow from the tallest column.
      const peak = counts.indexOf(Math.max(...counts));
      counts[peak] -= 1;
    }
  }
  return counts;
}

/** Lay tiles out in a tall diamond bento. Returns a Map of work.id ->
 * (canvas-space x, y, w, h) for each tile. Independent from each
 * tile's natural workBounds position. This is the OVERVIEW layout —
 * tiles appear scattered, not by project. */
function bentoLayout(works: typeof WORKS) {
  const counts = diamondColCounts(works.length);
  const cols = counts.length;
  // Deterministic shuffle so works from the same group don't cluster
  // in the bento.
  const seedSort = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    const x = Math.sin(h * 0.0001) * 10000;
    return x - Math.floor(x);
  };
  const ordered = [...works].sort((a, b) => seedSort(a.id) - seedSort(b.id));
  const tileBounds = ordered.map((w) => workBounds(w));
  const maxTileW = tileBounds.reduce((m, b) => Math.max(m, b.width), 0);
  const colSpacing = maxTileW + BENTO_COL_GAP;
  const colCenters = Array.from(
    { length: cols },
    (_, i) => (i - (cols - 1) / 2) * colSpacing,
  );
  const map = new Map<string, { x: number; y: number; w: number; h: number }>();
  let cursor = 0;
  counts.forEach((count, col) => {
    let stackH = 0;
    for (let j = 0; j < count; j++) stackH += tileBounds[cursor + j].height;
    stackH += (count - 1) * BENTO_ROW_GAP;
    let y = -stackH / 2;
    for (let j = 0; j < count; j++) {
      const idx = cursor + j;
      const work = ordered[idx];
      const wb = tileBounds[idx];
      const cx = colCenters[col];
      const cy = y + wb.height / 2;
      map.set(work.id, {
        x: cx - wb.width / 2,
        y: cy - wb.height / 2,
        w: wb.width,
        h: wb.height,
      });
      y += wb.height + BENTO_ROW_GAP;
    }
    cursor += count;
  });
  return map;
}

/** For each project, lay out its FULL photo set (cores + extras)
 * in a tight 4-column grid centred at the project's cores'
 * centroid in the bento. When the user enters group view, every
 * tile in the project (including the cores) flows into this grid
 * — looks like one coherent cluster of the project rather than
 * "scattered cores plus a separate grid of extras".
 *
 * The grid is anchored where the cores already sit so the camera
 * doesn't need to fly across the canvas, just zoom in.
 */
function projectClusterLayout(
  works: typeof WORKS,
  coreIds: Set<string>,
  bento: Map<string, { x: number; y: number; w: number; h: number }>,
) {
  const result = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();

  const byGroup = new Map<string, typeof WORKS>();
  for (const w of works) {
    const key = `${w.title}|${w.year}`;
    let arr = byGroup.get(key);
    if (!arr) {
      arr = [];
      byGroup.set(key, arr);
    }
    arr.push(w);
  }

  for (const [, groupWorks] of byGroup) {
    // Anchor: centroid of the project's cores in bento. Falls back
    // to 0,0 if no cores have a bento entry.
    let cx = 0;
    let cy = 0;
    let coreCount = 0;
    for (const w of groupWorks) {
      if (!coreIds.has(w.id)) continue;
      const slot = bento.get(w.id);
      if (!slot) continue;
      cx += slot.x + slot.w / 2;
      cy += slot.y + slot.h / 2;
      coreCount += 1;
    }
    if (coreCount > 0) {
      cx /= coreCount;
      cy /= coreCount;
    }

    // Cell size: max width AND max height across EVERY tile in the
    // project (cores + extras), not just cores. Picking max across
    // all of them prevents wider extras from overflowing into the
    // adjacent cell.
    let cellW = 0;
    let cellH = 0;
    for (const w of groupWorks) {
      const wb = workBounds(w);
      if (wb.width > cellW) cellW = wb.width;
      if (wb.height > cellH) cellH = wb.height;
    }
    if (cellW === 0) cellW = 1500;
    if (cellH === 0) cellH = 1000;

    const ordered = [
      ...groupWorks.filter((w) => coreIds.has(w.id)),
      ...groupWorks.filter((w) => !coreIds.has(w.id)),
    ];
    // Adaptive column count, floor 3 / cap 4 — small projects (3-12
    // tiles) get 3 cols, larger ones (>12) get 4. sqrt(N * 0.7)
    // crosses from 3 to 4 around 14 tiles.
    const COLS = Math.max(3, Math.min(4, Math.round(Math.sqrt(ordered.length * 0.7))));
    const GAP = 24;
    const stride = cellW + GAP;
    const rowH = cellH + GAP;
    const totalRows = Math.ceil(ordered.length / COLS);
    // Centre the whole grid vertically at the cores' centroid.
    const gridH = totalRows * cellH + (totalRows - 1) * GAP;
    const yStart = cy - gridH / 2 + cellH / 2;

    ordered.forEach((w, i) => {
      const wb = workBounds(w);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const xCenter = cx + (col - (COLS - 1) / 2) * stride;
      const yCenter = yStart + row * rowH;
      result.set(w.id, {
        x: xCenter - wb.width / 2,
        y: yCenter - wb.height / 2,
        w: wb.width,
        h: wb.height,
      });
    });
  }
  return result;
}

/** (Legacy) — clustered layout in a 2-col vertical stack. No
 * longer used as the spread target (cores now stay at bento and
 * extras appear via extrasNearCoresLayout) but kept available for
 * potential future use. */
function clusterLayout(works: typeof WORKS) {
  const groupsMap = new Map<string, typeof WORKS>();
  for (const w of works) {
    const key = `${w.title}|${w.year}`;
    let arr = groupsMap.get(key);
    if (!arr) {
      arr = [];
      groupsMap.set(key, arr);
    }
    arr.push(w);
  }
  const groupList = Array.from(groupsMap.entries()).map(([key, ws]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of ws) {
      const wb = workBounds(w);
      if (wb.minX < minX) minX = wb.minX;
      if (wb.minY < minY) minY = wb.minY;
      if (wb.maxX > maxX) maxX = wb.maxX;
      if (wb.maxY > maxY) maxY = wb.maxY;
    }
    return { key, works: ws, minX, minY, maxX, maxY, year: ws[0].year };
  });
  // Newest first.
  groupList.sort((a, b) => {
    const ay =
      typeof a.year === "number" ? a.year : parseInt(String(a.year), 10) || 0;
    const by =
      typeof b.year === "number" ? b.year : parseInt(String(b.year), 10) || 0;
    return by - ay;
  });

  const maxGroupW = groupList.reduce(
    (m, g) => Math.max(m, g.maxX - g.minX),
    0,
  );
  const COLS = 2;
  const COL_GAP = 200;
  const ROW_GAP = 300;
  const colWidth = maxGroupW + COL_GAP;
  let yCursor = 0;
  let rowH = 0;
  const map = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();
  groupList.forEach((g, i) => {
    const col = i % COLS;
    const slotCx = (col - (COLS - 1) / 2) * colWidth;
    const gH = g.maxY - g.minY;
    const slotCy = yCursor + gH / 2;
    const origCx = (g.minX + g.maxX) / 2;
    const origCy = (g.minY + g.maxY) / 2;
    const offX = slotCx - origCx;
    const offY = slotCy - origCy;
    for (const w of g.works) {
      const wb = workBounds(w);
      map.set(w.id, {
        x: wb.minX + offX,
        y: wb.minY + offY,
        w: wb.width,
        h: wb.height,
      });
    }
    rowH = Math.max(rowH, gH);
    if (col === COLS - 1 || i === groupList.length - 1) {
      yCursor += rowH + ROW_GAP;
      rowH = 0;
    }
  });
  // Centre the whole stack vertically.
  const totalH = yCursor - ROW_GAP;
  const yShift = -totalH / 2;
  for (const [id, slot] of map) {
    map.set(id, { x: slot.x, y: slot.y + yShift, w: slot.w, h: slot.h });
  }
  return map;
}

export function CanvasPixi() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());
  const [transform, setTransform] = useState<Transform>(() => ({
    tx: 0,
    ty: 0,
    scale: 0.05,
  }));
  // Lazy-init from matchMedia so the FIRST render already knows
  // whether we're mobile. With useState(false) the initial render
  // tried to lay out all 123 tiles in their desktop positions before
  // the effect kicked in — that flash broke the bento on mobile.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  // Re-evaluate on resize / orientation change.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ALL works are loaded as sprites on mobile. The bento OVERVIEW
  // shows only the curated subset (3 per project — "core" tiles);
  // the rest ("extras") sit at their cluster positions with alpha
  // 0 in overview and fade in when their project is the selected
  // group. That way the group view shows the FULL project gallery
  // assembled in place rather than just the curated 3.
  const displayWorks = useMemo(() => (isMobile ? WORKS : WORKS), [isMobile]);
  // The set of curated work IDs — these are the "core" tiles that
  // appear on the bento overview. Used by texture-load priority and
  // by the per-sprite tier flag.
  const coreIds = useMemo(() => {
    if (!isMobile) {
      return new Set(WORKS.map((w) => w.id));
    }
    return new Set(curateForMobile().map((w) => w.id));
  }, [isMobile]);

  // Bento layout: only the curated cores get bento positions.
  // Extras have no bento entry — they sit at their extras-grid
  // position (invisible in overview, visible only when their group
  // is selected).
  const bentoMap = useMemo(() => {
    if (!isMobile) return null;
    return bentoLayout(WORKS.filter((w) => coreIds.has(w.id)));
  }, [isMobile, coreIds]);
  // Project cluster layout: every project's full photo set in a
  // tight 4-col grid, anchored at the project's cores' centroid in
  // bento. When a group is selected, both cores and extras flow
  // into this grid — visually one coherent cluster of the project,
  // not "scattered cores plus a separate grid of extras".
  const clusterMap = useMemo(() => {
    if (!isMobile || !bentoMap) return null;
    return projectClusterLayout(WORKS, coreIds, bentoMap);
  }, [isMobile, bentoMap, coreIds]);

  // Compute viewport size on mount and on resize. Avoids SSR issues by
  // staying null until we know the real window size.
  useEffect(() => {
    function update() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Initial framing: animate camera from a tighter zoom out to the
  // bento fit over INTRO_REVEAL_MS — matched to the tile fade-in
  // window so the camera SETTLES the same instant the last sprite
  // reaches alpha 1. Gated on splashGone so the camera reveal doesn't
  // start while the logo is still up.
  const introAnimRef = useRef<number | null>(null);
  const splashGone = useSelection((s) => s.splashGone);
  useEffect(() => {
    if (!size || displayWorks.length === 0 || !splashGone) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    if (bentoMap) {
      for (const r of bentoMap.values()) {
        if (r.x < minX) minX = r.x;
        if (r.y < minY) minY = r.y;
        if (r.x + r.w > maxX) maxX = r.x + r.w;
        if (r.y + r.h > maxY) maxY = r.y + r.h;
      }
    } else {
      for (const w of displayWorks) {
        const wb = workBounds(w);
        if (wb.minX < minX) minX = wb.minX;
        if (wb.minY < minY) minY = wb.minY;
        if (wb.maxX > maxX) maxX = wb.maxX;
        if (wb.maxY > maxY) maxY = wb.maxY;
      }
    }
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const targetScale = isMobile
      ? (size.w / bboxW) * 0.95
      : Math.min(size.w / bboxW, size.h / bboxH) * 0.85;
    // Stash the bento-fit scale so the touch handlers can detect
    // pinch-out exit from group view.
    bentoFitScaleRef.current = targetScale;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const target: Transform = {
      tx: size.w / 2 - cx * targetScale,
      ty: size.h / 2 - cy * targetScale,
      scale: targetScale,
    };

    // Snap the camera to a CENTERED start position at a smaller
    // scale so the intro reads as "already centered, zooming in"
    // rather than sliding diagonally from the top-left default
    // (tx=0,ty=0,scale=0.05). Cubic ease-out tween over
    // INTRO_REVEAL_MS overlaps the staggered sprite fade-in.
    const startScale = targetScale * 0.55;
    const start: Transform = {
      tx: size.w / 2 - cx * startScale,
      ty: size.h / 2 - cy * startScale,
      scale: startScale,
    };
    transformRef.current = start;
    {
      const c = pixiContainerRef.current;
      if (c) {
        c.x = start.tx;
        c.y = start.ty;
        c.scale.set(start.scale);
      }
    }
    const t0 = performance.now();
    if (introAnimRef.current != null) cancelAnimationFrame(introAnimRef.current);
    function tick(now: number) {
      const t = Math.min(1, (now - t0) / INTRO_REVEAL_MS);
      const e = 1 - Math.pow(1 - t, 3);
      const tx = start.tx + (target.tx - start.tx) * e;
      const ty = start.ty + (target.ty - start.ty) * e;
      const scale = start.scale + (target.scale - start.scale) * e;
      transformRef.current = { tx, ty, scale };
      const c = pixiContainerRef.current;
      if (c) {
        c.x = tx;
        c.y = ty;
        c.scale.set(scale);
      }
      if (t < 1) {
        introAnimRef.current = requestAnimationFrame(tick);
      } else {
        introAnimRef.current = null;
        setTransform({ tx, ty, scale });
      }
    }
    introAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (introAnimRef.current != null) {
        cancelAnimationFrame(introAnimRef.current);
        introAnimRef.current = null;
      }
    };
  }, [size, displayWorks, bentoMap, isMobile, splashGone]);

  // Camera zoom-to-group on first tap. Mirrors the desktop behaviour:
  // when navTargetGroupKey is set (by selectWork via the store), fit
  // the group's bento bbox into the viewport with a smooth cubic-out
  // animation. Without this the group view stage on mobile felt
  // invisible — only the InspectorSheet rose, the canvas didn't move.
  const navTargetGroupKey = useSelection((s) => s.navTargetGroupKey);
  const clearNav = useSelection((s) => s.clearNav);
  const animRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!navTargetGroupKey || !size) return;
    // Find all sprites that belong to this group and compute the
    // bbox in canvas-space. Falls back to no-op if no rects yet
    // (textures still loading).
    // Camera fits the project's CLUSTER bbox — every tile in the
    // project (cores flying in + extras fading in) lives at its
    // clusterMap slot in group view, so that bbox is exactly what
    // we want to frame.
    const memberRects: { x: number; y: number; w: number; h: number }[] = [];
    for (const w of displayWorks) {
      if (`${w.title}|${w.year}` !== navTargetGroupKey) continue;
      const slot = clusterMap?.get(w.id);
      if (slot) memberRects.push(slot);
      else {
        const wb = workBounds(w);
        memberRects.push({ x: wb.minX, y: wb.minY, w: wb.width, h: wb.height });
      }
    }
    if (memberRects.length === 0) {
      clearNav();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of memberRects) {
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.x + r.w > maxX) maxX = r.x + r.w;
      if (r.y + r.h > maxY) maxY = r.y + r.h;
    }
    // Fit the cluster into the VISIBLE area — the band of the
    // viewport between the TopBar (top) and the InspectorSheet's
    // peek (bottom). Centring inside that band puts the cluster
    // visually middle of what the user actually sees, with all
    // tiles inside the frame.
    const PAD = 50;
    const TOP_RESERVE = 48; // TopBar height
    const BOTTOM_RESERVE = 56; // InspectorSheet peek height
    const visibleH = Math.max(1, size.h - TOP_RESERVE - BOTTOM_RESERVE);
    const bboxW = Math.max(1, maxX - minX + PAD * 2);
    const bboxH = Math.max(1, maxY - minY + PAD * 2);
    const targetScale = Math.min(
      Math.min(size.w / bboxW, visibleH / bboxH),
      3,
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // Anchor the cluster's centre in the MIDDLE of the visible
    // band (between TopBar and sheet peek) so it lands optically
    // centered for the user, not just geometrically centred in
    // the raw viewport.
    const visibleCenterY = TOP_RESERVE + visibleH / 2;
    const target: Transform = {
      tx: size.w / 2 - cx * targetScale,
      ty: visibleCenterY - cy * targetScale,
      scale: targetScale,
    };

    // Cubic ease-out tween via rAF, mutating both the PIXI
    // container and React state at the end. 1800ms gives the user
    // enough time to perceive the camera move as deliberate; the
    // sprite spread (in TileLayer's useTick) is paced to settle
    // around the same time.
    const start = transformRef.current;
    const t0 = performance.now();
    const DURATION = 1800;
    if (animRafRef.current != null) cancelAnimationFrame(animRafRef.current);
    function tick(now: number) {
      const t = Math.min(1, (now - t0) / DURATION);
      const e = 1 - Math.pow(1 - t, 3);
      const tx = start.tx + (target.tx - start.tx) * e;
      const ty = start.ty + (target.ty - start.ty) * e;
      const scale = start.scale + (target.scale - start.scale) * e;
      transformRef.current = { tx, ty, scale };
      const c = pixiContainerRef.current;
      if (c) {
        c.x = tx;
        c.y = ty;
        c.scale.set(scale);
      }
      if (t < 1) {
        animRafRef.current = requestAnimationFrame(tick);
      } else {
        animRafRef.current = null;
        setTransform({ tx, ty, scale });
        clearNav();
      }
    }
    animRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRafRef.current != null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
    };
  }, [navTargetGroupKey, size, displayWorks, clusterMap, clearNav]);

  // Progressive texture load. Cores load first (sequential — they
  // need to appear in bento ASAP) then extras load in PARALLEL
  // so the user doesn't sit through them dripping in one by one
  // when they open a group view. Browser caps concurrency at ~6
  // per origin, which is plenty.
  useEffect(() => {
    let cancelled = false;
    const map = new Map<string, Texture>();
    const cores = displayWorks.filter((w) => coreIds.has(w.id));
    const extras = displayWorks.filter((w) => !coreIds.has(w.id));
    async function loadOne(w: (typeof displayWorks)[number]) {
      const fullSrc = w.images[0]?.src ?? "";
      const src = asset(thumbSrc(fullSrc));
      if (!src) return;
      try {
        const tex = await Assets.load(src);
        if (cancelled) return;
        map.set(w.id, tex);
      } catch (e) {
        console.warn("[pixi] texture load failed", w.id, e);
      }
    }
    async function loadAll() {
      // Cores: sequential, with frequent setTextures so the bento
      // appears progressively.
      for (const w of cores) {
        if (cancelled) return;
        await loadOne(w);
        if (map.size % 5 === 0 || map.size === cores.length) {
          setTextures(new Map(map));
        }
      }
      setTextures(new Map(map));
      if (cancelled) return;
      // Extras: parallel. Browser concurrency cap throttles
      // naturally to ~6, which loads ~80MB of thumbs in 2-3s on
      // 4G instead of the 5-8s sequential.
      await Promise.all(extras.map((w) => loadOne(w)));
      if (cancelled) return;
      setTextures(new Map(map));
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [displayWorks, coreIds]);

  // Drag pan + pinch zoom. Lives on the wrapping div so we don't fight
  // PIXI's interaction system; it just moves the transform state and
  // PIXI re-renders the container.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    cx: number;
    cy: number;
  } | null>(null);

  // Mirror live transform in a ref so applyTransform always reads the
  // current value, never a stale closure copy. Critical for incremental
  // pan: each touchmove delta needs to apply to the LATEST transform,
  // not the one that existed when the listener was attached.
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Mirror group-expanded state in a ref so the touch handlers below
  // (bound once via addEventListener) can early-return when the
  // ExpandedGroup overlay is up — without it the wrapper's
  // preventDefault on touchmove would swallow the strip's horizontal
  // scroll.

  // Direct ref to the underlying PIXI Container so pinch/pan can
  // mutate its x/y/scale without going through React state. Skipping
  // the React reconciler per touchmove keeps pinch zoom buttery
  // (the previous rAF-throttled setState approach still cost a full
  // re-render of CanvasPixi every frame).
  const pixiContainerRef = useRef<PixiContainerType | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  // Bento fit scale, mirrored in a ref so the always-bound
  // applyTransform callback can read the current value to decide
  // when to auto-deselect (pinch out past bento exits group view).
  const bentoFitScaleRef = useRef(0);
  const deselect = useSelection((s) => s.deselect);
  const deselectRef = useRef(deselect);
  deselectRef.current = deselect;

  // Apply a transform mutation: write to the PIXI container
  // directly, update the transformRef, and schedule a debounced
  // setState to "settle" the React state once the user stops
  // interacting (so programmatic transforms — fitAll etc. — still
  // work via setTransform).
  const applyTransform = useCallback(
    (updater: (prev: Transform) => Transform) => {
      const next = updater(transformRef.current);
      transformRef.current = next;
      const c = pixiContainerRef.current;
      if (c) {
        c.x = next.tx;
        c.y = next.ty;
        c.scale.set(next.scale);
      }
      // Pinch-out exit: if the user is in group view AND has zoomed
      // out below the bento fit, drop the selection so the bento
      // crossfades back in. Threshold uses 1.05 of bento fit so
      // micro-fiddling doesn't accidentally exit.
      const bentoFit = bentoFitScaleRef.current;
      if (
        bentoFit > 0 &&
        next.scale < bentoFit * 1.05 &&
        selectedGroupKeyRef.current
      ) {
        deselectRef.current();
      }
      if (settleTimeoutRef.current != null) {
        window.clearTimeout(settleTimeoutRef.current);
      }
      settleTimeoutRef.current = window.setTimeout(() => {
        settleTimeoutRef.current = null;
        setTransform(transformRef.current);
      }, 120);
    },
    [],
  );
  useEffect(
    () => () => {
      if (settleTimeoutRef.current != null)
        window.clearTimeout(settleTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      // When a project gallery is up, leave touches alone so the
      // gallery's horizontal-snap carousel and pull-up sheets can
      // scroll natively.
      if (expandedGroupKeyRef.current) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        pinchRef.current = {
          distance: Math.hypot(dx, dy),
          scale: transformRef.current.scale,
          cx: (t1.clientX + t2.clientX) / 2,
          cy: (t1.clientY + t2.clientY) / 2,
        };
        dragRef.current = null;
      } else if (e.touches.length === 1) {
        // Same reason as touchmove -- preventDefault here cancels iOS's
        // default 1-finger gesture (potential edge swipe / scroll).
        e.preventDefault();
        dragRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        pinchRef.current = null;
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (expandedGroupKeyRef.current) return;
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        // Cap scale at 3x so a runaway pinch can't ask the GPU to draw
        // sprites at 5000+px and exhaust texture fillrate / memory.
        // Floor at the bento-fit scale (with a tiny 0.05x overshoot
        // tolerance) so zooming OUT past the overview just clamps —
        // no point letting the user shrink the bento to nothing.
        const minScale =
          bentoFitScaleRef.current > 0 ? bentoFitScaleRef.current * 0.95 : 0.02;
        const newScale = Math.max(
          minScale,
          Math.min(3, pinchRef.current.scale * (d / pinchRef.current.distance)),
        );
        // Anchor the zoom around the pinch centre so the canvas point
        // under the user's fingers stays put.
        applyTransform((t) => {
          const factor = newScale / t.scale;
          const cx = pinchRef.current!.cx;
          const cy = pinchRef.current!.cy;
          return {
            scale: newScale,
            tx: cx - (cx - t.tx) * factor,
            ty: cy - (cy - t.ty) * factor,
          };
        });
      } else if (e.touches.length === 1 && dragRef.current) {
        // preventDefault is required so iOS Safari doesn't intercept
        // the swipe as an edge gesture / scroll attempt.
        e.preventDefault();
        const dx = e.touches[0].clientX - dragRef.current.x;
        const dy = e.touches[0].clientY - dragRef.current.y;
        dragRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        applyTransform((t) => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }));
      }
    }
    function onTouchEnd() {
      dragRef.current = null;
      pinchRef.current = null;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.005);
        applyTransform((t) => {
          const minScale =
            bentoFitScaleRef.current > 0
              ? bentoFitScaleRef.current * 0.95
              : 0.02;
          const newScale = Math.max(minScale, Math.min(3, t.scale * factor));
          const eff = newScale / t.scale;
          return {
            scale: newScale,
            tx: e.clientX - (e.clientX - t.tx) * eff,
            ty: e.clientY - (e.clientY - t.ty) * eff,
          };
        });
      } else {
        applyTransform((t) => ({
          ...t,
          tx: t.tx - e.deltaX,
          ty: t.ty - e.deltaY,
        }));
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      dragRef.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      applyTransform((t) => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }));
    }
    function onPointerUp() {
      dragRef.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };
    // Deliberately empty deps: applyTransform is stable (reads from refs)
    // and we want one set of listeners attached for the component's life,
    // not re-attached on every gesture frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sprites = useMemo(() => {
    return displayWorks
      .map((w) => {
        const tex = textures.get(w.id);
        if (!tex) return null;
        const projectKey = `${w.title}|${w.year}`;
        const wb = workBounds(w);
        const isCore = coreIds.has(w.id);
        const cluster = clusterMap?.get(w.id);
        const clusterX = cluster?.x ?? wb.minX;
        const clusterY = cluster?.y ?? wb.minY;
        // Cores have a bento slot AND a cluster slot — they fly
        // from bento -> cluster on group view, back on close.
        // Extras only have a cluster slot — they don't move, just
        // fade in/out in place.
        const bentoSlot = isCore ? bentoMap?.get(w.id) : null;
        const bentoX = bentoSlot?.x ?? clusterX;
        const bentoY = bentoSlot?.y ?? clusterY;
        const w_ = cluster?.w ?? bentoSlot?.w ?? wb.width;
        const h_ = cluster?.h ?? bentoSlot?.h ?? wb.height;
        return {
          id: w.id,
          workId: w.id,
          projectKey,
          tex,
          tier: (isCore ? "core" : "extra") as "core" | "extra",
          x: bentoX,
          y: bentoY,
          w: w_,
          h: h_,
          bentoX,
          bentoY,
          clusterX,
          clusterY,
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [textures, displayWorks, bentoMap, clusterMap, coreIds]);

  // Tap-to-select. Two-stage interaction matches desktop's WorkTile:
  //  - First tap: selectWork — camera zooms to the group, the
  //    InspectorSheet bottom panel appears with project info bars
  //    (the "group view" stage).
  //  - Tap any tile in the same selected group: expandGroup —
  //    ExpandedGroup horizontal strip carousel opens (the "gallery"
  //    stage).
  // Tracks distance moved since pointerdown so a pan gesture doesn't
  // accidentally count as a tap on a tile.
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  const expandedGroupKeyRef = useRef(expandedGroupKey);
  expandedGroupKeyRef.current = expandedGroupKey;
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const selectedGroupKeyRef = useRef(selectedGroupKey);
  selectedGroupKeyRef.current = selectedGroupKey;
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const tapTrackerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onSpriteDown = useCallback((e: { global: { x: number; y: number } }) => {
    tapTrackerRef.current = {
      x: e.global.x,
      y: e.global.y,
      t: Date.now(),
    };
  }, []);
  const onSpriteUp = useCallback(
    (
      projectKey: string,
      workId: string,
      e: { global: { x: number; y: number } },
    ) => {
      const start = tapTrackerRef.current;
      tapTrackerRef.current = null;
      if (!start) return;
      const dist = Math.hypot(e.global.x - start.x, e.global.y - start.y);
      const dt = Date.now() - start.t;
      // Treat anything that moved more than 8px or took more than 500ms
      // as a drag / long-press, not a tap.
      if (dist > 8 || dt > 500) return;
      // Belt-and-braces: when a group is already in view, only
      // accept taps from that group's tiles. The TileLayer's
      // eventMode logic should already block hit-tests on faded-
      // out sprites, but this guards any race during the crossfade.
      if (
        selectedGroupKeyRef.current &&
        selectedGroupKeyRef.current !== projectKey
      ) {
        return;
      }
      // Same group already selected -> second tap opens the gallery.
      // Different group (or nothing) selected -> first tap selects.
      if (selectedGroupKeyRef.current === projectKey) {
        // Capture screen rects of every sprite in this group so the
        // gallery (ExpandedGroup) can FLIP-animate from those exact
        // bento positions into the carousel — visual continuity from
        // the canvas to the strip. Sprites not in the curated mobile
        // bento have no rect, so their gallery images simply fade in.
        const wrapper = containerRef.current;
        const tNow = transformRef.current;
        if (wrapper && tNow) {
          const cr = wrapper.getBoundingClientRect();
          const map = new Map<string, DOMRect>();
          for (const s of sprites) {
            if (s.projectKey !== projectKey) continue;
            const left = cr.left + s.x * tNow.scale + tNow.tx;
            const top = cr.top + s.y * tNow.scale + tNow.ty;
            const width = s.w * tNow.scale;
            const height = s.h * tNow.scale;
            map.set(s.workId, new DOMRect(left, top, width, height));
          }
          setFlipRects(map);
        }
        expandGroup(projectKey);
      } else {
        selectWork(workId, projectKey);
      }
    },
    [selectWork, expandGroup, sprites],
  );

  const wrapperStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "#fff",
    touchAction: "none",
  };

  return (
    <div ref={containerRef} style={wrapperStyle}>
      {size ? (
        <Application
          width={size.w}
          height={size.h}
          background="#ffffff"
          antialias
          resolution={typeof window !== "undefined" ? Math.min(1.5, window.devicePixelRatio || 1) : 1}
          autoDensity
        >
          <pixiContainer
            ref={pixiContainerRef}
            x={transform.tx}
            y={transform.ty}
            scale={transform.scale}
          >
            <TileLayer
              sprites={sprites}
              onSpriteDown={onSpriteDown}
              onSpriteUp={onSpriteUp}
              spread={selectedGroupKey != null}
              selectedGroupKey={selectedGroupKey}
            />
          </pixiContainer>
        </Application>
      ) : null}
      {/* Dev-only badge with the loaded-sprite count. Hidden on
          karimboumjimar.com / hubmerto.com — only shown in dev or on
          a *.vercel.app preview. */}
      {process.env.NODE_ENV !== "production" ||
      (typeof window !== "undefined" &&
        /vercel\.app$/.test(window.location.hostname)) ? (
        <div
          style={{
            position: "fixed",
            top: 8,
            left: 8,
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "ui-monospace, Menlo, monospace",
            background: "#ffd23f",
            color: "#111",
            borderRadius: 2,
            zIndex: 10,
          }}
        >
          pixi · {sprites.length}/{displayWorks.length} loaded
          {isMobile ? ` · mobile (curated)` : ` · desktop (full)`}
        </div>
      ) : null}
    </div>
  );
}

/** Renders the sprite list and animates fade-in via PIXI's ticker so
 * each frame's alpha update bypasses React entirely. The sprites
 * themselves are rendered with alpha=0 initially; useTick mutates each
 * Sprite ref's alpha directly until the fade-in completes. */
type SpriteSpec = {
  id: string;
  projectKey: string;
  workId: string;
  tex: Texture;
  /** "core" tiles appear on the bento overview (curated 3 per
   * project on mobile). "extra" tiles only appear in their group's
   * group-view stage — invisible in overview. */
  tier: "core" | "extra";
  x: number;
  y: number;
  w: number;
  h: number;
  // Bento (overview) and cluster (group view) target positions.
  // TileLayer's useTick lerps each sprite's x/y toward whichever
  // is current based on the spread flag.
  bentoX: number;
  bentoY: number;
  clusterX: number;
  clusterY: number;
};

/** Per-tile fade-in timing. Designed so EVERY tile finishes by the
 * 6s mark — matched exactly to the initial camera zoom duration so
 * the last sprite reaches alpha 1 the same instant the zoom settles.
 * Worst case = MAX_DELAY + DURATION = 4500 + 1500 = 6000ms. */
const INTRO_REVEAL_MS = 6000;
const TILE_DURATION_MS = 1500;
const TILE_MAX_DELAY_MS = INTRO_REVEAL_MS - TILE_DURATION_MS;

function tileFadeTiming(id: string): { delay: number; duration: number } {
  // Stable hash → pseudo-random 0..1 float per tile id.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const x = Math.sin(h) * 10000;
  const r = x - Math.floor(x);
  return {
    delay: Math.round(r * TILE_MAX_DELAY_MS),
    duration: TILE_DURATION_MS,
  };
}

function TileLayer({
  sprites,
  onSpriteDown,
  onSpriteUp,
  spread,
  selectedGroupKey,
}: {
  sprites: SpriteSpec[];
  onSpriteDown: (e: { global: { x: number; y: number } }) => void;
  onSpriteUp: (
    projectKey: string,
    workId: string,
    e: { global: { x: number; y: number } },
  ) => void;
  /** True when the user is in group view — sprites should animate
   * to their cluster positions. False = overview (bento). */
  spread: boolean;
  /** Which project's group view is open. Used to decide which
   * "extra" sprites should fade in (only those in this group). */
  selectedGroupKey: string | null;
}) {
  // Map of sprite id -> live PIXI Sprite. Populated by ref callbacks
  // when each <pixiSprite> mounts; consumed by useTick to update
  // alpha + position.
  const spriteRefs = useRef<Map<string, PixiSpriteType>>(new Map());
  // When THIS particular sprite was first allowed to start its fade.
  // Stamped lazily inside the ticker the first frame splashGone is
  // true, NOT at mount time — sprites mount silently behind the
  // splash and only begin their fade-in once the logo is gone.
  const mountedAtRef = useRef<Map<string, number>>(new Map());
  // Per-sprite spec lookup so the ticker can reach bento/cluster
  // positions without iterating the sprites array each frame.
  const specByIdRef = useRef<Map<string, SpriteSpec>>(new Map());
  for (const s of sprites) specByIdRef.current.set(s.id, s);
  // Track which sprite ids we've already initialised (set alpha=0
  // + bento position on first mount). React re-fires the ref
  // callback on every sprites-prop change because the inline
  // arrow function has a new identity each render — without this
  // gate the sprite's alpha would snap back to 0 every progressive
  // texture-load setTextures call, causing the bento to BLINK.
  const initializedRef = useRef<Set<string>>(new Set());

  // Time-based bento <-> cluster tween. Snapshots the start
  // position of every sprite at the moment `spread` flips so
  // the tick can interpolate over a fixed duration with cubic
  // easing — matched to the camera zoom (1800ms) so tiles arrive
  // at their cluster slots the same time the camera lands.
  const SPREAD_TWEEN_MS = 1800;
  const spreadTweenStartRef = useRef<number | null>(null);
  const spreadFromRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  useEffect(() => {
    const now = performance.now();
    spreadTweenStartRef.current = now;
    const snap = new Map<string, { x: number; y: number }>();
    for (const [id, sprite] of spriteRefs.current) {
      if (!sprite) continue;
      snap.set(id, { x: sprite.x, y: sprite.y });
    }
    spreadFromRef.current = snap;
    // selectedGroupKey is in the dep list too: when the user
    // switches between groups, snapshot the new "from" so the
    // previous group's cores tween back to bento while the new
    // group's cores tween out to their cluster — same animation
    // beat as a fresh group-view open.
  }, [spread, selectedGroupKey]);
  // Mirror splashGone + spread + selectedGroupKey in refs so the
  // always-on tick reads the live values without re-binding the
  // callback.
  const splashGoneState = useSelection((s) => s.splashGone);
  const splashGoneRef = useRef(splashGoneState);
  splashGoneRef.current = splashGoneState;
  const spreadRef = useRef(spread);
  spreadRef.current = spread;
  const selectedGroupKeyRef = useRef(selectedGroupKey);
  selectedGroupKeyRef.current = selectedGroupKey;

  useTick(() => {
    const splashGone = splashGoneRef.current;
    if (!splashGone) {
      // Hold sprites at alpha 0 while the logo is up. Don't stamp
      // mountedAt yet so the fade-in starts the first frame splash
      // clears, not at sprite-mount time.
      for (const [, sprite] of spriteRefs.current) {
        if (sprite) sprite.alpha = 0;
      }
      return;
    }
    const now = performance.now();
    const isSpread = spreadRef.current;
    const selKey = selectedGroupKeyRef.current;
    for (const [id, sprite] of spriteRefs.current) {
      if (!sprite) continue;
      const spec = specByIdRef.current.get(id);
      if (!spec) continue;

      // Intro fade-in stagger (still only applies the FIRST time
      // this sprite reveals — extras start invisible and only fade
      // in when their group is selected, but they share the same
      // ease curve).
      let mountedAt = mountedAtRef.current.get(id);
      if (mountedAt == null) {
        mountedAt = now;
        mountedAtRef.current.set(id, mountedAt);
      }
      const { delay, duration } = tileFadeTiming(id);
      const elapsed = now - mountedAt - delay;
      let intro;
      if (elapsed <= 0) intro = 0;
      else if (elapsed >= duration) intro = 1;
      else {
        const t = elapsed / duration;
        intro = 1 - Math.pow(1 - t, 3);
      }

      // Visibility:
      //  - Overview (no spread): cores visible (subject to intro
      //    stagger), extras invisible.
      //  - Group view (spread): ONLY the selected project's tiles
      //    visible — cores + extras for that project. Every other
      //    tile (core or extra, in any other project) fades out.
      //    This makes the bento diamond cleanly disappear when a
      //    group opens, leaving just the selected project's
      //    cluster on a clean canvas.
      const isCore = spec.tier === "core";
      const isInSelectedProject = spec.projectKey === selKey;
      let targetAlpha: number;
      if (!isSpread) {
        targetAlpha = isCore ? intro : 0;
      } else {
        targetAlpha = isInSelectedProject ? intro : 0;
      }
      // Slower alpha lerp (0.06 ≈ ~700ms time constant) so the
      // bento and the cluster crossfade smoothly.
      sprite.alpha += (targetAlpha - sprite.alpha) * 0.06;
      // Tiles fading out (or already invisible) shouldn't catch
      // taps — otherwise the user could accidentally select a
      // different group while in group view, since alpha 0 sprites
      // are still hit-tested by default.
      sprite.eventMode = sprite.alpha > 0.5 ? "static" : "none";

      // Position: only the SELECTED project's tiles flow into
      // their cluster slot when group view opens. Other projects'
      // tiles stay at their bento positions (off-camera once the
      // camera zooms in). Time-based cubic-in-out tween from the
      // snapshotted "from" position to the current target, synced
      // with the 1800ms camera zoom.
      const tweenStart = spreadTweenStartRef.current;
      const moveToCluster = isSpread && spec.projectKey === selKey;
      const targetX = moveToCluster ? spec.clusterX : spec.bentoX;
      const targetY = moveToCluster ? spec.clusterY : spec.bentoY;
      if (tweenStart != null) {
        const t = Math.min(1, (now - tweenStart) / SPREAD_TWEEN_MS);
        const e =
          t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic in-out
        const from = spreadFromRef.current.get(id);
        const fromX = from?.x ?? targetX;
        const fromY = from?.y ?? targetY;
        sprite.x = fromX + (targetX - fromX) * e;
        sprite.y = fromY + (targetY - fromY) * e;
      } else {
        sprite.x = targetX;
        sprite.y = targetY;
      }
    }
  });

  return (
    <>
      {sprites.map((s) => (
        <pixiSprite
          key={s.id}
          ref={(node: PixiSpriteType | null) => {
            if (node) {
              spriteRefs.current.set(s.id, node);
              // FIRST mount only: start invisible at the bento
              // position. React re-fires this callback whenever
              // the parent's sprites prop changes (and the inline
              // arrow has a new identity each render), so guard
              // with initializedRef — otherwise alpha + position
              // get snapped back to bento every progressive
              // texture load and the bento blinks.
              if (!initializedRef.current.has(s.id)) {
                initializedRef.current.add(s.id);
                node.alpha = 0;
                node.x = s.bentoX;
                node.y = s.bentoY;
              }
            } else {
              spriteRefs.current.delete(s.id);
              // Keep mountedAt + initializedRef — even if React
              // re-fires the ref callback the sprite stays
              // logically mounted from our point of view.
            }
          }}
          texture={s.tex}
          width={s.w}
          height={s.h}
          eventMode="static"
          cursor="pointer"
          onPointerDown={onSpriteDown}
          onPointerUp={(e: { global: { x: number; y: number } }) =>
            onSpriteUp(s.projectKey, s.workId, e)
          }
        />
      ))}
    </>
  );
}

