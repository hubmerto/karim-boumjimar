# Conventions

Decisions about copy, content, and structure that are settled and shouldn't be re-litigated.

## Project navigation

Projects live entirely on the canvas at `/`. There are no per-project routes.

The canvas shows all 13 works as a bento grid; clicking a tile triggers `navigateToGroup` to pan the camera and open the gallery. This is the only way to view a project page.

The CV (`/cv`) does not cross-link to project pages — there are no project pages to link to. CV entries link to external venue and press URLs only.

If a future requirement needs deep-linkable project pages (for press releases, social shares, SEO), the recommended approach is a query-param entry point parsed on mount: `/?project=<slug>`. Per-project static routes (~13 new pages) are not recommended — duplicate plumbing for no user gain.

## Project page copy conventions

- **No first-person announcement framing.** Strip "we are pleased to announce", "I am happy to share", "delighted to", "excited to", "thrilled". Start each project body at the noun.
- **Credits go at the end.** A single trailing block, line-break separated, in this order: curator → producer → photography → video → sound → support/funding → venue (only if not already in the title).
- **Per-project credits audit is a content task, not code.** When Karim reviews the site copy, walk each project and confirm the credit block sits at the end of the body, in the order above. Last grep'd 7 May 2026: zero "pleased to announce" / "happy to share" hits.

## Pronouns

Karim uses he/him pronouns. Use he/him/his throughout the site when referring to him individually.

Use they/their/them only when the subject is genuinely a group (collaborative project, group exhibition, named collaborators, the works themselves, or a direct quotation from external press in quotation marks).
