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
  const { dispersion, tileOffsets, baseOffsets } = useDispersion();
  const bounds = workBounds(work);
  const img = work.images[0];
  const groupKey = `${work.title}|${work.year}`;
  // Two end states: intro = bento position, spread = baseOffset (mobile
  // 2-col group stack on phones, zero on desktop = true canvas position).
  const introOffset = tileOffsets.get(work.id) ?? { x: 0, y: 0 };
  const baseOffset = baseOffsets.get(work.id) ?? { x: 0, y: 0 };
  // Round to whole pixels so SSR and CSR string-format these identically
  // and React doesn't fire a hydration mismatch.
  const dx = Math.round(
    introOffset.x * (1 - dispersion) + baseOffset.x * dispersion,
  );
  const dy = Math.round(
    introOffset.y * (1 - dispersion) + baseOffset.y * dispersion,
  );
  // Two animations on the inner image wrapper:
  //   1. tile-fade-in: gradual entrance, varied delay (0-6s) and
  //      duration (1.8-3.5s), so 41 tiles drift in over ~9s.
  //   2. tile-float: continuous gentle hover up/down on a 5-9s period
  //      with a varied negative delay (so tiles aren't synced).
  const innerAnimation = useMemo(() => {
    const { r1, r2 } = tileSeed(work.id);
    const fadeDelay = Math.round(r1 * 6000);
    const fadeDuration = Math.round(1800 + r2 * 1700);
    const floatDuration = Math.round(5000 + r1 * 4000);
    const floatDelay = -Math.round(r2 * floatDuration);
    return [
      `tile-fade-in ${fadeDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${fadeDelay}ms both`,
      `tile-float ${floatDuration}ms ease-in-out ${floatDelay}ms infinite`,
    ].join(", ");
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
        left: Math.round(bounds.minX),
        top: Math.round(bounds.minY),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        transform: `translate(${dx}px, ${dy}px)`,
        // Slow + soft so the spread reads as a settle, not a jump.
        // Duration matches the camera nav animation so tiles and camera
        // settle together.
        transition: "transform 2200ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
    >
      {/* Inner wrapper carries the fade-in + float animations so they
          don't conflict with the parent button's bento-spread transform. */}
      <span
        className="block h-full w-full"
        style={{
          animation: innerAnimation,
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
      </span>
    </button>
  );
}

export const WorkTile = memo(WorkTileImpl);
