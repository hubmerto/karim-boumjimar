/**
 * Cross-component handoff for FLIP-into-gallery source rects.
 *
 * Desktop's ExpandedGroup looks up DOM tile elements via
 * `data-work-id` to compute the source rect for each image's FLIP
 * open animation. On mobile the canvas tiles are PIXI sprites, not
 * DOM, so the lookup returns nothing and the strip just fades in.
 *
 * CanvasPixi calls `setFlipRects` with screen rects of its sprites
 * the moment before `expandGroup` fires; ExpandedGroup reads them in
 * its own `captureSourceRects` and uses them as the FLIP source.
 *
 * Cleared automatically by ExpandedGroup once consumed so a stale
 * snapshot can't be reused on a different group's open.
 */
let rects: Map<string, DOMRect> = new Map();

export function setFlipRects(map: Map<string, DOMRect>): void {
  rects = map;
}

export function getFlipRect(workId: string): DOMRect | undefined {
  return rects.get(workId);
}

export function clearFlipRects(): void {
  rects = new Map();
}
