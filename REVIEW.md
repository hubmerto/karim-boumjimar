# SEO hardening — REVIEW

Site: `karimboumjimar.com` (currently #1 for the artist's name). Goal of
this pass: consolidation — per-page metadata, rich-result candidates,
crawl hygiene. Nothing user-visible changes.

> **Correction (2026-06-09).** This audit predates two later changes, so a
> couple of entries below are stale: (1) `/about` was renamed to `/contact`
> and is now a permanent (301) redirect — the Person + ProfilePage JSON-LD
> lives at `/contact`, not `/about`; (2) the "Stockholm Cosmologies
> description keyed `|2026`" typo (trade-off note + follow-up #7) is fixed —
> `descriptions.ts` now keys it `|2025` to match `works.ts`, so no project
> falls back to a generated description. Everything else still reflects the
> current code.

## Route map (after this pass)

| Route                              | Type   | Title                                          | JSON-LD                |
| ---------------------------------- | ------ | ---------------------------------------------- | ---------------------- |
| `/`                                | client | `Karim Boumjimar`                              | Person                 |
| `/about`                           | client | `About — Karim Boumjimar`                      | Person                 |
| `/bio`                             | client | `Bio — Karim Boumjimar`                        | —                      |
| `/news`                            | client | `News — Karim Boumjimar`                       | —                      |
| `/grant`                           | client | `Working-Class Creative Grant — Karim Boumjimar` | —                      |
| `/imprint`                         | server | `Imprint — Karim Boumjimar`                    | —                      |
| `/privacy`                         | server | `Privacy Policy — Karim Boumjimar`             | —                      |
| `/works/[slug]` × 14               | server (SSG) | `<Title> (<Year>) — Karim Boumjimar`     | Person + VisualArtwork |
| `/pixi`                            | client | (no metadata override; test route)             | —                      |
| `/showcase/*` × 23                 | client | (no metadata override; internal demos)         | —                      |
| `/sitemap.xml`, `/robots.txt`      | static | —                                              | —                      |

All `/works/[slug]` routes are statically generated at build time
(`generateStaticParams`), so both the Vercel deploy and the
GitHub Pages static-export mirror produce real HTML files.

The 14 project slugs:

```
beauty-is-the-best-defense-2026   pandemonium-paradiso-2025
birds-of-paradise-2026            symbiosis-mfa-2025
bodies-under-construction-2026    glory-on-earth-2024
stockholm-cosmologies-2025        spring-has-arrived-2023
deep-cuts-2025                    rites-of-affection-2026
drawings-2025                     queer-ecologies-2023
kultuur-2025                      club-are-2025
```

## What changed per route

### Root (`src/app/layout.tsx`)
- Added `alternates.canonical = SITE_URL` as the default canonical (the
  home page inherits this; every other route overrides via
  `pageMetadata()` from `src/lib/seo.ts`).
- Added optional `verification.google` slot — only rendered when the
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` build env var is set.

### New `src/lib/seo.ts`
- `SITE_URL` / `SITE_NAME` constants.
- `pageMetadata({ title, description, pathname, ogImage?, ogType? })`
  returns a Next.js `Metadata` object with title, description,
  canonical, OpenGraph, and Twitter card pre-wired.
- `truncateDescription(text, max=155)` — sentence-aware truncation.
- `absoluteUrl(path)` — turns a site-root-relative path into an
  absolute URL.

### New `src/lib/person-jsonld.ts`
- Single source-of-truth Schema.org `Person` (additionalType
  `VisualArtist`) blob. `@id` is the stable URL `<SITE_URL>/#person`
  so `VisualArtwork.creator` can reference the same entity via `@id`
  on every project page.

### New `src/lib/work-slugs.ts`
- `projectKeyToSlug("Pandemonium Paradiso|2025") → "pandemonium-paradiso-2025"`.
- `slugToProjectKey()`, `allProjectSlugs()`, `worksForKey()`,
  `mediumLabel()` — all the helpers a server page needs for SSG +
  metadata generation without dragging client modules into the
  build-time bundle.

### New `src/components/JsonLd.tsx`
- Server-renderable script-tag wrapper. Escapes `<` in the JSON so a
  `</script>` literal in any payload can never close out the tag.

### `src/app/about/page.tsx`
- Added `<JsonLd data={PERSON_JSONLD} />` to the rendered tree.

### `src/app/page.tsx`
- Added `<JsonLd data={PERSON_JSONLD} />` to the rendered tree.

### New `src/app/works/[slug]/{page,WorkRouteClient}.tsx`
- Server `page.tsx`:
  - `generateStaticParams()` → 14 routes.
  - `generateMetadata()` → per-project title / description / canonical /
    OG image (the project's lead photo at its real dimensions, falls
    back to the root OG trio if dimensions are missing).
  - `notFound()` on unknown slugs — Next.js returns a real HTTP 404
    with `<meta name="robots" content="noindex">` on the 404 page (the
    only `noindex` in the whole site, which is correct).
  - Description: first paragraph of the project's `DESCRIPTIONS[key].body`,
    sentence-truncated to ≤ 155 chars. Falls back to a structured
    `Medium, Venue, City, Year` string when no body copy exists.
  - Inlines the `Person` and `VisualArtwork` JSON-LD blobs; the
    artwork's `creator` is a `{@id}` reference to the Person.
- Client `WorkRouteClient.tsx`:
  - Mirrors the home shell (TopBar, LeftToolbar, ViewSwitcher, etc.)
  - One-shot effect calls `selectGroup(projectKey)` on mount so the
    canvas auto-navigates to the project.
  - Renders both JSON-LD blobs inside the client tree (Next.js
    server-renders client components during SSR, so the blobs land in
    the initial HTML and crawlers see them without JS).

### `src/app/{imprint,privacy}/page.tsx`
- Replaced the existing `Metadata` literal with `pageMetadata()` —
  added descriptions + canonicals, standardised the title separator
  (`—` instead of `,`).

### New `src/app/{about,bio,news,grant}/layout.tsx`
- Each is a server-only layout (the underlying page is `"use client"`,
  so it can't export `metadata` directly). The layout exports a
  `pageMetadata()` blob and returns `children` unchanged.

### `src/app/sitemap.ts`
- Imports `allProjectSlugs()` and appends `/works/<slug>` × 14 to the
  existing top-level entries. Total: 21 URLs. Project entries get
  `priority: 0.6` (above any per-photo endpoint would be, below the
  top-level nav at 0.7 and home at 1.0).

## Verified locally (production build)

```
✓ pnpm build green; 50 static pages, 14 SSG (/works/[slug])
✓ Unique <title> on /, /about, /bio, /works/birds-of-paradise-2026,
  /works/symbiosis-mfa-2025
✓ <link rel="canonical"> on every probed page, pointing at the www
  host
✓ Valid JSON-LD parsed via jq:
    - / → Person
    - /about → Person
    - /works/birds-of-paradise-2026 → Person + VisualArtwork
✓ Sitemap serves 21 entries, all on https://www.karimboumjimar.com
✓ robots.txt: User-Agent: *, Allow: /, Sitemap pointer present
✓ No stray noindex outside the 404 page (where it's correct)
✓ Apex → www: https://karimboumjimar.com responds 307 → https://www.karimboumjimar.com/
```

## Trade-offs / notes

- **Project pages auto-open the canvas to that project on mount.**
  In-app navigation back to the overview (clicking the wordmark) leaves
  the URL on `/works/<slug>` while the canvas resets to fitAll. This
  is intentional — making the wordmark click `router.push("/")` would
  cross a routing-vs-state line the rest of the app doesn't otherwise
  cross. Crawlers and link-sharers always get the right page; in-app
  navigation behaviour is unchanged.
- **Client-rendered content is SSR'd.** Next.js server-renders the
  client tree during SSG, so the JSON-LD blocks land in the initial
  HTML payload and are visible to crawlers without JS. (Confirmed via
  inspection of `.next/server/app/**/*.html`.)
- **Description fallback for projects without body copy:** if
  `DESCRIPTIONS[key]` is missing, the generated description is built
  from the structured fields (`Medium, Venue, City, Year. By Karim
  Boumjimar.`). Never returns a generic string. Currently every
  project key in `WORKS` has a matching `DESCRIPTIONS` entry
  EXCEPT `Stockholm Cosmologies|2025` (the description in
  `descriptions.ts` is keyed `|2026`, presumably a typo in the
  source data) — that one falls back to the structured form. See
  manual note below.

## Manual follow-up (Karim / you)

1. **Google Search Console** — verify the property and submit
   `https://www.karimboumjimar.com/sitemap.xml`. To use the meta-tag
   verification method, set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<code>`
   in the Vercel project's environment variables and redeploy; the tag
   only renders when the env var is present.
2. **Apex redirect 307 → 301.** Vercel currently issues a 307 for
   `karimboumjimar.com → www.karimboumjimar.com`. Google treats 307s
   identically to 301s for canonicalisation, so this isn't urgent, but
   the textbook setting is permanent (301). Toggle it in Vercel
   project → Settings → Domains → Redirects.
3. **Confirm the Instagram handle in the JSON-LD.** Pulled from
   `src/data/bio.ts` (`CONTACT.instagramUrl = https://www.instagram.com/beigetype/`).
   That's what's currently rendered in the AboutView and BioView, so
   it should be right — but worth a sanity check that this is Karim's
   active artist account vs. a personal one.
4. **Confirm the Contemporary Art Library URL.** The SEO brief listed
   `https://www.contemporaryartlibrary.org/artist/karim-boumjimar-34542`;
   that's the URL embedded in the Person JSON-LD. The site already
   links a different CAL URL elsewhere
   (`/project/karim-boumjimar-61510` — the Deep Cuts project page, not
   the artist page), so the artist-level URL `-34542` was used as
   given. If the artist page is at a different numeric ID, update
   `src/lib/person-jsonld.ts` → `sameAs`.
5. **Confirm the Artsy and Helsinki Contemporary URLs.** Same blob:
   `https://www.artsy.net/artist/karim-boumjimar` and
   `https://helsinkicontemporary.com/artists/karim-boumjimar`. Hit
   each to make sure they 200; if Artsy or Helsinki use a different
   slug, update before the next deploy.
6. **Backlink from Helsinki Contemporary** (optional but high-impact):
   ask them to link `karimboumjimar.com` from their artist page if
   they don't already. Same for Jessica Silverman Gallery and other
   gallery partners (Tina Gallery already has its URL listed in
   `REPRESENTATION`). Backlinks from gallery sites carry significant
   weight for entity authority.
7. **Stockholm Cosmologies description.** `descriptions.ts` keys it
   `|2026` but `works.ts` lists `year: 2025`. The SEO description
   currently falls back to the structured form for this project. To
   fix: change the key in `src/data/descriptions.ts` from
   `"Stockholm Cosmologies|2026"` to `"Stockholm Cosmologies|2025"`
   (or update `works.ts` if 2026 is correct).
