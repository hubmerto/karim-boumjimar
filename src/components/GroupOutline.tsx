"use client";

import { memo } from "react";
import { useDispersion } from "@/lib/dispersion";
import { useSelection } from "@/lib/store";

type Props = {
  groupKey: string;
  /** Tile IDs that belong to this group - used to detect "a tile from this group is selected". */
  workIds: string[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: string;
  year: number | string;
  /** Current canvas scale, so we can counter-scale the label to keep it legible. */
  canvasScale: number;
  pad?: number;
};

const DEFAULT_PAD = 56;

function GroupOutlineImpl({
  groupKey,
  workIds,
  minX,
  minY,
  maxX,
  maxY,
  label,
  year,
  canvasScale,
  pad = DEFAULT_PAD,
}: Props) {
  const selectGroup = useSelection((s) => s.selectGroup);
  const isActive = useSelection((s) => {
    if (s.selectedGroupKey === groupKey) return true;
    if (s.selectedId && workIds.includes(s.selectedId)) return true;
    return false;
  });
  const { dispersion, blobOffsets } = useDispersion();

  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  // Counter-scale the label so it stays readable across zoom levels, but clamp
  // to a range so it doesn't dominate at extreme zoom-out / vanish at extreme zoom-in.
  const counter = Math.max(0.6, Math.min(2.4, 1 / canvasScale));
  // Move the whole outline by the group's blobOffset at intro, so it
  // tracks its tiles into the compact grid slot.
  const offset = blobOffsets.get(groupKey) ?? { x: 0, y: 0 };
  const factor = 1 - dispersion;
  const dx = offset.x * factor;
  const dy = offset.y * factor;
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translate(${dx}px, ${dy}px)`,
        transition: "transform 700ms cubic-bezier(0.32, 0.72, 0, 1)",
        willChange: "transform",
      }}
      onClick={(e) => {
        // Only fire if the click landed on the outline itself (not on a child tile).
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          selectGroup(groupKey);
        }
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 border ${
          isActive ? "border-selection" : "border-line"
        }`}
      />
      <div
        className="pointer-events-none absolute left-0 origin-bottom-left whitespace-nowrap"
        style={{
          top: -8,
          transform: `translateY(-100%) scale(${counter})`,
        }}
      >
        <span
          className={`italic font-bold text-[10px] uppercase tracking-[0.1em] ${
            isActive ? "text-ink" : "text-mute"
          }`}
        >
          {label} · {year}
        </span>
      </div>
    </div>
  );
}

export const GroupOutline = memo(GroupOutlineImpl);
