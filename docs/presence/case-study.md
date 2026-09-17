# Case study: Karim Boumjimar

Backfilled 2026-09-17 from evidence in this repository, the Wikidata REST API, the Wikimedia MediaWiki API, and the Wayback Machine CDX API. The work being described happened before this document existed, so the baseline is reconstructed from what those sources can still show, not from anything captured in the moment.

**Consent: internal only.** Do not publish this document or its findings outside this repository without written approval from Karim Boumjimar.

Raw evidence files: [`evidence/`](evidence/).

---

## Timeline (evidence only)

### Repository (`hubmerto/karim-boumjimar`)

Commits that touch structured data, JSON-LD, meta tags, sitemap, robots, SEO, press or bio pages. Full list at [`evidence/git-log-seo-surfaces.txt`](evidence/git-log-seo-surfaces.txt); the SEO-relevant subset:

| Date (local) | Hash | One-line change |
|---|---|---|
| 2026-05-07 | `02adf00` | First commit visible in git history. Navigation showcase; no metadata, JSON-LD, sitemap, or robots. |
| 2026-05-11 | `d3bf2c7` | Content updates: drops alicefolker links (in-body links, not schema). |
| 2026-05-16 | `aab61e4` | Content: removes press page; adds Alice Folker credit. |
| 2026-06-04 | `8737755` | **SEO consolidation.** Adds `src/lib/seo.ts::pageMetadata()`, per-route `layout.tsx` with unique title + canonical, `src/lib/person-jsonld.ts`, per-project VisualArtwork JSON-LD, 14 `/works/[slug]` SSG routes, `src/app/sitemap.ts` (7 top-level + 14 project = 21 entries), `src/app/robots.ts`. Commit body notes: "site already ranks #1 for the name". |
| 2026-06-05 | `9a1ff6e` | Fix: `alumniOf.sameAs` points at `kunstakademiet.dk` (Fine Arts) not `kglakademi.dk` (combined school). |
| 2026-06-05 | `e1da3fa` | Person.description is now credentials-forward (`BIO_LEAD`, byte-identical to the visible `/about` lead). Adds `ProfilePage` to `/about`. |
| 2026-06-08 | `b4143ce` | Renames `/about` → `/contact`. Adds 301 in `next.config.ts`; `/about` is dropped from the sitemap. |
| 2026-06-09 | `abf3ffe` | Adds `https://www.wikidata.org/wiki/Q135780698` to `Person.sameAs`. Bidirectional site ↔ Wikidata link complete on this date (Wikidata already carried `P856` → site, from 2025-08-14). |

Everything before 2026-05-07 is not in this repository. The public site existed continuously before that (see Wayback below) on a codebase that isn't represented here.

### Wikidata: Q135780698

Full log at [`evidence/wikidata-q135780698-history.json`](evidence/wikidata-q135780698-history.json). Entity snapshot at [`evidence/wikidata-q135780698-entity.json`](evidence/wikidata-q135780698-entity.json). Diff URLs follow the pattern `https://www.wikidata.org/w/index.php?diff=<id>`.

**Creation:** 2025-08-14 12:13:00Z by **Jasleht** (user id 2528330). First edit created the item with a Finnish label "Karim Boumjimar" and description "taiteilija" (artist). Every recorded revision is marked THIRD-PARTY: Humberto's Wikidata account (`Dieletzentag`) has not edited this item.

| Timestamp (UTC) | User | Change | Ownership | Diff |
|---|---|---|---|---|
| 2025-08-14 12:13:00 | Jasleht | Item created (fi label + fi desc "taiteilija") | THIRD-PARTY | [2391972868](https://www.wikidata.org/w/index.php?diff=2391972868) |
| 2025-08-14 12:13:39 | Jasleht | +mul label "Karim Boumjimar" | THIRD-PARTY | [2391973191](https://www.wikidata.org/w/index.php?diff=2391973191) |
| 2025-08-14 12:13:39 | Jasleht | +en label "Karim Boumjimar" | THIRD-PARTY | [2391973196](https://www.wikidata.org/w/index.php?diff=2391973196) |
| 2025-08-14 12:13:39 | Jasleht | +en desc "artist" | THIRD-PARTY | [2391973199](https://www.wikidata.org/w/index.php?diff=2391973199) |
| 2025-08-14 12:14:40 | Jasleht | +P31=Q5 (instance of: human) | THIRD-PARTY | [2391973525](https://www.wikidata.org/w/index.php?diff=2391973525) |
| 2025-08-14 12:15:19 | Jasleht | +P735=Q1729369 (given name: Karim) | THIRD-PARTY | [2391973722](https://www.wikidata.org/w/index.php?diff=2391973722) |
| 2025-08-14 12:16:51 | Jasleht | +P569=1998 (date of birth), source `karimboumjimar.com/cvs` | THIRD-PARTY | [2391974149](https://www.wikidata.org/w/index.php?diff=2391974149) |
| 2025-08-14 12:18:02 | Jasleht | +P6379=Q86443703 (has work in collection), source: a Google spreadsheet | THIRD-PARTY | [2391974618](https://www.wikidata.org/w/index.php?diff=2391974618) |
| 2025-08-14 12:21:20 | Jasleht | +P106=Q483501 (occupation: artist), source `karimboumjimar.com/` | THIRD-PARTY | [2391975912](https://www.wikidata.org/w/index.php?diff=2391975912) |
| 2025-09-01 08:38:32 | Hannolans | +P21=Q6581097 (sex/gender: male), inferred from given name | THIRD-PARTY | [2399041556](https://www.wikidata.org/w/index.php?diff=2399041556) |
| 2025-11-27 11:24:15 | Hannolans | en desc: adds birthyear ("artist, born 1998") | THIRD-PARTY | [2434686572](https://www.wikidata.org/w/index.php?diff=2434686572) |
| 2026-01-05 07:06:28 | Hannolans | +P7763 (copyright status based on life sign) | THIRD-PARTY | [2451562306](https://www.wikidata.org/w/index.php?diff=2451562306) |
| 2026-06-05 15:51:14 | Jamie7687 | Merged in duplicate item Q140068240 (+7,679 bytes, big claim import) | THIRD-PARTY | [2502274183](https://www.wikidata.org/w/index.php?diff=2502274183) |
| 2026-06-05 15:52:53 | Jamie7687 | Removed junk P569 claim "28 January 98 CE" that came in via the merge | THIRD-PARTY | [2502274718](https://www.wikidata.org/w/index.php?diff=2502274718) |
| 2026-06-05 15:53:44 | Jamie7687 | en desc set to "Spanish-Moroccan visual artist (born 1998)" (still current) | THIRD-PARTY | [2502274967](https://www.wikidata.org/w/index.php?diff=2502274967) |
| 2026-06-09 21:33:45 | MS Sakib | +bn description | THIRD-PARTY | [2503976934](https://www.wikidata.org/w/index.php?diff=2503976934) |
| 2026-09-11 20:06:21 | MS Sakib | +as (Assamese) description | THIRD-PARTY | [2544164343](https://www.wikidata.org/w/index.php?diff=2544164343) |

Notable coincidence: the site added Wikidata to its `Person.sameAs` on 2026-06-09 (commit `abf3ffe`) on the same day that MS Sakib added a Bengali description to the item. Same day, no direct causal link visible in the evidence.

### Wikipedia

No article exists in any language.

- Direct checks (en, es, da): API returned `missing` for `Karim Boumjimar`. See responses in this session's tool output.
- fi (Finnish) check: not confirmed via API (rate-limit at time of query), but Q135780698's `sitelinks` object in [`evidence/wikidata-q135780698-entity.json`](evidence/wikidata-q135780698-entity.json) is empty — every Wikipedia article is linked back to its Wikidata item via a sitelink, so no article exists in any language served by Wikidata.

### Wayback Machine (`www.karimboumjimar.com`)

Raw CDX at [`evidence/wayback-cdx.json`](evidence/wayback-cdx.json). The Internet Archive was intermittently offline during evidence collection; the numbers below reflect the successful pull.

- **Earliest capture:** 2022-09-01 20:59:06 UTC, 200 OK, 20,557 bytes.
- **Second same-day capture** 2022-09-01 20:59:43 UTC has the same digest — same page, same content.
- **13 captures total** on record between 2022-09-01 and 2025-11-29, on the `www` subdomain. Apex `karimboumjimar.com` (no subdomain) had zero 200-OK CDX rows.
- **Last capture before the SEO commit (2026-06-04):** 2025-11-29 23:25:02 UTC — five months of Wayback silence between it and the commit.
- **Post-SEO captures:** unknown. The IA was returning "Temporarily Offline" for narrower date-range and `/sitemap.xml` / `/robots.txt` queries; retry to fill this in.

---

## Baseline (reconstructed)

Earliest evidenced state of each surface. Anything without evidence is marked "unknown" — never guessed.

### Site (`karimboumjimar.com`)

- **Existence:** the site was live and served HTML at least from 2022-09-01 (Wayback). Content of that page not examined here.
- **Codebase in this repo:** first commit 2026-05-07. Anything before that ran on a different codebase not tracked in `hubmerto/karim-boumjimar`.
- **Per-page metadata (unique title / canonical / OG per route):** absent before 2026-06-04 (commit `8737755` introduced `pageMetadata()`); prior state in this repo shows only the root-layout defaults.
- **Structured data (JSON-LD):** absent in this repo before 2026-06-04.
- **Per-project routes:** none before 2026-06-04. The 14 `/works/[slug]` SSG routes were introduced by `8737755`.
- **Sitemap:** absent before 2026-06-04. Commit body notes "sitemap grows from 7 → 21 entries" — this suggests some prior 7-entry sitemap, but that file is not present anywhere in this repo's git history and no Wayback capture of `/sitemap.xml` is available. Treat the pre-`8737755` sitemap as **unknown**.
- **`robots.txt`:** unknown before 2026-06-04. No `/robots.txt` Wayback capture retrievable.
- **Search Console:** never connected (confirmed by Humberto 2026-09-17). The env slot `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` was wired in commit `8737755` but never populated with a real token.
- **Site → Wikidata `sameAs`:** absent until 2026-06-09 (commit `abf3ffe`).

### Wikidata Q135780698

- **Baseline (at creation, 2025-08-14 12:13:00Z):** Finnish label "Karim Boumjimar", Finnish description "taiteilija", no claims yet. Within the next eight minutes Jasleht added mul + en labels, en desc "artist", P31=human, P735=Karim, P569=1998, P6379 collection statement, P106 artist.
- **Referenced sources** in Jasleht's claim edits: `https://www.karimboumjimar.com/`, `https://www.karimboumjimar.com/about`, `https://www.karimboumjimar.com/cvs`. This is the earliest evidence that the site was already the authoritative surface for Boumjimar at that date. It doesn't establish what `/cvs` looked like; that URL doesn't exist on the current Next.js site.
- **Site → item link (P856):** the Wikidata item points at the site from 2025-08-14. The reverse link (site → item) landed 2026-06-09 (~10 months later).

### Wikipedia

- **Baseline:** does not exist. No article in any language served by Wikidata as a sitelink.

---

## Current (2026-09-17)

### Site

- Framework: Next.js 16 (App Router), TypeScript, Tailwind 4, Zustand, Sharp.
- Primary: https://www.karimboumjimar.com (Vercel, image optimization on). Mirror: https://hubmerto.com/karim-boumjimar/ (GitHub Pages static export via `.github/workflows/deploy.yml`, `STATIC_EXPORT=1`).
- Routes: `/`, `/contact`, `/bio`, `/news`, `/grant`, `/imprint`, `/privacy`, `/works/[slug]` × 14.
- Metadata: per-route unique title (`<Page> — Karim Boumjimar`), absolute canonical, OpenGraph (3 image variants: 1200×630, 1200×900, 1200×1200), Twitter `summary_large_image`, per-project OG image = the project's lead photo.
- Structured data:
  - `Person` (with `additionalType: VisualArtist`) on `/` and `/contact`, `@id = SITE_URL#person`.
  - `sameAs`: Wikidata Q135780698 (first), Instagram `@beigetype`, Artsy, Helsinki Contemporary, Contemporary Art Library.
  - `alumniOf`: Royal Danish Academy of Fine Arts, Central Saint Martins.
  - `description`: byte-identical to `BIO_LEAD` in `src/data/bio.ts`.
  - `VisualArtwork` on each `/works/[slug]`; `creator` is a `{@id}` reference to the Person.
- Sitemap: 21 entries (7 top-level + 14 project). `/about` is redirected 301 to `/contact` in `next.config.ts` and intentionally not listed.
- `robots.txt`: `User-agent: *` / `Allow: /` / sitemap pointer / host hint.
- Search Console: **not connected**.

### Wikidata Q135780698

- Labels: fi, mul, en = "Karim Boumjimar".
- Aliases: en = "beigetype".
- Descriptions: en = "Spanish-Moroccan visual artist (born 1998)"; fi = "taiteilija"; bn, as also set.
- Claims (13 properties): `P31, P19, P21, P27, P69, P106, P569, P735, P856, P2003, P6379, P7763, P2042`.
- Sitelinks: none.

### Wikipedia

Still no article in any language.

### Screenshots to take

Please capture these and drop them into `docs/presence/evidence/screenshots/` (filenames suggested):

1. **`serp-name-2026-09-17.png`** — Google Search for "Karim Boumjimar", top of fold, one region only (state which, e.g. `.dk` or `.com`). Include organic + any knowledge panel.
2. **`serp-name-incognito-2026-09-17.png`** — same query in an incognito window, so the SERP isn't personalized.
3. **`serp-ceramics-2026-09-17.png`** — "Karim Boumjimar ceramics", to test long-tail intent.
4. **`wikidata-q135780698-2026-09-17.png`** — the Wikidata item as rendered on the web.
5. **`rrt-home-2026-09-17.png`** — Google Rich Results Test on `https://www.karimboumjimar.com/`, "detected structured data" panel visible.
6. **`rrt-work-2026-09-17.png`** — Rich Results Test on any `/works/[slug]` (pick one with a photo, so both `Person` and `VisualArtwork` show up).
7. **`view-source-home-2026-09-17.png`** — `view-source:` on `/`, JSON-LD `<script>` block visible.
8. **`home-render-2026-09-17.png`** — the homepage as it renders in a Chromium browser at desktop width.

These are the earliest datable proofs the case study will have. They anchor the "as of 2026-09-17" claim; without them the current-state section is my read of the code, not what the world sees.

---

## Metrics

| Surface | Before | Current | Evidence |
|---|---|---|---|
| Per-route unique title / canonical | absent pre-2026-06-04 in this repo | present on every route | commit `8737755`, `src/lib/seo.ts`, per-route `layout.tsx` |
| Person JSON-LD on `/` and `/contact` | absent pre-2026-06-04 | present | commit `8737755`, `src/lib/person-jsonld.ts` |
| VisualArtwork JSON-LD on project pages | absent pre-2026-06-04 | present on 14 `/works/[slug]` | commit `8737755` |
| Per-project SSG routes | 0 pre-2026-06-04 in this repo | 14 (`allProjectSlugs()`) | commit `8737755` |
| Sitemap entries | **unknown** pre-2026-06-04 (commit body mentions "7 → 21" but the earlier sitemap is not in git or in Wayback) | 21 | `src/app/sitemap.ts` |
| Site → Wikidata `sameAs` | absent pre-2026-06-09 | present | commit `abf3ffe` |
| Wikidata → site (`P856`) | present at item creation 2025-08-14 | present | Wikidata rev history, `evidence/wikidata-q135780698-history.json` |
| Wikipedia articles | 0 | 0 | Wikidata `sitelinks: {}` |
| Wayback captures (site homepage, 200) | 13 between 2022-09-01 and 2025-11-29 | 13 (as of last successful CDX pull) | `evidence/wayback-cdx.json` |
| Search Console impressions / clicks / CTR | **unknown** — never connected | **unknown** — never connected | user confirmation, 2026-09-17 |
| Rich-results eligibility (Person, VisualArtwork) | **unknown** pre-2026-06-04 | **unverified** — no RRT screenshot on record yet | needs screenshot 5–6 above |
| Live organic ranking for "Karim Boumjimar" | commit `8737755` body claims "#1 for the name" as of 2026-06-04, **self-reported and unverified** | **unverified** — needs screenshots 1–2 above | commit `8737755` body |

Search Console was **not connected** at any point. There are no impressions, clicks, average-position, or CTR values available to reconstruct — before or after. Any traffic story that depends on Search Console data cannot be told from what exists today.

---

## Framing — what can be claimed, what cannot

### What the evidence supports (honest claims)

- On **2026-06-04**, a single SEO consolidation commit added: `pageMetadata()`, per-route server `layout.tsx` shells with unique title + absolute canonical, `Person` JSON-LD with an `@id` and `VisualArtist` `additionalType`, per-project `VisualArtwork` JSON-LD with `creator` back-references, 14 `/works/[slug]` SSG routes, `sitemap.ts`, `robots.ts`, a `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env slot. Before this commit none of these existed in the Next.js codebase.
- On **2026-06-05**, `Person.description` was aligned byte-for-byte with the visible `/about` lead paragraph (`BIO_LEAD`), so a knowledge-panel-style snippet would draw from the same string the visitor reads.
- On **2026-06-09**, `Person.sameAs` on the site started pointing at Wikidata Q135780698, closing a bidirectional site ↔ Wikidata link. The Wikidata side (`P856` → site) had already been in place since the item was created on **2025-08-14**.
- Q135780698 was created and maintained entirely by third parties. Notably, the first editor (Jasleht) wrote in Finnish and referenced `karimboumjimar.com` as their source — this suggests the item was created in Boumjimar's Finnish institutional orbit (Pori Art Museum, Kuntsi, Kunsthalle Helsinki all appear in the bio). This is inference, not proof.
- The site has been continuously live since at least **2022-09-01** (Wayback), on a codebase that predates this repository.

### What cannot be claimed from what we have

- **No SEO outcome claims.** Search Console was never connected. There are no impressions, clicks, average-position, or CTR figures — for either the pre- or post-consolidation period. Any before/after story would be fabricated.
- **No pre-consolidation baseline of the site itself in this repo.** The Next.js codebase begins 2026-05-07. The pre-2026 site rendered on a different stack; whatever meta tags, structured data, or sitemap it did or didn't have is not in this repo, and Wayback captures of `/sitemap.xml` and `/robots.txt` were not retrievable during evidence collection.
- **No claim of ranking improvement.** The commit `8737755` body states "site already ranks #1 for the name" as of 2026-06-04. That is self-reported, undated in a rigorous sense, and not corroborated by SERP screenshots. If ranking matters to the case, capture SERPs today and re-capture at a stable interval so the evidence exists going forward.
- **No Wikidata authorship claim.** The item was created and every subsequent edit was made by other users. If a case study for a third party is later shown work on this artist's presence, it should not include Wikidata contributions.
- **Wikipedia is not part of the story.** No article exists in any language, and no Wikipedia work has been done from this repo.
- **Wayback coverage is thin and stale.** 13 captures across roughly three years, gap between 2025-11-29 and today, no `/sitemap.xml` or `/robots.txt` captures on record. Any claim about how the site "looked" at a given historical moment has to rest on one of those 13 stored copies.

### One honest sentence that could open a public write-up (only if consent moves off "internal only")

"In June 2026, karimboumjimar.com was consolidated onto the Next.js App Router with per-route metadata, Person and VisualArtwork JSON-LD, a 21-entry sitemap, and an explicit bidirectional link to its already-existing Wikidata item (Q135780698, created by a third-party editor in August 2025); Search Console was not connected and no traffic outcomes are reported."

---

## Reproducing this document

- Git log slice: `git log --all --date=iso-strict --pretty=format:'%h %ad %s' --diff-filter=AM -- 'src/app/sitemap*' 'src/app/robots*' 'src/app/layout*' 'src/app/**/page.tsx' 'src/app/**/layout.tsx' 'src/lib/seo.ts' 'src/lib/person-jsonld.ts' 'src/lib/work-jsonld.ts' 'src/data/bio.ts' 'next.config.ts'`
- Wikidata history: `curl 'https://www.wikidata.org/w/rest.php/v1/page/Q135780698/history'` (send a User-Agent; the endpoint rate-limits aggressively).
- Wikidata entity snapshot: `curl 'https://www.wikidata.org/wiki/Special:EntityData/Q135780698.json'`.
- Wikipedia existence checks: `curl 'https://<lang>.wikipedia.org/w/api.php?action=query&titles=Karim%20Boumjimar&prop=info&format=json'`.
- Wayback CDX: `curl 'https://web.archive.org/cdx/search/cdx?url=www.karimboumjimar.com&output=json&filter=statuscode:200'`.
