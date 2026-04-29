import { createContext, useContext } from "react";

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
  /** key = work.id */
  tileOffsets: Map<string, TileOffset>;
};

export const DispersionContext = createContext<DispersionState>({
  dispersion: 1,
  tileOffsets: new Map(),
});

export function useDispersion() {
  return useContext(DispersionContext);
}
