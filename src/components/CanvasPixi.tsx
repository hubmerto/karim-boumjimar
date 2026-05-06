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
 * Safari was killing with the hung-page watchdog (too much main-thread
 * compositor work for 100+ animated layers).
 *
 * v1 scope: render every work at its natural canvas position, support
 * pan + pinch zoom, that's it. No bento, no fade-in, no tap select yet
 * -- those layer on once we confirm rendering itself doesn't crash.
 */
type Transform = { tx: number; ty: number; scale: number };

export function CanvasPixi() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map());
  const [transform, setTransform] = useState<Transform>(() => ({
    tx: 0,
    ty: 0,
    scale: 0.05,
  }));

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

  // Initial framing: fit all works into the viewport once we know size.
  useEffect(() => {
    if (!size) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const w of WORKS) {
      const wb = workBounds(w);
      if (wb.minX < minX) minX = wb.minX;
      if (wb.minY < minY) minY = wb.minY;
      if (wb.maxX > maxX) maxX = wb.maxX;
      if (wb.maxY > maxY) maxY = wb.maxY;
    }
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const scale = Math.min(size.w / bboxW, size.h / bboxH) * 0.9;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setTransform({
      tx: size.w / 2 - cx * scale,
      ty: size.h / 2 - cy * scale,
      scale,
    });
  }, [size]);

  // Progressive texture load -- one image per microtask so we don't block
  // the main thread with 100 simultaneous decodes.
  useEffect(() => {
    let cancelled = false;
    const map = new Map<string, Texture>();
    async function loadAll() {
      for (const w of WORKS) {
        if (cancelled) return;
        const src = asset(w.images[0]?.src ?? "");
        if (!src) continue;
        try {
          const tex = await Assets.load(src);
          if (cancelled) return;
          map.set(w.id, tex);
          // Update visible state every ~5 textures so the canvas paints
          // progressively rather than waiting for everything.
          if (map.size % 5 === 0 || map.size === WORKS.length) {
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
  }, []);

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
          scale: transform.scale,
          cx: (t1.clientX + t2.clientX) / 2,
          cy: (t1.clientY + t2.clientY) / 2,
        };
        dragRef.current = null;
      } else if (e.touches.length === 1) {
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
        const newScale = Math.max(
          0.01,
          Math.min(10, pinchRef.current.scale * (d / pinchRef.current.distance)),
        );
        // Anchor the zoom around the pinch centre so the canvas point
        // under the user's fingers stays put.
        setTransform((t) => {
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
        const dx = e.touches[0].clientX - dragRef.current.x;
        const dy = e.touches[0].clientY - dragRef.current.y;
        dragRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        setTransform((t) => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }));
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
        setTransform((t) => {
          const newScale = Math.max(0.01, Math.min(10, t.scale * factor));
          const eff = newScale / t.scale;
          return {
            scale: newScale,
            tx: e.clientX - (e.clientX - t.tx) * eff,
            ty: e.clientY - (e.clientY - t.ty) * eff,
          };
        });
      } else {
        setTransform((t) => ({
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
      setTransform((t) => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }));
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
  }, [transform.scale]);

  const sprites = useMemo(() => {
    return WORKS.map((w) => {
      const tex = textures.get(w.id);
      if (!tex) return null;
      const wb = workBounds(w);
      return { id: w.id, tex, x: wb.minX, y: wb.minY, w: wb.width, h: wb.height };
    }).filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [textures]);

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
          resolution={typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1}
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
        pixi · {sprites.length}/{WORKS.length} loaded
      </div>
    </div>
  );
}
