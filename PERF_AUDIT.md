# Performance audit — karim-boumjimar

Diagnostic pass over the canvas, store, tile rendering, GPU layers, data
size, code splitting, and production build output. **No code changes
yet** — this report is the basis for fix selection.

A note on scale: the spec mentions "41 tiles", but the catalog has
grown to **133 tiles across 14 projects** (122 desktop + 11 Club Are
just added). Mobile renders a curated subset (~42 tiles) via the
WebGL Pixi path. Every finding below was checked against the real
count.

---

## 1. Canvas hook + Zustand store

Files: `src/lib/useCanvas.ts` (1045 lines), `src/lib/store.ts` (254
lines), `src/components/Canvas.tsx` (532 lines).

### 1.1 Where pan/zoom state lives

- `transform` is **React `useState`** inside `useCanvas` (line 111).
- A `transformRef.current` mirror is written on every render (line 116)
  so non-rendering code paths (gallery FLIP, inertia rAF, the dispersion
  threshold check) can read the latest value cheaply.
- `dispersion` is also React state (line 126). Flips 0↔1 with hysteresis
  based on `transform.scale`.
- Velocity / animation refs (`velocityRef`, `inertiaRafRef`,
  `dragSamplesRef`, etc.) all live in `useRef`. Good.

### 1.2 Re-render fan-out per pan/zoom event

Every wheel / drag / inertia frame calls `setTransform(...)`. That
triggers a Canvas re-render. Canvas's render then:

1. Rebuilds the wrapper div's `style` object inline (new object each
   render — line 489).
2. Maps over `groups` to produce 14 `<GroupOutline>` JSX elements,
   passing `canvasScale={transform.scale}` (line 520).
3. Maps over `displayWorks` to produce **133 `<WorkTile>` JSX elements**
   (line 524).
4. Wraps the whole subtree in a fresh `DispersionContext.Provider`
   whose `value` is rebuilt via `useMemo` keyed only on dispersion,
   tileOffsets, baseOffsets, containerRef (line 436) — so the context
   value reference DOES stay stable across pan/zoom. Good.

`<WorkTile>` and `<GroupOutline>` are both `React.memo()`-wrapped, so
the children do **not** actually re-render on pan/zoom (their props are
stable). But Canvas itself does — meaning ~147 JSX element objects are
allocated every frame, then thrown away after React's reconciler
bails out via memo.

**[HIGH impact] [MEDIUM effort]** — Bypass React for the 60Hz hot
path. Stash the wrapper element in a ref, and have `useCanvas` mutate
`wrapper.style.transform` directly. React state should only flip on
dispersion / bbox / selection changes (rare). Expected outcome: ~99%
of pan/zoom frames bypass React entirely; remaining work is pure GPU
compositing. This is the single biggest win for perceived smoothness,
especially on lower-end devices and battery-saver modes.

### 1.3 Selector hygiene

- 98 `useSelection(...)` call sites.
- 71 use narrow selectors (`useSelection((s) => s.selectedId)`-style).
- 1 derived-boolean selector (`GroupOutline` line 37) — fine, Zustand
  bails on identical output.
- No global state subscriptions (no `useSelection()` with no selector,
  no `useSelection(s => s)`).

Selectors are well-shaped. No issue here. **[LOW impact] [N/A effort]**

### 1.4 Per-tile store subscriptions

Each WorkTile subscribes to 5 store slices:

```ts
const selected = useSelection(s => s.selectedId === work.id);
const selectWork = useSelection(s => s.selectWork);
const expandGroup = useSelection(s => s.expandGroup);
const activeGroupKey = useSelection(s => s.selectedGroupKey);
const splashGone = useSelection(s => s.splashGone);
```

`activeGroupKey` causes **all 133 tiles to re-render** every time the
selected group changes — but `activeGroupKey` is only used inside the
`onClick` handler (the second-tap-to-expand check), not in the render
output. Wasted re-renders.

**[LOW impact] [LOW effort]** — Move `activeGroupKey` into a ref read
inside `onClick` (or use `useSelection.getState()` at click time
instead of a subscription). Saves 132 unnecessary re-renders per group
change. Not a hot-path issue but a free cleanup.

---

## 2. Tile rendering

### 2.1 How many tiles are in the DOM?

**All 133.** Desktop's `Canvas.tsx` line 524:

```tsx
{displayWorks.map((w) => <WorkTile key={w.id} work={w} />)}
```

Every tile is in the DOM at every zoom level, regardless of viewport
visibility. No intersection-observer virtualization.

At cluster-view zoom (~2× bento fit), the visible viewport contains
~10-20 tiles. The other 113 are off-screen but still in the layout
tree and (after the staggered mount window) still have their `<img>`
mounted with a 600 px webp src.

Mobile (`CanvasPixi.tsx`) curates to a fixed subset (~42 tiles for 14
projects via `MOBILE_TILES_PER_PROJECT = 3`), so the WebGL path doesn't
have this problem at the same scale.

**[MEDIUM-HIGH impact] [MEDIUM effort]** — Virtualize. Compute the
visible-tile set from `transform.scale`, `tx`, `ty`, and each tile's
canvas-space bbox; conditionally unmount the `<img>` (keep the
positioning `<button>` so dispersion math + outlines still work)
when a tile is fully outside the viewport. Reduces decoded-image
memory pressure substantially, and shrinks the layout tree the
browser has to keep in sync.

### 2.2 Image element

- Plain `<img>` (NOT `next/image`) — intentional per code comment:
  `next/image` fights with arbitrary 2D transforms on the parent.
- `loading="lazy"` ✓
- `decoding="async"` ✓
- `draggable={false}` ✓
- `src` rewritten via `thumbSrc()` to the 600 px webp variant in
  `public/images/works/thumbs/` (created by
  `scripts/build-thumbs.mjs`).
- `<img>` is only mounted **after** `splashGone` + a per-tile stagger
  delay (0–4500 ms). With 133 tiles, that's the OOM-prevention pattern
  the WorkTile comment describes — fine.
- No `sizes` attribute (irrelevant; we don't use srcset / responsive).
- No `fetchpriority` hints.

**[LOW impact] [LOW effort]** — Could set `fetchpriority="low"` on the
img elements during the staggered mount to deprioritize them against
the splash logo and any above-the-fold critical resources. Marginal.

### 2.3 Tile dimensions

Source images are 3091×2048 (Club Are) or 3500×2333 (Beauty, etc.).
600 px thumbs ride at ~600×400 webp ≈ 30-50 KB each. Bento tile
display width: ~420-540 px (the `tile` value in `build-works-v2.mjs`).
At 1× zoom, thumb is bigger than display — slight oversampling, fine
for retina.

Mobile WebGL path uses the same thumbnails. No issue.

---

## 3. GPU layers

### 3.1 Canvas wrapper

```tsx
<div style={{
  transform: `translate3d(${transform.tx}px, ${transform.ty}px, 0) scale(${transform.scale})`,
  willChange: "transform",
}}>
```

- `translate3d` ✓ (force composited layer)
- `willChange: transform` ✓
- No `contain` — could add `contain: layout paint` to scope the
  re-layout work the browser has to do when the wrapper transforms.
- No `backface-visibility: hidden` (rarely needed in modern Chromium /
  Safari).

### 3.2 Tile transforms

```tsx
transform: `translate(${dx}px, ${dy}px)`,
transition: "transform 2800ms cubic-bezier(0.22, 1, 0.36, 1)",
```

- Plain `translate()` (no 3d) — **deliberate** per comment line 106:
  "No willChange: 41 always-promoted layers was contributing to iOS
  Safari OOM kills on mount."
- The parent wrapper is `translate3d` + composited, so children get
  rasterized into the parent's GPU layer. Tiles aren't promoted
  individually except during their 2.8s transform transition (the
  dispersion morph), where each tile becomes a temporary compositor
  layer — fine for a one-shot animation.

The intentional no-`will-change` on tiles is correct. iOS Safari's
compositor caps the number of layers it can hold; 133 always-promoted
layers would crash it. Don't change this.

**[LOW impact] [LOW effort]** — Add `contain: layout paint` to the
wrapper. Small browser hint that helps layout invalidation scope
during the camera transform tween.

### 3.3 Zoom re-rasterization

Pan doesn't re-rasterize (GPU translates the existing layer texture).
Zoom does — the browser rasterizes the layer at the new scale, in
chunks. At extreme zoom (e.g. zoom-in to a cluster), the layer is
much larger than the viewport, so the compositor handles only the
visible portion.

This is browser-level and there's no direct lever for it, but
combined with the React-bypass fix in §1.2, zoom should feel
smoother because the compositor isn't competing with React
reconciliation work on the same frames.

---

## 4. Data files

### 4.1 Disk + bundle sizes

| File | Disk | Notes |
|---|---|---|
| `src/data/works.ts` | 64 KB | 133 tile entries, full metadata per tile |
| `src/data/descriptions.ts` | 44 KB | Long-form bodies + credits for ~14 projects |
| `src/data/bio.ts` | 16 KB | News + exhibitions for `/bio` route |
| `src/data/cv.ts` | 12 KB | CV entries for `/bio` route |

**[MEDIUM impact] [LOW effort]** — `works.ts` has extreme metadata
redundancy. Every tile inside a group repeats `title`, `year`,
`medium`, `venue`, `city`, `date`, `photoCredit`. With 11 tiles in
Bodies Under Construction and 11 in Club Are, that's the same 6-7
strings stored 11 times. Restructure to a project-keyed `PROJECTS`
map plus a flat `TILES` array referencing project keys; reduces raw
file size ~30-40 %, minified bundle by similar margin. Trivial
refactor with no behavior change.

### 4.2 Bundling

Both `works.ts` and `descriptions.ts` are statically imported at the
root of the home page (`src/app/page.tsx` → `ViewSwitcher` →
`Canvas`/`CanvasPixi` → `WORKS`; `ExpandedGroup` → `WORKS`). They land
in the first-paint JS bundle.

**[MEDIUM impact] [MEDIUM effort]** — `descriptions.ts` is only read
by `ProjectPanel` and `InspectorSheet` — both only meaningful after
the user has tapped a project. Could be moved to a lazy import:
`const { descriptionFor } = await import("@/data/descriptions");`
inside ProjectPanel, gated on `selectedGroupKey`. Saves ~20 KB
gzipped from the first paint.

---

## 5. Code splitting

### 5.1 Dynamic imports

Grep result: **zero `dynamic()` and zero `ssr: false` in the entire
codebase.** Everything is statically imported.

### 5.2 Heavy static imports on home page

`src/app/page.tsx` imports (all eagerly):

- `TopBar`, `LeftToolbar`, `ViewSwitcher`, `GroupViewControls`,
  `InspectorSheet`, `Index`, `Splash`, `CrashOverlay`,
  `PreloadGalleryImages`.
- `ViewSwitcher` imports both `Canvas` (desktop DOM canvas) AND
  `CanvasPixi` (mobile WebGL canvas). **Both are bundled into the home
  page chunk.**
- `CanvasPixi` imports `@pixi/react` + `pixi.js` (~175 KB minified per
  the chunk inspection below).

**[HIGH impact] [LOW effort]** — Desktop users currently download
~175 KB of Pixi.js they will never execute (the ViewSwitcher branch is
gated on `mobile` matchMedia, but the import is static). Wrap
CanvasPixi in `dynamic(() => import("./CanvasPixi"), { ssr: false })`.
Mobile users still get Pixi (the dynamic chunk loads when the mobile
branch mounts). Saves ~80-100 KB gzipped from the home page first
paint for the majority of users (desktop).

### 5.3 Showcase routes in production bundle

There are ~20 `/showcase/*` autopilot demo routes (added in earlier
sessions) for screen-recording. They're noindex'd but still part of
the production build — visible in the route table:

```
/showcase, /showcase/bento-entry, /showcase/cluster, ...
```

Each one's page bundle ships independently (Next.js code-splits by
route), so they don't add weight to `/` directly. They DO add to the
overall deploy size and crawler / sitemap exposure (the noindex
should suppress most of the latter). Worth noting; low priority.

---

## 6. Production build output

Total `.next/static/chunks/` weight: **2176 KB uncompressed** across
all `.js` files (includes all route bundles + shared chunks).

### 6.1 Home page (`/`) chunk load

Reading `.next/server/app/page_client-reference-manifest.js`, the home
page loads 13 JS chunks totaling **657 KB uncompressed**. Gzip
estimate (typical 30 % ratio for minified JS): **~213 KB gzipped**.

Largest chunks loaded by `/`:

| Chunk | Size | Contains |
|---|---|---|
| `0vu32gihx4orc.js` | 175 KB | `@pixi/react`, `PIXI`, `WORKS`, `workBounds`, `thumbSrc` |
| `0~-dne7js676h.js` | 71 KB | (Next.js framework — `t.js` modules) |
| `0h28o-xbph09w.js` | 64 KB | `asset`, `pixi` references |
| `0elo85hm75s-8.js` | 61 KB | `pixi` references |
| `16ws~37fk52cp.js` | 55 KB | Layout / boundary components |
| `0ois3nuzegddj.js` | 47 KB | App components |
| `10hs7.frc-duq.js` | 41 KB | (Next.js framework) |
| `0.k~y4s8cuy9h.js` | 40 KB | `WORKS`, `pixi`, `asset` references |

The combined Pixi-touching chunks total ~340 KB uncompressed; gzipped
that's still ~100-120 KB of Pixi shipped to every desktop user who
will not execute it.

**[HIGH impact] [LOW effort]** — Same fix as §5.2: dynamic-import
CanvasPixi. The largest chunk drops dramatically.

### 6.2 Other artefacts

- Source maps: present for production (`productionBrowserSourceMaps:
  true` in `next.config.ts`). They double the file count but are only
  fetched when DevTools is open. No runtime cost. Keep.
- 1166 KB `.js.map` is for the largest chunk — confirms it's the
  Pixi-heavy bundle.

---

## 7. `next.config.ts`

```ts
{
  output: STATIC_EXPORT ? "export" : undefined,
  basePath: NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: STATIC_EXPORT,
  images: { unoptimized: STATIC_EXPORT },
  allowedDevOrigins: ["192.168.178.75"],
  devIndicators: false,
  productionBrowserSourceMaps: true,
}
```

- `images` block uses defaults beyond `unoptimized`. No
  `deviceSizes` / `imageSizes` customization, no `formats: ["avif",
  "webp"]` (default in modern Next is `["avif", "webp"]` already, so
  fine).
- No `experimental.optimizePackageImports` set. With Zustand,
  `@pixi/react`, and Next runtime as deps, opting in could shrink the
  initial bundle if the build properly tree-shakes deep imports.
- No `compress`, `poweredByHeader`, etc. tweaks needed — Vercel
  handles compression at the edge.

**[LOW impact] [LOW effort]** — Try `experimental.optimizePackageImports:
["@pixi/react"]` once we know Next 16 supports it for that path.
Marginal at best.

---

## 8. Misc observations

### 8.1 Tile fade-in stagger

`WorkTile` mounts its `<img>` only after `splashGone` plus a per-tile
delay of 0-4500 ms (`tileSeed` hash). The longest tile waits 4.5 s to
even fetch its 600px webp. Combined with `loading="lazy"`, the browser
might never load some off-screen tiles' thumbnails until the user
scrolls / zooms.

This is an existing-perf good — prevents the iOS Safari OOM that the
comment describes. But it does mean **first-paint of the bento is
visually empty for ~3-6s** while the splash is up. After splash fades,
tiles drip in over the staggered window.

**[LOW impact] [N/A effort]** — Could shorten the stagger now that
the runtime budget is bigger (browsers cap decode parallelism
elsewhere), but the splash + intro reveal animation is timed to the
same 6 s window. Not a target for tuning.

### 8.2 Zustand store size

Store has ~30 state slices and ~15 actions. Many of the slices are
demo-route plumbing (`flickPanToken`, `zoomCameraToken`,
`inspectorSheetDragDelta`, etc.). Per-state-update overhead is
negligible — Zustand uses immutable replacement and Object.is
selectors. No issue.

### 8.3 `useCanvas.ts` size

1045 lines is large. Lots of demo-route token watchers
(`replayIntro`, `flickPan`, `zoomCameraBy`) added in earlier
sessions. Worth a future cleanup pass for maintainability, not
perf.

---

## Top 3 fixes by ROI

### #1 — Dynamic-import CanvasPixi for mobile only
**[HIGH impact] [LOW effort]**

Desktop users download ~175 KB of Pixi.js that the renderer never
executes. Wrap the import:

```ts
const CanvasPixi = dynamic(() => import("./CanvasPixi"), {
  ssr: false,
  loading: () => null,
});
```

Mount only inside ViewSwitcher's `mobile === true` branch.

Expected outcome: home-page JS drops by **~80-100 KB gzipped** (from
~213 KB to ~110-130 KB). Saves an HTTP request worth of Pixi too on
desktop. Smallest code change of the three, biggest single bundle
win.

**Risk:** very low. Pixi is already gated by the mobile check at
runtime; this just defers its module load to match. The ViewSwitcher
already renders `null` until mobile is resolved (the
hydration-mismatch fix from earlier), so the dynamic chunk's loading
flicker has nothing to hide behind. Test the mobile path in a
phone-sized window after the change.

### #2 — Move per-frame pan/zoom DOM mutation out of React state
**[HIGH impact] [MEDIUM effort]**

The biggest perceived smoothness win. Today every wheel / pointermove
event calls `setTransform(...)`, triggering Canvas to re-render and
allocate ~147 JSX elements per frame at 60 Hz. Memo on
WorkTile / GroupOutline saves the descendants from re-rendering, but
Canvas itself spins.

Refactor pattern:

- Keep a ref to the inner wrapper div.
- In `useCanvas`, write `wrapper.style.transform = ...` directly in
  the wheel / pointer / inertia handlers.
- React state only flips on dispersion changes, bbox changes, and
  selection changes — all of which are intentionally rare.
- The `transform` value the React tree reads becomes a passive ref
  (still updated for the few consumers that need it, like the gallery
  FLIP source-rect computation).

Expected outcome: Canvas re-render frequency drops from ~60 Hz to
near-zero during pan/zoom. The hot path becomes pure DOM mutation +
GPU compositing. Noticeably smoother under load (Chrome on a tab with
heavy other work, Safari with battery saver, lower-end machines).

**Risk:** medium. Touches the most-used code path in the project.
The dispersion-tracker effect reads `transform.scale` from React
state today (line 547) — would need to either keep that path alive
(occasional setState) or move the threshold check into the same rAF
loop that mutates the DOM. Test camera flies, intro reveal, gallery
FLIP, and inertia after change.

### #3 — Virtualize tile rendering at extreme zoom
**[MEDIUM-HIGH impact] [MEDIUM effort]**

At cluster-view zoom, ~110 of the 133 tiles are off-screen but still
have mounted `<img>` elements consuming decoded-image memory. Saving
that memory matters more on mobile WebGL (Pixi's GPU texture cap is
the real ceiling), but desktop benefits too — fewer DOM nodes for the
browser's layout engine to track.

Refactor pattern:

- Compute the visible canvas-space rect from `transform.scale`, `tx`,
  `ty`, and `viewportRect()`.
- Test each tile's canvas-space bbox (`workBounds(work) + tileOffset
  + baseOffset`) against the visible rect plus a generous margin
  (~2 viewports of slop, so we don't pop tiles in/out at the boundary).
- Inside WorkTile, gate the `<img>` mount on a `visible` prop. The
  positioning `<button>` stays so dispersion math + outlines keep
  working.
- A `useEffect` on the visibility change can lazily unmount imgs
  after a debounce, to avoid thrashing during pan.

Expected outcome: decoded-image memory drops by ~5-10× at cluster
view. Smoother dispersion morph (fewer layers being
animated). Slightly faster first paint of the bento because images
get mounted on-demand rather than all 133 over the 4.5 s stagger.

**Risk:** medium. The dispersion morph animation crosses the tile
visibility threshold mid-tween — need to make sure tiles unmount
AFTER the morph completes, not during it, or the gallery FLIP's
source-rect capture would miss tiles that flicker out mid-transition.

---

## Stop here

These are the diagnostic findings. Specific fix selection + sequencing
is yours to call — happy to scope any of them precisely before
touching code.
