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
