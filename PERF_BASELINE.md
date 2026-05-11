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
