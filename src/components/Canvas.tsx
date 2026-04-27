"use client";

import { useCallback, useEffect, useMemo } from "react";
import { WORKS } from "@/data/works";
import { useCanvas } from "@/lib/useCanvas";
import { groupTilesByTitle } from "@/lib/canvas-math";
import { useSelection } from "@/lib/store";
import { WorkTile } from "@/components/WorkTile";
import { GroupOutline } from "@/components/GroupOutline";

export function Canvas() {
  const {
    containerRef,
    transform,
    cursor,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dragMovedRef,
  } = useCanvas(WORKS);
  const deselect = useSelection((s) => s.deselect);
  const groups = useMemo(() => groupTilesByTitle(WORKS), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") deselect();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deselect]);

  const onBackgroundClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Real bg clicks only — not at the tail of a pan-drag, not on a tile.
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
      className="fixed inset-0 top-12 overflow-hidden bg-canvas md:left-[200px] md:right-[300px]"
      style={{
        cursor,
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onBackgroundClick}
      role="application"
      aria-label="Works canvas — pan and zoom to navigate"
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transformOrigin: "0 0",
          transform: `translate3d(${transform.tx}px, ${transform.ty}px, 0) scale(${transform.scale})`,
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
    </div>
  );
}
