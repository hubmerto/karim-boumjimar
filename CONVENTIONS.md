# Conventions

Decisions about copy, content, and structure that are settled and shouldn't be re-litigated.

## Project navigation

Projects are viewable two ways: (1) on the canvas at `/` and (2) via per-project static routes `/works/[slug]` (14 routes, one per project, added in the SEO pass — see REVIEW.md).

The canvas shows all 133 work tiles (14 projects) as a bento grid; clicking a tile triggers `navigateToGroup` to pan the camera and open the gallery. A `/works/<slug>` deep link mounts the same canvas and auto-opens that project on load.

> NOTE (2026-06, audit): this section previously claimed "13 works", "no per-project routes", and recommended against per-project static routes. All three are stale — there are now 14 projects, 133 tiles, and `/works/[slug]` exists. Updated to match the code.

## Project page copy conventions

- **No first-person announcement framing.** Strip "we are pleased to announce", "I am happy to share", "delighted to", "excited to", "thrilled". Start each project body at the noun.
- **Credits go at the end.** A single trailing block, line-break separated, in this order: curator → producer → photography → video → sound → support/funding → venue (only if not already in the title).
- **Per-project credits audit is a content task, not code.** When Karim reviews the site copy, walk each project and confirm the credit block sits at the end of the body, in the order above. Last grep'd 7 May 2026: zero "pleased to announce" / "happy to share" hits.

## Pronouns

Karim uses he/him pronouns. Use he/him/his throughout the site when referring to him individually.

Use they/their/them only when the subject is genuinely a group (collaborative project, group exhibition, named collaborators, the works themselves, or a direct quotation from external press in quotation marks).
