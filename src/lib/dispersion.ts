import { createContext, useContext, type RefObject } from "react";
import type { Transform } from "@/lib/canvas-math";

/**
 * Two-state opening:
 *   intro   = every tile sits in a packed bento grid (group identity
 *             ignored), group outlines + titles hidden
 *   spread  = tiles at their true canvas positions, group outlines visible
 *
 * Each tile has a precomputed offset to translate it from its true
 * canvas-space position into its bento slot. dispersion=0 applies the
 * full offset; dispersion=1 applies none.
 */
export type TileOffset = { x: number; y: number };

export type DispersionState = {
  dispersion: number; // 0 at intro, 1 after
  /** Offset applied at intro (bento). key = work.id */
  tileOffsets: Map<string, TileOffset>;
  /** Offset applied after spread, used for the mobile compact stack
   * layout. Empty on desktop (= true canvas positions). key = work.id */
  baseOffsets: Map<string, TileOffset>;
  /** Mirror of the live canvas transform (tx, ty, scale). Refs let
   * consumers (eg. the gallery FLIP) read settled values without
   * re-rendering on every pan/zoom frame. */
  transformRef: RefObject<Transform> | null;
  /** The canvas container element, for converting between canvas-space
   * and screen-space coordinates. */
  containerRef: RefObject<HTMLDivElement | null> | null;
};

export const DispersionContext = createContext<DispersionState>({
  dispersion: 1,
  tileOffsets: new Map(),
  baseOffsets: new Map(),
  transformRef: null,
  containerRef: null,
});

export function useDispersion() {
  return useContext(DispersionContext);
}
