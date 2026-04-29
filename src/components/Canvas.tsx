"use client";

import { useCallback, useEffect, useMemo } from "react";
import { WORKS } from "@/data/works";
import { useCanvas } from "@/lib/useCanvas";
import { fitAllTransform, groupTilesByTitle, worksBounds } from "@/lib/canvas-math";
import { DispersionContext } from "@/lib/dispersion";
import { useSelection } from "@/lib/store";
import { WorkTile } from "@/components/WorkTile";
import { GroupOutline } from "@/components/GroupOutline";
import { ExpandedGroup } from "@/components/ExpandedGroup";

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
  } = useCanvas(WORKS);
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

  // Dispersion: tiles compress toward the bbox center at low zoom and
  // fan out to their true positions as the camera scales up. Anchored
  // between an arbitrary "blob" scale (camera-only fit, no dispersion)
  // and the standard fit-all scale (full dispersion).
  const dispersionState = useMemo(() => {
    if (typeof window === "undefined") {
      return { dispersion: 1, centerX: 0, centerY: 0, isAnimating: false };
    }
    const b = worksBounds(WORKS);
    const centerX = (b.minX + b.maxX) / 2;
    const centerY = (b.minY + b.maxY) / 2;
    return { dispersion: 0, centerX, centerY, isAnimating };
    // We compute dispersion below using the live transform; the memo
    // only fixes the centre.
  }, [isAnimating]);
  const fitAndBlobScales = useMemo(() => {
    if (typeof window === "undefined") return { fit: 1, blob: 0.5 };
    const v = {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    };
    const fit = fitAllTransform(WORKS, v).scale;
    const blob = fitAllTransform(WORKS, v, 0.35).scale;
    return { fit, blob };
  }, []);
  const dispersion = useMemo(() => {
    const { fit, blob } = fitAndBlobScales;
    if (fit <= blob) return 1;
    const t = (transform.scale - blob) / (fit - blob);
    // Minimum 0.18 so groups are compact but still distinct, never
    // overlapping into a single point. Top of 1 = true positions.
    return Math.max(0.18, Math.min(1, t));
  }, [transform.scale, fitAndBlobScales]);
  const dispCtx = useMemo(
    () => ({ ...dispersionState, dispersion }),
    [dispersionState, dispersion],
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
            // Smooth nav-driven moves; instant during pan/zoom so dragging feels direct.
            transition: isAnimating
              ? "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)"
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
