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

/**
 * Clamp a transform so the visible viewport stays within the works' bbox
 * (no drifting into white space) and so scale never goes below the
 * "fit all" threshold (you can't zoom out past every work being visible).
 *
 * Pan rules:
 *  - If the scaled bbox is wider/taller than the viewport, the user can pan
 *    but the bbox edges may not pass the matching viewport edge.
 *  - If the scaled bbox is smaller than the viewport (only happens when
 *    scale is exactly the fit value), the bbox stays centred.
 */
export function clampTransform(
  t: Transform,
  viewport: { x: number; y: number; w: number; h: number },
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  fitPadding = 0.9,
): Transform {
  const bboxW = Math.max(1, bbox.maxX - bbox.minX);
  const bboxH = Math.max(1, bbox.maxY - bbox.minY);

  const fitScale = Math.min(viewport.w / bboxW, viewport.h / bboxH) * fitPadding;
  const minScale = Math.max(SCALE_MIN, fitScale);
  const scale = Math.min(SCALE_MAX, Math.max(minScale, t.scale));

  const scaledW = bboxW * scale;
  const scaledH = bboxH * scale;
  const bboxCx = (bbox.minX + bbox.maxX) / 2;
  const bboxCy = (bbox.minY + bbox.maxY) / 2;

  let tx: number;
  if (scaledW > viewport.w + 0.5) {
    const minTx = viewport.w - bbox.maxX * scale;
    const maxTx = -bbox.minX * scale;
    tx = Math.min(maxTx, Math.max(minTx, t.tx));
  } else {
    tx = viewport.w / 2 - bboxCx * scale;
  }

  let ty: number;
  if (scaledH > viewport.h + 0.5) {
    const minTy = viewport.h - bbox.maxY * scale;
    const maxTy = -bbox.minY * scale;
    ty = Math.min(maxTy, Math.max(minTy, t.ty));
  } else {
    ty = viewport.h / 2 - bboxCy * scale;
  }

  return { tx, ty, scale };
}

/** Fit an arbitrary bbox into the viewport at `padding` (default 0.9). */
export function fitBboxTransform(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  viewport: { x: number; y: number; w: number; h: number },
  padding = 0.9,
): Transform {
  const w = Math.max(1, bbox.maxX - bbox.minX);
  const h = Math.max(1, bbox.maxY - bbox.minY);
  const scale = clampScale(Math.min(viewport.w / w, viewport.h / h) * padding);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  return {
    tx: viewport.w / 2 - cx * scale,
    ty: viewport.h / 2 - cy * scale,
    scale,
  };
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
