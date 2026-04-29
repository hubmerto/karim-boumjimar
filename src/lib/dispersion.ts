import { createContext, useContext } from "react";

/**
 * Two-state opening: at intro every group's position is compressed toward
 * the canvas bbox centre by a fixed factor, so all groups read as a tight
 * blob. After the first interaction, dispersion = 1 and tiles return to
 * their true canvas positions.
 *
 * Each group has a precomputed offset = (compressedCenter - origCenter).
 * Tiles within a group all share that offset, so each group keeps its
 * internal arrangement; only the group as a whole moves.
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
