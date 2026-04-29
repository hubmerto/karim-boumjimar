"use client";

import { memo } from "react";
import type { Work } from "@/types/work";
import { workBounds } from "@/lib/canvas-math";
import { useDispersion } from "@/lib/dispersion";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

type Props = { work: Work };

function WorkTileImpl({ work }: Props) {
  const selected = useSelection((s) => s.selectedId === work.id);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const activeGroupKey = useSelection((s) => s.selectedGroupKey);
  const { dispersion, centerX, centerY, isAnimating } = useDispersion();
  const bounds = workBounds(work);
  const img = work.images[0];
  const groupKey = `${work.title}|${work.year}`;

  // Tiles are laid out at their true canvas coords via left/top, then
  // pulled toward the bbox centre by (1 - dispersion). At dispersion=0
  // every tile sits at the centre; at 1 they're at their true positions.
  const factor = 1 - dispersion;
  const tileCx = bounds.minX + bounds.width / 2;
  const tileCy = bounds.minY + bounds.height / 2;
  const dx = (centerX - tileCx) * factor;
  const dy = (centerY - tileCy) * factor;

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
        transition: isAnimating
          ? "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)"
          : "none",
        willChange: "transform",
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
