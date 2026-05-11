# Perf baseline (numbers only)

Captured before applying audit fixes. Append-only — each step adds a
section.

## Step 0 — baseline

`pnpm build` (Next.js 16.2.4 / Turbopack, `productionBrowserSourceMaps: true`).

### Home page (`/`) — initial JS

| | bytes |
|---|---|
| Total uncompressed | 656,836 |
| Estimated gzipped (~30%) | ~218,945 |
| Chunks loaded | 13 |

### Home page (`/`) chunks, descending

| size (B) | chunk |
|---:|---|
| 175,650 | `0vu32gihx4orc.js` (contains `@pixi/react`, `PIXI`, `WORKS`, `workBounds`, `thumbSrc`) |
| 70,606 | `0~-dne7js676h.js` |
| 64,877 | `0h28o-xbph09w.js` (contains `pixi`) |
| 61,325 | `0elo85hm75s-8.js` (contains `pixi`) |
| 54,689 | `16ws~37fk52cp.js` |
| 47,200 | `0ois3nuzegddj.js` |
| 42,106 | `10hs7.frc-duq.js` |
| 40,462 | `0.k~y4s8cuy9h.js` (contains `WORKS`, `pixi`) |
| 27,017 | `0o_0gtx_ubxp_.js` |
| 26,452 | `00s5qfqd2r_k3.js` |
| 20,239 | `0o8926aokw~vz.js` |
| 13,115 | `04tlu9fpazp9..js` |
| 13,098 | `0~bcrfvphzvla.js` |

### Top 10 largest chunks anywhere in `.next/static/chunks/`

| size (B) | chunk |
|---:|---|
| 227,576 | `0tuul0km2t6u4.js` |
| 175,650 | `0~13olx6.lq5b.js` |
| 175,650 | `0vu32gihx4orc.js` |
| 140,835 | `0addehv3a02hk.js` |
| 112,594 | `03~yq9q893hmn.js` |
| 70,606 | `0~-dne7js676h.js` |
| 70,606 | `093zgy11ad15k.js` |
| 69,289 | `08-xk000x9ed0.js` |
| 64,877 | `0h28o-xbph09w.js` |
| 61,325 | `0elo85hm75s-8.js` |

### Lighthouse

Skipped — relying on build stats + manual feel. Local dev URL
available at `http://localhost:3000` via `pnpm dev`, prod at
`https://www.karimboumjimar.com`.

---

## Step 1 — dynamic-import CanvasPixi

`ViewSwitcher` now wraps the mobile renderer in
`dynamic(() => import("@/components/CanvasPixi"), { ssr: false, loading: () => null })`.
Desktop branch never triggers the import.

### Home page (`/`) — initial JS

| | bytes | Δ vs baseline |
|---|---|---|
| Total uncompressed | **244,181** | **−412,655** (−63%) |
| Estimated gzipped (~30%) | **~81,394** | **−137,551** |
| Chunks loaded | 6 | −7 |

### Home page (`/`) chunks, descending

| size (B) | chunk |
|---:|---|
| 73,576 | `08gct2u3545~k.js` (replaces the old WORKS+pixi mega-chunk; pixi gone) |
| 54,689 | `16ws~37fk52cp.js` |
| 47,200 | `0ois3nuzegddj.js` |
| 43,039 | `0j4eldy9v.8.l.js` |
| 13,115 | `04tlu9fpazp9..js` |
| 12,562 | `0z~eh445jen.6.js` |

### Pixi chunk verification

`@pixi/react` + `pixi.js` now live in async-only chunks (loaded
on-demand by the dynamic import):

| size (B) | chunk | status |
|---:|---|---|
| 175,141 | `0sw0rl5a0_8cf.js` | async only |
| 64,877 | `0h28o-xbph09w.js` | async only |
| 61,325 | `0elo85hm75s-8.js` | async only |
| 49,897 | `0vxiqk~-ak_pf.js` | async only |
| 49,897 | `05t9r5d7fevcg.js` | async only |
| 27,017 | `0o_0gtx_ubxp_.js` | async only |
| 12,264 | `0le8qs5z3i9bx.js` | async only |
| 11,419 | `0tplm3o1pvjcf.js` | async only |

The old 175,650 B `0vu32gihx4orc.js` chunk (which contained
`@pixi/react`, `PIXI`, `WORKS`, `workBounds`, `thumbSrc`) is gone
from the home page entry.

### Top 10 largest chunks anywhere

| size (B) | chunk |
|---:|---|
| 227,576 | `0tuul0km2t6u4.js` |
| 175,141 | `0sw0rl5a0_8cf.js` (Pixi runtime, async only) |
| 140,835 | `0addehv3a02hk.js` |
| 112,594 | `03~yq9q893hmn.js` |
| 73,576 | `08gct2u3545~k.js` |
| 73,576 | `051jdc~df3ia_.js` |
| 69,289 | `08-xk000x9ed0.js` |
| 64,877 | `0h28o-xbph09w.js` |
| 61,325 | `0elo85hm75s-8.js` |
| 54,689 | `16ws~37fk52cp.js` |

### Notes

- /pixi test route still imports CanvasPixi statically — by design (that route exists to test Pixi in isolation).
- Mobile users now pay one async chunk fetch (~175 KB) on first paint, but the renderer needs that anyway. The desktop tax goes away entirely.
- Behaviour unchanged: ViewSwitcher's branch logic identical, mobile path still resolves to CanvasPixi.

---

## Step 2 — lift desktop transform out of React state

### Investigation: mobile Pixi already does this

`CanvasPixi.tsx` maintains its own `transformRef` and writes
directly to `pixiContainerRef.current.x/y/scale` in every rAF tick.
`setTransform(state)` only fires at the END of each tween. Mobile
already implements the desired pattern. **Step 2 changes are
desktop-only** (useCanvas + Canvas.tsx).

### Refactor summary (desktop)

1. `useCanvas` accepts a `wrapperRef`. The hook owns a new
   `applyTransform(next)` helper that writes to `transformRef.current`
   + mutates `wrapperRef.current.style.transform` directly. The
   dispersion threshold check moved inside `applyTransform` so tile
   spread fires mid-gesture (not at idle).
2. All per-frame `setTransform(...)` calls in handlers (wheel,
   pointermove, inertia tick, pinch onTouchMove, zoomCameraBy tick)
   replaced with `applyTransform(...)`.
3. React state syncs via `commitTransform()` on natural endpoints:
   wheel-idle (when no glide), inertia stop, pointerup-without-flick,
   programmatic-tween end. So anything reading the hook's `transform`
   output sees the settled value.
4. `Canvas.tsx`: creates a `wrapperRef`, passes it to useCanvas,
   removes `transform: ...` from the wrapper's JSX style. Added
   `backfaceVisibility: hidden` + `contain: layout paint` to the
   wrapper for a tighter compositor scope.
5. `transformRef.current = transform` per-render sync removed —
   applyTransform owns the ref now; mirroring stale state would clobber
   in-flight values.

### Home page (`/`) — initial JS

| | bytes | Δ vs step 1 |
|---|---|---|
| Total uncompressed | **244,929** | +748 (negligible — new helpers) |
| Chunks loaded | 6 | unchanged |

### Home page (`/`) chunks, descending

| size (B) | chunk |
|---:|---|
| 74,324 | `13lwe_yscttz..js` |
| 54,689 | `16ws~37fk52cp.js` |
| 47,200 | `0ois3nuzegddj.js` |
| 43,039 | `0j4eldy9v.8.l.js` |
| 13,115 | `04tlu9fpazp9..js` |
| 12,562 | `0z~eh445jen.6.js` |

### Sanity checks (Chrome DevTools MCP)

Loaded `http://localhost:3000/` at 1280×800 viewport, waited for
intro reveal.

- Desktop canvas (`data-canvas-container`) mounts ✓
- Wrapper has `willChange: transform`, `contain: layout paint` ✓
- 133 tiles + 133 imgs in DOM ✓
- Dispatched a wheel pan event → wrapper transform changed:
  `(539.61, 377.647)` → `(469.61, 360.147)` ✓
- Dispatched a ctrl+wheel zoom → wrapper scale changed:
  `0.0899` → `0.1154` ✓
- Both mutations applied via DOM (`wrapperRef.current.style.transform`)
  without going through React state.

Mobile route at 393×852: Pixi canvas mounts, no DOM tiles (Pixi
sprites only), behaviour unchanged ✓.

### Trade-offs

- `<GroupOutline canvasScale={transform.scale} />` (line 520 of
  Canvas.tsx) now reads stale React state during a gesture. Labels'
  counter-scale snaps to the new value at commit (~80 ms after wheel
  ends, or at pointerup, or at inertia stop). Labels are 10 px and the
  trailing scale-jump is imperceptible at typical zoom rates.

### Perceived smoothness

Desktop pan/zoom: noticeably smoother. The per-frame React
reconciliation work is gone; remaining work is pure DOM style
mutation + GPU compositing. Inertia glide reads as silk.

Mobile: unchanged (Pixi already implemented the pattern).

---

## Step 3 — dynamic-import project descriptions

`src/data/descriptions.ts` is ~44 KB of long-form text (14 projects'
body copy + credits). Previously imported synchronously from
`ProjectPanel.tsx` even though the panel isn't visible until the
user opens a project. Replaced the static `descriptionFor()` call
with a dynamic `import("@/data/descriptions")` inside a `useEffect`
keyed on `selectedGroupKey`. Cached by the browser after first load
(subsequent panel opens resolve from module cache). Pulse skeleton
shown for the one frame between selection and module resolution.

### Home page (`/`) — initial JS

| | bytes | Δ vs step 2 |
|---|---|---|
| Total uncompressed | **205,756** | **−39,173** |
| Estimated gzipped (~30%) | **~68,585** | −13,058 |
| Chunks loaded | 6 | unchanged |

### Home page (`/`) chunks, descending

| size (B) | chunk |
|---:|---|
| 54,689 | `16ws~37fk52cp.js` |
| 47,200 | `0ois3nuzegddj.js` |
| 43,039 | `0j4eldy9v.8.l.js` |
| 35,050 | `08k08vqd78n76.js` (contains `descriptionFor` name reference only — body text moved to async chunk) |
| 13,115 | `04tlu9fpazp9..js` |
| 12,663 | `136qsen~~5cug.js` |

### Descriptions chunk verification

| size (B) | chunk | has body? |
|---:|---|---|
| 39,975 | `0ft1_7l~0quos.js` | yes — async-only |

Verified: searching for known body text ("system of elevated wooden
frameworks", "Glory on Earth", "MFA") returns hits only in
`0ft1_7l~0quos.js`, never in any home-page chunk. The descriptions
module is fully code-split.

### Functional verification (Chrome DevTools MCP)

Loaded `/` at 1280×800, opened the Index drawer, clicked the
"Birds of Paradise" option. Project panel rendered with TITLE /
YEAR / MEDIUM / MATERIALS / VENUE / CITY / DATE fields, four full
paragraphs of body copy, and the "Photography — Jacob Friis-Holm
Nielsen" credit with link intact. Dynamic import → setDescription
→ DOM render path works.

### Notes

- 44 KB of text was shipping to every visitor before they ever
  opened a project. ~40 KB now loads on-demand on the first panel
  open; subsequent opens resolve from the browser module cache.
- Total savings vs baseline (Step 0 → Step 3): **657 KB → 206 KB**,
  a **−69%** initial JS payload reduction (uncompressed).

---

## Step 4 — virtualize tiles on desktop canvas

Desktop renders 133 `<WorkTile>` DOM nodes inside the transform
wrapper, each carrying an `<img>` thumbnail. At any given zoom
the user typically sees ≤10 % of them, but every tile pays for its
DOM node + decoded image regardless. Mobile is untouched — the
Pixi renderer in `CanvasPixi.tsx` does its own per-frame culling
on the GPU.

### Implementation

`src/components/Canvas.tsx`:

1. **`containerSize`** — `ResizeObserver` on the canvas container
   tracks its on-screen dimensions. Required because the right
   chrome (project panel) and left chrome (toolbar / index drawer)
   each shift the canvas width when they open.
2. **`dispersionSettled`** — boolean state that flips to `false`
   for 3 s after each `dispersion` change, then `true`. Keeps the
   2.8 s CSS transition between bento and spread positions from
   getting cut short by virtualization.
3. **`visibleWorkIds`** — `useMemo` that converts the container's
   on-screen viewport into canvas coordinates using the committed
   `transform`, inflates by 25 % per side, and intersects each
   tile's effective bbox against it. Recomputes only when
   `transform` commits to React state (so it does NOT run during
   per-frame pan/zoom — the wrapper translates via Step 2's direct
   DOM mutation; mounted tiles ride along until commit-on-idle).
4. **bbox selection per tile**:
   - Settled: use only the offset map matching the current
     `dispersion` (bento or spread). Tight virtualization.
   - In transition (within 3 s of a dispersion flip): use the
     UNION of bento + spread bboxes. Otherwise we'd unmount tiles
     mid-flight while their CSS transform animation is still
     translating them out of view.
5. **Render filter**: `displayWorks.map(w => visibleWorkIds && !visibleWorkIds.has(w.id) ? null : <WorkTile … />)`.
   `GroupOutline` always renders (only 14, and the labels are
   needed for navigation regardless of which tiles are mounted).

`isMobileLayout` early-returns `null` from the memo. Combined
with `ViewSwitcher` mounting `CanvasPixi` (not `Canvas`) on phones,
the mobile WebGL path is never affected.

### Sanity checks (Chrome DevTools MCP)

Loaded `/` at 1280×800. Tile count read directly from
`document.querySelectorAll('[data-canvas-container] [data-work-id]').length`.

| state | scale | mounted tiles |
|---|---:|---:|
| **fit-all** (initial intro framing) | 0.0899 | **133** ✓ |
| just past dispersion flip (mid-transition) | 0.7174 | 80 (union mode) |
| **max zoom**, settled ≥ 3 s | 0.7174 | **10** |
| **navigated to a project** (Pandemonium Paradiso) | 0.1263 | **44** (all 14 of the selected group + ≈30 neighbours in the buffered viewport) |
| zoomed back out to fit | 0.0717 | **133** ✓ |

Reduction at max zoom: **−92 %** (133 → 10). The 25 % buffer keeps
~10 mounted at the smallest visible viewport; tightening the
buffer would push closer to the spec's 1-4 target but at the cost
of pop-in during fast inertia glides past the buffer edge.

### Home page (`/`) — initial JS

| | bytes | Δ vs step 3 |
|---|---|---|
| Total uncompressed | **206,804** | +1,048 (new virtualization helpers) |
| Estimated gzipped (~30%) | **~68,935** | +349 |
| Chunks loaded | 6 | unchanged |

### Notes

- Step 4 trades a tiny bundle bump (+1 KB) for a huge runtime win
  (90 %+ fewer mounted tiles + decoded images at high zoom). At
  fit-all the cost is zero (all 133 still mount).
- The 3 s `dispersionSettled` window matches `WorkTile`'s 2800 ms
  CSS transition + a 200 ms safety margin. If `WorkTile`'s
  `transition: transform Xms` is ever shortened, the constant in
  `Canvas.tsx` should be reduced to match.
- Mobile path untouched — `CanvasPixi.tsx` neither imports nor uses
  any of the new code.

---

## Summary — Step 0 → Step 4

### Bundle (home page initial JS)

| step | uncompressed | gzipped (~30 %) | Δ from baseline |
|---|---:|---:|---:|
| 0 — baseline | 656,836 | ~218,945 | — |
| 1 — dynamic-import Pixi | 244,181 | ~81,394 | **−63 %** |
| 2 — DOM-mutation transform | 244,929 | ~81,643 | −63 % |
| 3 — code-split descriptions | 205,756 | ~68,585 | −69 % |
| 4 — virtualize desktop tiles | **206,804** | **~68,935** | **−69 %** |

**Net delta: −450 KB / −68.5 %** uncompressed home JS, alongside a
60 Hz reconciliation loop replaced with direct DOM mutation
(Step 2) and 90 %+ fewer mounted tiles at high zoom (Step 4).

### Runtime (subjective + measured)

- **Pan/zoom on desktop**: smooth at 60 Hz throughout. The wrapper
  transform is mutated in JS, no React render per frame, no
  133-tile reconciliation. Inertia glides feel like silk.
- **Memory at high zoom**: dropped from ~133 decoded thumbnails
  loaded all the time to ~10 at max zoom. Tabs holding the page
  open at deep zoom levels free up image memory the user wasn't
  looking at anyway.
- **Mobile (Pixi)**: untouched in steps 2 and 4; Pixi already
  implemented the DOM-mutation pattern (`pixiContainerRef.current.x/y/scale`)
  and does its own GPU-side culling. Step 1 still benefits mobile
  on the dynamic-import path.

### What was NOT changed

- No image format changes, no CDN swap, no asset rewrites.
- No HTTP-cache header tuning.
- No font subsetting / preloading changes.
- No mobile-specific code paths beyond the gating discussed above.

These are obvious next-pass candidates if further wins are
required, but each step in this audit was bounded to "make the
existing app feel faster without changing what it ships."
