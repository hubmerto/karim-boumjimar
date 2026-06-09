"use client";

import { memo, useMemo, useState } from "react";
import type { Work } from "@/types/work";
import { workBounds } from "@/lib/canvas-math";
import { useDispersion } from "@/lib/dispersion";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";
import { thumbSrc } from "@/lib/thumbs";

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

// Module-level flag: has the initial intro reveal window finished
// playing? Flipped to true by `markIntroPlayed()` after INTRO_REVEAL_MS
// + the worst-case per-tile fade window has elapsed since splashGone.
// Captured at WorkTile mount time via useState's lazy init, so tiles
// that mount AFTER the window has expired skip the staggered fade-in
// entirely. (Desktop no longer virtualizes — every tile mounts once at
// page load — so this now only guards a late mount from HMR, React
// strict-mode double-mount, or a future re-mount, not the old
// scrolled-back-into-a-virtualized-viewport case.) Resets to false on
// full page reload because module
// state doesn't survive a navigation. Intentionally NOT in the Zustand
// store: it's a one-way page-lifetime flag, not user-facing UI state,
// and we don't want React subscribers to re-render when it flips.
let introPlayed = false;
export function markIntroPlayed() {
  introPlayed = true;
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
  // Capture the module-level intro flag AT MOUNT TIME. useState's lazy
  // init runs once per mount, so:
  //   - First mount during the initial reveal window → introPlayed=false
  //     → skipIntro=false → animation + img-stagger play.
  //   - Any LATER mount after the window expired (HMR, strict-mode
  //     double-mount, or a future re-mount — desktop no longer
  //     virtualizes, so tiles stay mounted and don't re-mount on pan)
  //     → introPlayed=true → skipIntro=true → tile renders straight
  //     into its final state, no replay.
  // Captured value is stable for the lifetime of this mount — flipping
  // `introPlayed` later doesn't reach back and skip an in-flight animation.
  const [skipIntro] = useState(() => introPlayed);
  // Per-tile timing: drifty entrance with varied delay (0-4500) and
  // fixed duration (1500), worst case = 6000ms — matches the camera
  // intro animation window so the last tile settles the same instant
  // the camera reaches its target zoom (see INTRO_REVEAL_MS in
  // useCanvas / CanvasPixi).
  const { fadeDelay, fadeDuration } = useMemo(() => {
    const { r1 } = tileSeed(work.id);
    return {
      fadeDelay: Math.round(r1 * 4500),
      fadeDuration: 1500,
    };
  }, [work.id]);

  const innerAnimation = useMemo(() => {
    if (skipIntro) return undefined;
    if (!splashGone) return undefined;
    return `tile-fade-in ${fadeDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${fadeDelay}ms both`;
  }, [skipIntro, splashGone, fadeDelay, fadeDuration]);

  // The thumbnail is mounted immediately and eager-loaded (see the
  // <img> below): all ~133 canvas thumbs download up front and stay in
  // the DOM, so panning / zooming around never reveals a tile that has
  // to load in. This component is desktop-only (mobile uses the Pixi
  // renderer), so the old iOS-Safari mass-mount OOM concern that drove
  // the previous staggered drip-feed no longer applies.

  return (
    <button
      type="button"
      data-work-id={work.id}
      aria-label={`${work.title}, ${work.year}`}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        if (activeGroupKey === groupKey) {
          // Second tap: re-select THIS specific tile so selectedId
          // reflects what the user just clicked, then expand. The
          // gallery (ExpandedGroup) reads selectedId to scroll to
          // that image first instead of starting at index 0.
          selectWork(work.id, groupKey);
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
          For the FIRST mount during the intro window, opacity:0 + the
          `tile-fade-in` keyframe animation fades it back in. For later
          mounts (skipIntro=true), we drop straight to opacity:1 with
          no animation — the user is past the reveal, so a late mount
          (HMR / strict-mode) shouldn't replay the page-load entrance.
          The <img> below is eager-loaded and always mounted: this
          component is desktop-only (mobile uses the Pixi renderer), so
          the old iOS-Safari mass-mount OOM that once justified deferring
          the image no longer applies. */}
      <span
        className="block h-full w-full"
        style={{
          opacity: skipIntro ? 1 : 0,
          animation: innerAnimation,
        }}
      >
        {/* Plain <img> - next/image fights with arbitrary 2D transforms on the parent. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // 600px thumbnail on the canvas overview (~5x lighter than the
          // 2400px full-res). Full-size loads when the user opens the
          // gallery (ExpandedGroup).
          src={asset(thumbSrc(img.src))}
          alt={img.alt}
          width={img.width}
          height={img.height}
          // eager (not lazy): every canvas thumbnail loads up front and
          // stays loaded, so moving around the canvas never triggers a
          // fetch / shows a blank tile. Modest up-front cost on desktop.
          loading="eager"
          decoding="async"
          draggable={false}
          className="block h-full w-full object-cover"
        />
      </span>
    </button>
  );
}

export const WorkTile = memo(WorkTileImpl);
