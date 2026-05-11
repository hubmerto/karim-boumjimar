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
