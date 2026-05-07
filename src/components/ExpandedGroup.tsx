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
import { clearFlipRects, getFlipRect } from "@/lib/flipRects";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";
import { thumbSrc } from "@/lib/thumbs";

// Slower FLIP so photos visibly travel between their canvas-tile
// position and their gallery-strip slot. 1500ms still read as a snap
// when many tiles were close to their destination — at 2400ms the
// trajectory of each image is legible. Easing softened to `0.22, 1,
// 0.36, 1` (the same curve WorkTile uses for the bento spread) so
// the whole motion system feels like one settle, not two different
// ones glued together.
const TRANSITION_MS = 2400;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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
  // Capture order:
  //   1. Pixi handoff for mobile (CanvasPixi writes sprite screen
  //      rects right before calling expandGroup).
  //   2. Desktop falls back to the tile button's own
  //      getBoundingClientRect — that's the EXACT pixel-rounded
  //      position the browser drew the thumbnail at, so the FLIP
  //      lands on it without the half-pixel drift you get from
  //      projecting workBounds + dispersion offsets through the
  //      transform (each is rounded independently in WorkTile, but
  //      the canvas-math formula doesn't account for that).
  const captureSourceRects = useCallback(
    (groupKey: string) => {
      const map = new Map<string, DOMRect>();
      // Try the Pixi handoff first — CanvasPixi populates this with
      // sprite screen rects right before calling expandGroup. After
      // consuming, clear so a stale snapshot can't leak into a
      // different group's open.
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

      // Desktop path: read the tile button's actual rendered rect.
      // The camera is settled at both open and close (gallery
      // covers the canvas; user can't pan it), so the bounding
      // rect reflects the true position the user sees.
      for (const w of WORKS) {
        if (`${w.title}|${w.year}` !== groupKey) continue;
        const tileEl = document.querySelector(
          `button[data-work-id="${w.id}"]`,
        );
        if (!tileEl) continue;
        map.set(w.id, tileEl.getBoundingClientRect());
      }
      sourceRectsRef.current = map;
    },
    [],
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
    const list = WORKS.filter((w) => `${w.title}|${w.year}` === displayKey);
    // Rotate so the tile the user actually tapped becomes index 0
    // — the tapped photo is the FIRST in the carousel, with the
    // remaining photos following in their original order (wrap
    // around). Falls back to the natural order if no selection.
    if (!selectedId) return list;
    const idx = list.findIndex((w) => w.id === selectedId);
    if (idx <= 0) return list;
    return [...list.slice(idx), ...list.slice(0, idx)];
  }, [displayKey, selectedId]);

  const heading = useMemo(() => {
    if (!displayKey) return null;
    const [title, year] = displayKey.split("|");
    return { title, year };
  }, [displayKey]);

  // FLIP open: place each item at its canvas-tile rect, then transition to
  // its natural gallery position. We animate the <img> inside the wrapper
  // (not the wrapper itself) — the wrapper has flex+items-center layout
  // and the img sits at h-[88%] vertically centered, so transforming the
  // wrapper would land the image with 6% padding top/bottom relative to
  // the source rect. After unmount the canvas tile fills its rect with
  // no padding, and the user sees a size jump on the cut. Animating the
  // img directly means the visible image's rect is the FLIP target,
  // which matches the tile's rect after handoff.
  useLayoutEffect(() => {
    if (phase !== "opening" || !displayKey) return;
    const items = itemRefs.current;
    items.forEach((el, id) => {
      const src = sourceRectsRef.current.get(id);
      if (!src) return;
      const target = el.querySelector("img") ?? el;
      const dst = target.getBoundingClientRect();
      if (dst.width === 0 || dst.height === 0) return;
      const dx = src.left - dst.left;
      const dy = src.top - dst.top;
      const s = Math.min(src.width / dst.width, src.height / dst.height);
      target.style.transition = "none";
      target.style.transformOrigin = "top left";
      target.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      el.style.opacity = "1";
    });
    // Force reflow before transition kicks in. Scoped to the wrapper
    // (not document.body) -- reading body.offsetHeight while the body
    // is locked with overflow:hidden and viewport-constrained sizes
    // can panic iOS Safari layout.
    if (wrapperRef.current) void wrapperRef.current.offsetHeight;
    requestAnimationFrame(() => {
      items.forEach((el) => {
        const target = el.querySelector("img") ?? el;
        target.style.transition = `transform ${TRANSITION_MS}ms ${EASE}`;
        target.style.transform = "";
      });
    });
    const t = setTimeout(() => setPhase("open"), TRANSITION_MS + 40);
    return () => clearTimeout(t);
  }, [phase, displayKey]);

  // FLIP close: animate each item back to its canvas-tile rect, then unmount.
  useLayoutEffect(() => {
    if (phase !== "closing") return;
    const items = itemRefs.current;
    items.forEach((el, id) => {
      const src = sourceRectsRef.current.get(id);
      if (!src) return;
      const target = el.querySelector("img") ?? el;
      const dst = target.getBoundingClientRect();
      if (dst.width === 0 || dst.height === 0) return;
      const dx = src.left - dst.left;
      const dy = src.top - dst.top;
      const s = Math.min(src.width / dst.width, src.height / dst.height);
      target.style.transition = `transform ${TRANSITION_MS}ms ${EASE}`;
      target.style.transformOrigin = "top left";
      target.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
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
          className="pointer-events-none absolute left-4 top-4 z-10 italic text-meta uppercase tracking-[0.1em] text-mute"
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
        <span className="text-caption">×</span>
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
              <ProgressiveImage
                fullSrc={asset(img.src)}
                thumbSrc={asset(thumbSrc(img.src))}
                alt={img.alt}
                width={img.width}
                height={img.height}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders the canvas thumbnail first (already cached because the
 * bento drew it) and swaps to the full-resolution image once it
 * has finished loading. Two reasons we do this:
 *
 * 1. The user never sees a white frame waiting for ~3500 px bytes
 *    to arrive — the thumbnail fills the slot the moment the
 *    gallery mounts.
 * 2. The thumbnail has known intrinsic dimensions, so the parent
 *    div has a non-zero bounding rect on the very first render.
 *    The FLIP useLayoutEffect needs that rect; otherwise it skips
 *    the tile and the photo "jumps" into position instead of
 *    animating from its bento spot.
 *
 * The width / height attrs come from the full-res image so the
 * computed aspect ratio is identical for both srcs and the swap
 * doesn't reflow the layout.
 */
function ProgressiveImage({
  fullSrc,
  thumbSrc,
  alt,
  width,
  height,
}: {
  fullSrc: string;
  thumbSrc: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  const [src, setSrc] = useState(thumbSrc);

  // Reset to the thumb whenever the work changes (e.g. user
  // jumps from one group's gallery directly to another). Without
  // this the new tile would briefly render the previous work's
  // full-res while its own thumb / full-res are still loading.
  useEffect(() => {
    setSrc(thumbSrc);
  }, [thumbSrc]);

  // Kick off the full-res load off-DOM. Once it's in cache, swap
  // the visible <img>'s src — the browser will paint the high-res
  // version on the next frame without any flicker because the
  // dimensions are identical.
  useEffect(() => {
    let cancelled = false;
    const loader = new Image();
    loader.decoding = "async";
    loader.onload = () => {
      if (!cancelled) setSrc(fullSrc);
    };
    loader.src = fullSrc;
    return () => {
      cancelled = true;
    };
  }, [fullSrc]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      draggable={false}
      // h-[88%] (not max-h) so all items render at the same height
      // regardless of native dimensions.
      className="block h-[88%] w-auto select-none"
    />
  );
}
