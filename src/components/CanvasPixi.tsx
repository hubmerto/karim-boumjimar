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
 * (canvas-space x, y) for the centre of each tile. Independent from
 * each tile's natural workBounds position. */
function bentoLayout(works: typeof WORKS) {
  const counts = diamondColCounts(works.length);
  const cols = counts.length;
  // Deterministic shuffle so works from the same group don't cluster.
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

  const displayWorks = useMemo(
    () => (isMobile ? curateForMobile() : WORKS),
    [isMobile],
  );

  // Bento layout (tall diamond) on mobile. On desktop, leave tiles at
  // their natural canvas-space positions for now -- desktop bento can
  // come later.
  const bentoMap = useMemo(
    () => (isMobile ? bentoLayout(displayWorks) : null),
    [isMobile, displayWorks],
  );

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

  // Initial framing: fit displayed works into the viewport once size known.
  useEffect(() => {
    if (!size || displayWorks.length === 0) return;
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
    // On mobile the bento is a tall vertical diamond — fitting the
    // whole height makes images tiny with huge horizontal margins.
    // Fit by width instead and let the top/bottom rows clip; the
    // user can pan vertically to reach them. Desktop still fits
    // both axes.
    const scale = isMobile
      ? (size.w / bboxW) * 0.95
      : Math.min(size.w / bboxW, size.h / bboxH) * 0.85;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setTransform({
      tx: size.w / 2 - cx * scale,
      ty: size.h / 2 - cy * scale,
      scale,
    });
  }, [size, displayWorks, bentoMap, isMobile]);

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
    const memberRects: { x: number; y: number; w: number; h: number }[] = [];
    for (const w of displayWorks) {
      if (`${w.title}|${w.year}` !== navTargetGroupKey) continue;
      const slot = bentoMap?.get(w.id);
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
    // Padding around the group + headroom for the InspectorSheet
    // peek bar at the bottom (~140px on mobile gives the sheet a
    // landing zone without covering the group).
    const PAD = 80;
    const SHEET_HEAD_ROOM = 140;
    const bboxW = Math.max(1, maxX - minX + PAD * 2);
    const bboxH = Math.max(1, maxY - minY + PAD * 2 + SHEET_HEAD_ROOM);
    const targetScale = Math.min(
      Math.min(size.w / bboxW, size.h / bboxH) * 0.95,
      3,
    );
    const cx = (minX + maxX) / 2;
    // Shift the target a bit upward so the sheet's mid snap doesn't
    // overlap the group.
    const cy = (minY + maxY) / 2 - SHEET_HEAD_ROOM / 2 / targetScale;
    const target: Transform = {
      tx: size.w / 2 - cx * targetScale,
      ty: size.h / 2 - cy * targetScale,
      scale: targetScale,
    };

    // Cubic ease-out tween over 900ms via rAF, mutating both the
    // PIXI container and React state at the end so the rest of the
    // app sees the settled value.
    const start = transformRef.current;
    const t0 = performance.now();
    const DURATION = 900;
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
  }, [navTargetGroupKey, size, displayWorks, bentoMap, clearNav]);

  // Progressive texture load. Only loads the displayed subset (mobile =
  // ~39 tiles, desktop = 123). The rest are loaded on-demand when the
  // gallery opens.
  useEffect(() => {
    let cancelled = false;
    const map = new Map<string, Texture>();
    async function loadAll() {
      for (const w of displayWorks) {
        if (cancelled) return;
        const fullSrc = w.images[0]?.src ?? "";
        // Load 600px thumbnails into PIXI textures — the bento tiles
        // never render larger than ~300-400px on screen, so the full
        // 2400px webps were ~5x heavier than needed. Full-res is used
        // by the gallery (ExpandedGroup) which loads on demand.
        const src = asset(thumbSrc(fullSrc));
        if (!src) continue;
        try {
          const tex = await Assets.load(src);
          if (cancelled) return;
          map.set(w.id, tex);
          if (map.size % 5 === 0 || map.size === displayWorks.length) {
            setTextures(new Map(map));
          }
        } catch (e) {
          console.warn("[pixi] texture load failed", w.id, e);
        }
      }
      setTextures(new Map(map));
    }
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [displayWorks]);

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
        const newScale = Math.max(
          0.02,
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
          const newScale = Math.max(0.02, Math.min(3, t.scale * factor));
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
        const slot = bentoMap?.get(w.id);
        const projectKey = `${w.title}|${w.year}`;
        if (slot) {
          return { id: w.id, workId: w.id, projectKey, tex, x: slot.x, y: slot.y, w: slot.w, h: slot.h };
        }
        const wb = workBounds(w);
        return { id: w.id, workId: w.id, projectKey, tex, x: wb.minX, y: wb.minY, w: wb.width, h: wb.height };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [textures, displayWorks, bentoMap]);

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
  x: number;
  y: number;
  w: number;
  h: number;
};

function tileFadeTiming(id: string): { delay: number; duration: number } {
  // Stable hash → two pseudo-random 0..1 floats per tile id.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const r1 = (() => {
    const x = Math.sin(h) * 10000;
    return x - Math.floor(x);
  })();
  const r2 = (() => {
    const x = Math.sin(h * 1.71 + 1) * 10000;
    return x - Math.floor(x);
  })();
  return {
    delay: Math.round(r1 * 5000),
    duration: Math.round(1000 + r2 * 1000),
  };
}

function TileLayer({
  sprites,
  onSpriteDown,
  onSpriteUp,
  selectedGroupKey,
}: {
  sprites: SpriteSpec[];
  onSpriteDown: (e: { global: { x: number; y: number } }) => void;
  onSpriteUp: (
    projectKey: string,
    workId: string,
    e: { global: { x: number; y: number } },
  ) => void;
  selectedGroupKey: string | null;
}) {
  // Map of sprite id -> live PIXI Sprite. Populated by ref callbacks
  // when each <pixiSprite> mounts; consumed by useTick to update alpha.
  const spriteRefs = useRef<Map<string, PixiSpriteType>>(new Map());
  // When THIS particular sprite first became visible to the renderer.
  const mountedAtRef = useRef<Map<string, number>>(new Map());
  // Map of sprite id -> projectKey, kept in sync with the sprites prop
  // so the ticker can decide which sprites to dim without re-binding.
  const projectKeyByIdRef = useRef<Map<string, string>>(new Map());
  for (const s of sprites) projectKeyByIdRef.current.set(s.id, s.projectKey);
  // Latest selectedGroupKey from props, mirrored to a ref so the
  // ticker reads the live value (the tick callback closure is stable
  // for the layer's lifetime).
  const selectedGroupKeyRef = useRef(selectedGroupKey);
  selectedGroupKeyRef.current = selectedGroupKey;

  useTick(() => {
    const now = performance.now();
    const selKey = selectedGroupKeyRef.current;
    for (const [id, sprite] of spriteRefs.current) {
      if (!sprite) continue;
      const mountedAt = mountedAtRef.current.get(id);
      if (mountedAt == null) continue;

      // Initial fade-in (intro) — sprite climbs from alpha 0 to 1
      // over its randomized delay+duration window.
      const { delay, duration } = tileFadeTiming(id);
      const elapsed = now - mountedAt - delay;
      let intro: number;
      if (elapsed <= 0) intro = 0;
      else if (elapsed >= duration) intro = 1;
      else {
        const t = elapsed / duration;
        intro = 1 - Math.pow(1 - t, 3);
      }

      // Group-dim factor: sprites NOT in the selected group dim down
      // to 0.12, sprites IN the selected group (or none selected) at 1.
      const projectKey = projectKeyByIdRef.current.get(id);
      const inGroup = !selKey || projectKey === selKey;
      const target = (inGroup ? 1 : 0.12) * intro;

      // Smoothly lerp toward the target so dim transitions don't pop.
      // 0.18 lerp factor ≈ 200ms time constant at 60fps.
      sprite.alpha += (target - sprite.alpha) * 0.18;
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
              // FIRST mount only: stamp the start time and start from
              // alpha=0. We do NOT pass `alpha={0}` as a JSX prop,
              // because @pixi/react reapplies props on every parent
              // re-render and would smash the ticker's mutation back
              // to 0 every time the user zoomed/panned.
              if (!mountedAtRef.current.has(s.id)) {
                node.alpha = 0;
                mountedAtRef.current.set(s.id, performance.now());
              }
            } else {
              spriteRefs.current.delete(s.id);
              // Keep mountedAt — if React re-fires the ref callback
              // (e.g. callback identity changed between renders) the
              // sprite shouldn't restart its fade.
            }
          }}
          texture={s.tex}
          x={s.x}
          y={s.y}
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

