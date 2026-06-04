/**
 * Emit a JSON-LD structured-data block. Crawlers (Google, Bing, DDG)
 * look for `<script type="application/ld+json">` blocks in the
 * initial HTML and parse them as Schema.org entities — the way to
 * advertise rich-result candidates (person/knowledge graph, work,
 * exhibition) without changing the visible page.
 *
 * React's server renderer escapes textual children of arbitrary
 * elements as HTML entities, which would corrupt the JSON inside a
 * <script> tag (`{"&quot;@context&quot;..."` is not valid JSON). The
 * one safe escape we need to apply before serializing is to swap any
 * `<` for the JSON unicode escape `<`, so a value can never
 * accidentally close the surrounding script tag — a malicious
 * `"</script>"` literal in the data becomes `"</script>"`, still
 * valid JSON, still safe HTML.
 *
 * `data` is hardcoded at module scope (PERSON_JSONLD,
 * VisualArtwork blobs built from WORKS) — never user input — so the
 * XSS risk reduces to "the source file contains a string starting
 * with `<`", which the escape handles.
 *
 * Server-only component: the JSON lands in the initial SSR payload
 * and is visible to crawlers without JS execution.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger
  const props = { dangerouslySetInnerHTML: { __html: json } };
  return <script type="application/ld+json" {...props} />;
}
