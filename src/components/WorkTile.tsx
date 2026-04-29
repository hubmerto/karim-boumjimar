"use client";

import { memo, useMemo } from "react";
import type { Work } from "@/types/work";
import { workBounds } from "@/lib/canvas-math";
import { useDispersion } from "@/lib/dispersion";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

type Props = { work: Work };

/** Stable hash → two pseudo-random 0..1 values per tile id. */
function tileSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const frac = (n: number) => {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  };
  return { r1: frac(h), r2: frac(h * 1.71 + 1) };
}

function WorkTileImpl({ work }: Props) {
  const selected = useSelection((s) => s.selectedId === work.id);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const activeGroupKey = useSelection((s) => s.selectedGroupKey);
  const { dispersion, tileOffsets } = useDispersion();
  const bounds = workBounds(work);
  const img = work.images[0];
  const groupKey = `${work.title}|${work.year}`;
  // At intro each tile shifts to its bento slot. At dispersion=1, no
  // offset and tiles sit at their true canvas positions.
  const offset = tileOffsets.get(work.id) ?? { x: 0, y: 0 };
  const factor = 1 - dispersion;
  const dx = offset.x * factor;
  const dy = offset.y * factor;
  // Random per-tile fade-in (0-5500ms delay, 800-1800ms duration) so all
  // 41 tiles arrive within ~7s in a varied, non-sequential order.
  const fadeIn = useMemo(() => {
    const { r1, r2 } = tileSeed(work.id);
    const delay = Math.round(r1 * 5500);
    const duration = Math.round(800 + r2 * 1000);
    return `tile-fade-in ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
  }, [work.id]);

  return (
    <button
      type="button"
      data-work-id={work.id}
      aria-label={`${work.title}, ${work.year}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        if (activeGroupKey === groupKey) {
          expandGroup(groupKey);
          return;
        }
        selectWork(work.id, groupKey);
      }}
      className={`absolute block cursor-pointer select-none ${
        selected ? "outline outline-1 outline-offset-0 outline-selection" : ""
      }`}
      style={{
        left: bounds.minX,
        top: bounds.minY,
        width: bounds.width,
        height: bounds.height,
        transform: `translate(${dx}px, ${dy}px)`,
        // Slow + soft so the spread reads as a settle, not a jump.
        // Matches the camera animation duration in consumeIntro.
        transition: "transform 2200ms cubic-bezier(0.22, 1, 0.36, 1)",
        animation: fadeIn,
        willChange: "transform, opacity",
      }}
    >
      {/* Plain <img> - next/image fights with arbitrary 2D transforms on the parent. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset(img.src)}
        alt={img.alt}
        width={img.width}
        height={img.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block h-full w-full object-cover"
      />
    </button>
  );
}

export const WorkTile = memo(WorkTileImpl);
