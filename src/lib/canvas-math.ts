import type { Work } from "@/types/work";

export type Transform = { tx: number; ty: number; scale: number };

export const SCALE_MIN = 0.25;
export const SCALE_MAX = 4;

export function clampScale(s: number) {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
}

/** Bounding box around a work in canvas coordinates, with position as the tile centre. */
export function workBounds(work: Work): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  const img = work.images[0];
  const aspect =
    img && img.width && img.height ? img.height / img.width : 1;
  const height = work.width * aspect;
  const minX = work.position.x - work.width / 2;
  const minY = work.position.y - height / 2;
  return {
    minX,
    minY,
    maxX: minX + work.width,
    maxY: minY + height,
    width: work.width,
    height,
  };
}

/** Bounding box of all works in canvas coords. */
export function worksBounds(works: Work[]) {
  if (!works.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const w of works) {
    const b = workBounds(w);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Compute a transform that fits all works into the visible canvas area.
 * `viewport` is the area available for the canvas in screen pixels.
 *
 * Note on coordinate spaces: `tx`/`ty` are the CSS translate values of the
 * inner transform wrapper, expressed in the canvas container's local
 * coordinate system. The container's CSS positioning (e.g. `left: 200px`)
 * already accounts for `viewport.x`/`y`, so they don't appear in tx/ty.
 */
export function fitAllTransform(
  works: Work[],
  viewport: { x: number; y: number; w: number; h: number },
  padding = 0.9,
): Transform {
  const b = worksBounds(works);
  const bboxW = Math.max(1, b.maxX - b.minX);
  const bboxH = Math.max(1, b.maxY - b.minY);
  const scale = clampScale(
    Math.min(viewport.w / bboxW, viewport.h / bboxH) * padding,
  );
  const bboxCx = (b.minX + b.maxX) / 2;
  const bboxCy = (b.minY + b.maxY) / 2;
  return {
    tx: viewport.w / 2 - bboxCx * scale,
    ty: viewport.h / 2 - bboxCy * scale,
    scale,
  };
}

/**
 * Scroll-anchored zoom: preserve the canvas point under the cursor.
 * `screenX`/`screenY` are mouse coordinates in screen space; `viewport`
 * provides the canvas container's screen offset so we can convert into
 * container-local coords (the space tx/ty live in).
 */
export function zoomAt(
  current: Transform,
  factor: number,
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; w: number; h: number },
): Transform {
  const newScale = clampScale(current.scale * factor);
  if (newScale === current.scale) return current;
  const localX = screenX - viewport.x;
  const localY = screenY - viewport.y;
  // Canvas point currently under the cursor:
  const canvasX = (localX - current.tx) / current.scale;
  const canvasY = (localY - current.ty) / current.scale;
  return {
    tx: localX - canvasX * newScale,
    ty: localY - canvasY * newScale,
    scale: newScale,
  };
}

/** Group tiles by title + year, returning each group's bounding box. */
export function groupTilesByTitle(works: Work[]) {
  const groups = new Map<
    string,
    { key: string; label: string; year: number | string; works: Work[] }
  >();
  for (const w of works) {
    const key = `${w.title}|${w.year}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: w.title, year: w.year, works: [] };
      groups.set(key, g);
    }
    g.works.push(w);
  }
  return Array.from(groups.values()).map((g) => {
    const b = worksBounds(g.works);
    return { ...g, ...b };
  });
}

/** Centre the viewport on a canvas point at the given scale. tx/ty in container-local coords. */
export function centerOn(
  viewport: { x: number; y: number; w: number; h: number },
  canvasX: number,
  canvasY: number,
  scale: number,
): Transform {
  return {
    tx: viewport.w / 2 - canvasX * scale,
    ty: viewport.h / 2 - canvasY * scale,
    scale,
  };
}
