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
  const { dispersion, blobOffsets } = useDispersion();
  const bounds = workBounds(work);
  const img = work.images[0];
  const groupKey = `${work.title}|${work.year}`;

  // At intro (dispersion=0) every tile in a group shifts by its group's
  // blobOffset, putting the whole group in its compact-grid slot near
  // the canvas centre. The internal layout of each group is preserved.
  // At dispersion=1 there's no offset and tiles sit at their true coords.
  const offset = blobOffsets.get(groupKey) ?? { x: 0, y: 0 };
  const factor = 1 - dispersion;
  const dx = offset.x * factor;
  const dy = offset.y * factor;

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
        // Dispersion only flips once per session (intro → exploration),
        // so a permanent transition is fine and fires only on that flip.
        transition: "transform 700ms cubic-bezier(0.32, 0.72, 0, 1)",
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
