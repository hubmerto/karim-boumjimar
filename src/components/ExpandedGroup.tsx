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
import { workBounds } from "@/lib/canvas-math";
import { useDispersion } from "@/lib/dispersion";
import { clearFlipRects, getFlipRect } from "@/lib/flipRects";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

const TRANSITION_MS = 1500;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type Phase = "opening" | "open" | "closing";

/**
 * Horizontal full-height strip of a group's works. On open and close, each
 * image FLIP-animates between its canvas-tile rect and its gallery-tile rect
 * so the transition reads as movement, not a cut.
 */
export function ExpandedGroup() {
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  const collapseGroup = useSelection((s) => s.collapseGroup);
  // selectedId is the tile the user actually tapped to open the
  // gallery — used below to scroll the carousel to that image
  // instead of starting at index 0.
  const selectedId = useSelection((s) => s.selectedId);
  const { baseOffsets, transformRef, containerRef } = useDispersion();
  const [displayKey, setDisplayKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("opening");
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sourceRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Compute the SETTLED screen rect for each tile in a group that is
  // actually mounted on the canvas. On mobile only a curated subset is
  // rendered, so works not in the DOM get no source rect and the FLIP
  // useLayoutEffect skips them (they fade in at their natural gallery
  // position instead of animating from a phantom canvas spot).
  //
  // For mounted tiles, the rect is derived from canvas math
  // (workBounds + baseOffset projected through the live transform)
  // rather than getBoundingClientRect, because the latter returns
  // the in-progress CSS-transition position and the FLIP would land
  // at a mid-animation spot.
  const captureSourceRects = useCallback(
    (groupKey: string) => {
      const map = new Map<string, DOMRect>();
      // Try the Pixi handoff first — CanvasPixi populates this with
      // sprite screen rects right before calling expandGroup, so the
      // mobile FLIP source matches exactly where the user saw each
      // tile on the bento. After consuming, clear so a stale
      // snapshot can't leak into a different group's open.
      let usedFlipHandoff = false;
      for (const w of WORKS) {
        if (`${w.title}|${w.year}` !== groupKey) continue;
        const r = getFlipRect(w.id);
        if (r) {
          map.set(w.id, r);
          usedFlipHandoff = true;
        }
      }
      if (usedFlipHandoff) {
        clearFlipRects();
        sourceRectsRef.current = map;
        return;
      }

      // Desktop path: derive source rects from the DOM canvas's
      // workBounds + dispersion offsets, projected through the live
      // transform.
      const container = containerRef?.current;
      const t = transformRef?.current;
      if (!container || !t) {
        sourceRectsRef.current = map;
        return;
      }
      const cr = container.getBoundingClientRect();
      for (const w of WORKS) {
        if (`${w.title}|${w.year}` !== groupKey) continue;
        const tileEl = document.querySelector(`button[data-work-id="${w.id}"]`);
        if (!tileEl) continue;
        const wb = workBounds(w);
        const off = baseOffsets.get(w.id) ?? { x: 0, y: 0 };
        const left = cr.left + (wb.minX + off.x) * t.scale + t.tx;
        const top = cr.top + (wb.minY + off.y) * t.scale + t.ty;
        const width = wb.width * t.scale;
        const height = wb.height * t.scale;
        map.set(w.id, new DOMRect(left, top, width, height));
      }
      sourceRectsRef.current = map;
    },
    [baseOffsets, transformRef, containerRef],
  );

  // Sync internal display state with the store. Open: capture canvas-tile
  // rects, mount the gallery, run FLIP-open. Close: capture rects again
  // (camera hasn't moved during gallery view), run FLIP-close, then unmount.
  useEffect(() => {
    if (expandedGroupKey && !displayKey) {
      captureSourceRects(expandedGroupKey);
      setDisplayKey(expandedGroupKey);
      setPhase("opening");
    } else if (!expandedGroupKey && displayKey && phase !== "closing") {
      captureSourceRects(displayKey);
      setPhase("closing");
    }
  }, [expandedGroupKey, displayKey, phase, captureSourceRects]);

  const works = useMemo(() => {
    if (!displayKey) return [];
    return WORKS.filter((w) => `${w.title}|${w.year}` === displayKey);
  }, [displayKey]);

  const heading = useMemo(() => {
    if (!displayKey) return null;
    const [title, year] = displayKey.split("|");
    return { title, year };
  }, [displayKey]);

  // FLIP open: place each item at its canvas-tile rect, then transition to
  // its natural gallery position.
  useLayoutEffect(() => {
    if (phase !== "opening" || !displayKey) return;
    const items = itemRefs.current;
    items.forEach((el, id) => {
      const src = sourceRectsRef.current.get(id);
      if (!src) return;
      const dst = el.getBoundingClientRect();
      if (dst.width === 0 || dst.height === 0) return;
      const dx = src.left - dst.left;
      const dy = src.top - dst.top;
      const s = Math.min(src.width / dst.width, src.height / dst.height);
      el.style.transition = "none";
      el.style.transformOrigin = "top left";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      el.style.opacity = "1";
    });
    // Force reflow before transition kicks in. Scoped to the wrapper
    // (not document.body) -- reading body.offsetHeight while the body
    // is locked with overflow:hidden and viewport-constrained sizes
    // can panic iOS Safari layout.
    if (wrapperRef.current) void wrapperRef.current.offsetHeight;
    requestAnimationFrame(() => {
      items.forEach((el) => {
        el.style.transition = `transform ${TRANSITION_MS}ms ${EASE}`;
        el.style.transform = "";
      });
    });
    const t = setTimeout(() => setPhase("open"), TRANSITION_MS + 40);
    return () => clearTimeout(t);
  }, [phase, displayKey]);

  // Scroll the carousel so the tile the user actually tapped lands
  // first. Without this the strip always opened at index 0
  // regardless of which photo launched it.
  useLayoutEffect(() => {
    if (!displayKey || !selectedId) return;
    const target = itemRefs.current.get(selectedId);
    const scroller = scrollRef.current;
    if (!target || !scroller) return;
    const targetLeft = target.offsetLeft - scroller.offsetLeft;
    scroller.scrollLeft = targetLeft;
  }, [displayKey, selectedId]);

  // FLIP close: animate each item back to its canvas-tile rect, then unmount.
  useLayoutEffect(() => {
    if (phase !== "closing") return;
    const items = itemRefs.current;
    items.forEach((el, id) => {
      const src = sourceRectsRef.current.get(id);
      if (!src) return;
      const dst = el.getBoundingClientRect();
      if (dst.width === 0 || dst.height === 0) return;
      const dx = src.left - dst.left;
      const dy = src.top - dst.top;
      const s = Math.min(src.width / dst.width, src.height / dst.height);
      el.style.transition = `transform ${TRANSITION_MS}ms ${EASE}`;
      el.style.transformOrigin = "top left";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    });
    const t = setTimeout(() => setDisplayKey(null), TRANSITION_MS + 40);
    return () => clearTimeout(t);
  }, [phase]);

  // Esc to close.
  useEffect(() => {
    if (!displayKey) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        collapseGroup();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [displayKey, collapseGroup]);

  // Horizontal scroll + pinch-zoom-out to close. Listener on the scroller
  // both handles the strip and stops the wheel from bubbling to the canvas
  // (which would pan the canvas underneath).
  useEffect(() => {
    if (phase !== "open") return;
    const el = scrollRef.current;
    if (!el) return;
    const node: HTMLDivElement = el;
    function onWheel(e: WheelEvent) {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY > 0) collapseGroup();
        return;
      }
      if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [phase, collapseGroup]);

  // Catch any wheel events that happen on dialog chrome (background, title,
  // close button), block them entirely so the canvas can't be panned.
  useEffect(() => {
    if (!displayKey) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
    }
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [displayKey]);

  if (!displayKey || !works.length) return null;

  const fade = phase === "open" ? 1 : 0;
  const chromeStyle = {
    opacity: fade,
    transition: `opacity 320ms ${EASE} ${phase === "opening" ? 280 : 0}ms`,
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-20 bg-canvas"
      role="dialog"
      aria-label="Expanded group"
      onClick={(e) => {
        e.stopPropagation();
        if (phase !== "open") return;
        const t = e.target as HTMLElement;
        if (!t.closest("[data-expanded-tile]")) collapseGroup();
      }}
      // Stop pointer events from reaching the canvas behind, so dragging
      // inside the gallery never pans or alters the canvas transform.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      {heading ? (
        <div
          className="pointer-events-none absolute left-4 top-4 z-10 italic text-[10px] uppercase tracking-[0.1em] text-mute"
          style={chromeStyle}
        >
          {heading.title} · <time>{heading.year}</time>
        </div>
      ) : null}
      <button
        type="button"
        onClick={collapseGroup}
        aria-label="Close expanded view"
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center border border-line bg-canvas text-mute hover:text-ink"
        style={{
          ...chromeStyle,
          pointerEvents: phase === "open" ? "auto" : "none",
        }}
      >
        <span className="text-[14px]">×</span>
      </button>
      <div
        ref={scrollRef}
        className="flex h-full w-full items-center gap-8 px-4 pt-14"
        style={{
          overflowX: phase === "open" ? "auto" : "hidden",
          overflowY: "hidden",
          touchAction: "pan-x",
        }}
      >
        {works.map((w) => {
          const img = w.images[0];
          if (!img) return null;
          return (
            <div
              key={w.id}
              data-expanded-tile={w.id}
              ref={(el) => {
                if (el) itemRefs.current.set(w.id, el);
                else itemRefs.current.delete(w.id);
              }}
              className="flex h-full flex-shrink-0 items-center"
              style={{ willChange: "transform" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(img.src)}
                alt={img.alt}
                width={img.width}
                height={img.height}
                draggable={false}
                // h-[88%] (not max-h) so all items render at the same height
                // regardless of native dimensions. The width/height attrs
                // are critical for the FLIP-open animation: without them
                // the <img> has w=0 until it's downloaded, the parent div
                // measures 0 width via getBoundingClientRect, and the FLIP
                // useLayoutEffect skips that tile (the dst.width === 0
                // guard). Result: gallery jumps in instead of FLIP-ing the
                // first time the user visits, then works on subsequent
                // opens because the image is now in cache.
                className="block h-[88%] w-auto select-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
