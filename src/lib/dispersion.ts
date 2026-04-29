import { createContext, useContext } from "react";

/**
 * Dispersion couples each tile's render position to the camera scale.
 *
 *   dispersion = 0  → tiles pulled fully toward the bbox center (compact blob)
 *   dispersion = 1  → tiles at their true canvas positions (dispersed)
 *
 * A tile's render position is:
 *   pos.x = canvasPos.x + (centerX - canvasPos.x) * (1 - dispersion)
 *
 * Computed in Canvas from the current transform.scale and provided through
 * context so WorkTile / GroupOutline can subscribe without being re-wired.
 */
export type DispersionState = {
  dispersion: number; // 0..1
  centerX: number;
  centerY: number;
  /** True while the canvas wrapper is in a CSS-animated nav transition.
   * Tiles match the same transition window so position changes stay in
   * lockstep with the camera animation. */
  isAnimating: boolean;
};

export const DispersionContext = createContext<DispersionState>({
  dispersion: 1,
  centerX: 0,
  centerY: 0,
  isAnimating: false,
});

export function useDispersion() {
  return useContext(DispersionContext);
}

/** Apply the dispersion offset to a canvas-space point. */
export function applyDispersion(
  x: number,
  y: number,
  state: DispersionState,
) {
  const factor = 1 - state.dispersion;
  return {
    x: x + (state.centerX - x) * factor,
    y: y + (state.centerY - y) * factor,
  };
}
