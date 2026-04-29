import { createContext, useContext } from "react";

/**
 * Two-state opening: at intro, every group sits in a tight grid layout
 * near the canvas center (compact, no overlap). After the user's first
 * wheel/click, groups animate to their true canvas positions and the
 * exploration begins.
 *
 * Each group has a precomputed blobOffset = (blobCenter - origCenter).
 * A tile's render position is:
 *   pos.x = canvasPos.x + blobOffset.x * (1 - dispersion)
 * dispersion is 0 at intro and 1 after.
 */
export type GroupBlobOffset = { x: number; y: number };

export type DispersionState = {
  dispersion: number; // 0 at intro, 1 after
  /** key = `${title}|${year}` (matches WorkTile's groupKey). */
  blobOffsets: Map<string, GroupBlobOffset>;
};

export const DispersionContext = createContext<DispersionState>({
  dispersion: 1,
  blobOffsets: new Map(),
});

export function useDispersion() {
  return useContext(DispersionContext);
}
