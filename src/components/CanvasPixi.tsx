"use client";

import { Application, extend } from "@pixi/react";
import { Assets, Container, Sprite, Texture } from "pixi.js";
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
import { asset } from "@/lib/paths";

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
  const [isMobile, setIsMobile] = useState(false);

  // Decide curated subset (mobile) vs full set (desktop) based on
  // viewport width. Re-runs on orientation change.
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
    const scale = Math.min(size.w / bboxW, size.h / bboxH) * 0.85;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setTransform({
      tx: size.w / 2 - cx * scale,
      ty: size.h / 2 - cy * scale,
      scale,
    });
  }, [size, displayWorks, bentoMap]);

  // Progressive texture load. Only loads the displayed subset (mobile =
  // ~39 tiles, desktop = 123). The rest are loaded on-demand when the
  // gallery opens.
  useEffect(() => {
    let cancelled = false;
    const map = new Map<string, Texture>();
    async function loadAll() {
      for (const w of displayWorks) {
        if (cancelled) return;
        const src = asset(w.images[0]?.src ?? "");
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

  // Coalesce transform updates to one per animation frame. Pinch and
  // touchmove can fire 60+ times per second; without this each event
  // triggers a React render of the whole sprite tree.
  const pendingTransformRef = useRef<Transform | null>(null);
  const rafRef = useRef<number | null>(null);
  const applyTransform = useCallback(
    (updater: (prev: Transform) => Transform) => {
      const current = pendingTransformRef.current ?? transformRef.current;
      pendingTransformRef.current = updater(current);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const next = pendingTransformRef.current;
        pendingTransformRef.current = null;
        if (next) setTransform(next);
      });
    },
    [],
  );
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
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
          return { id: w.id, projectKey, tex, x: slot.x, y: slot.y, w: slot.w, h: slot.h };
        }
        const wb = workBounds(w);
        return { id: w.id, projectKey, tex, x: wb.minX, y: wb.minY, w: wb.width, h: wb.height };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [textures, displayWorks, bentoMap]);

  // Tap-to-open-gallery. Tracks distance moved since pointerdown so a
  // pan gesture doesn't accidentally count as a tap on a tile.
  const [openProject, setOpenProject] = useState<string | null>(null);
  const tapTrackerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onSpriteDown = useCallback((e: { global: { x: number; y: number } }) => {
    tapTrackerRef.current = {
      x: e.global.x,
      y: e.global.y,
      t: Date.now(),
    };
  }, []);
  const onSpriteUp = useCallback((projectKey: string, e: { global: { x: number; y: number } }) => {
    const start = tapTrackerRef.current;
    tapTrackerRef.current = null;
    if (!start) return;
    const dist = Math.hypot(e.global.x - start.x, e.global.y - start.y);
    const dt = Date.now() - start.t;
    // Treat anything that moved more than 8px or took more than 500ms
    // as a drag / long-press, not a tap.
    if (dist > 8 || dt > 500) return;
    setOpenProject(projectKey);
  }, []);

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
          <pixiContainer x={transform.tx} y={transform.ty} scale={transform.scale}>
            {sprites.map((s) => (
              <pixiSprite
                key={s.id}
                texture={s.tex}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                eventMode="static"
                cursor="pointer"
                onPointerDown={onSpriteDown}
                onPointerUp={(e: { global: { x: number; y: number } }) =>
                  onSpriteUp(s.projectKey, e)
                }
              />
            ))}
          </pixiContainer>
        </Application>
      ) : null}
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
      {openProject ? (
        <PixiGallery
          projectKey={openProject}
          onClose={() => setOpenProject(null)}
        />
      ) : null}
    </div>
  );
}

/** DOM overlay that shows all images for the tapped project. Plain
 * <img> tags (5-20 per gallery) are well within iOS Safari's budget;
 * the only thing the canvas approach can't handle is the dense overview
 * with 100+ images all at once. */
function PixiGallery({
  projectKey,
  onClose,
}: {
  projectKey: string;
  onClose: () => void;
}) {
  const [title, year] = projectKey.split("|");
  const works = useMemo(
    () => WORKS.filter((w) => `${w.title}|${w.year}` === projectKey),
    [projectKey],
  );

  // Lock body scroll while the gallery is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={`${title}, ${year}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #eee",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ color: "#111" }}>{title}</div>
          <div style={{ fontStyle: "italic", color: "#999" }}>{year}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: 0,
            color: "#999",
            fontSize: 18,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ×
        </button>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {works.map((w) => {
          const img = w.images[0];
          if (!img) return null;
          return (
            <figure key={w.id} style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(img.src)}
                alt={img.alt}
                width={img.width}
                height={img.height}
                loading="lazy"
                decoding="async"
                draggable={false}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  background: "#f5f5f5",
                }}
              />
            </figure>
          );
        })}
      </div>
    </div>
  );
}
