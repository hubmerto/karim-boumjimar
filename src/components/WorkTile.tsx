"use client";

import { memo } from "react";
import type { Work } from "@/types/work";
import { workBounds } from "@/lib/canvas-math";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

type Props = { work: Work };

function WorkTileImpl({ work }: Props) {
  const selected = useSelection((s) => s.selectedId === work.id);
  const selectWork = useSelection((s) => s.selectWork);
  const bounds = workBounds(work);
  const img = work.images[0];
  const groupKey = `${work.title}|${work.year}`;

  return (
    <button
      type="button"
      data-work-id={work.id}
      aria-label={`${work.title}, ${work.year}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
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
