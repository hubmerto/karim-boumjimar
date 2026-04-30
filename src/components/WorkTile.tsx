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
  const splashGone = useSelection((s) => s.splashGone);
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
  // tile-fade-in: drifty entrance with widely varied delay (0-5s) and
  // duration (1-2s) so the tiles appear in different random spots and
  // at different speeds, with the last one settling around 7s after
  // the splash clears. Only applied once the splash has cleared,
  // otherwise the animation runs invisibly behind it.
  const innerAnimation = useMemo(() => {
    if (!splashGone) return undefined;
    const { r1, r2 } = tileSeed(work.id);
    const fadeDelay = Math.round(r1 * 5000);
    const fadeDuration = Math.round(1000 + r2 * 1000);
    return `tile-fade-in ${fadeDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${fadeDelay}ms both`;
  }, [splashGone, work.id]);

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
        // Duration matches the camera nav animation (2800ms) so tiles
        // and camera settle together. No willChange: 41 always-promoted
        // layers was contributing to iOS Safari OOM kills on mount.
        transition: "transform 2800ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Inner wrapper carries the fade-in animation so it doesn't
          conflict with the parent button's bento-spread transform.
          Inline opacity:0 keeps the tile hidden until the splash is gone
          and the animation gets applied (which fades it back in). The
          img itself only mounts after the splash so the browser doesn't
          fetch + decode all 41 sources during the initial paint -- iOS
          Safari was OOM-killing the tab on first load otherwise. */}
      <span
        className="block h-full w-full"
        style={{
          opacity: 0,
          animation: innerAnimation,
        }}
      >
        {splashGone ? (
          // Plain <img> - next/image fights with arbitrary 2D transforms on the parent.
          // eslint-disable-next-line @next/next/no-img-element
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
        ) : null}
      </span>
    </button>
  );
}

export const WorkTile = memo(WorkTileImpl);
