/**
 * Shared designer credit. Rendered once by the root layout so the
 * anchor lands in the SSR HTML of every route (canvas, text, legal,
 * per-project) without any JS. Sits in the bottom-right corner of the
 * viewport at label size in `mute`, so it reads as a quiet credit
 * over the canvas rather than as a chrome banner.
 *
 * `pointer-events-none` on the wrapper keeps the credit from
 * intercepting canvas pan/zoom gestures; `pointer-events-auto` on
 * the anchor itself keeps it clickable.
 *
 * Anchor text, href, and `rel` are fixed by the studio credit spec
 * and should not drift.
 */
export function Footer() {
  return (
    <footer
      aria-label="Site credit"
      className="pointer-events-none fixed right-3 bottom-2 z-20 text-label leading-none text-mute"
    >
      <a
        className="pointer-events-auto hover:text-ink"
        href="https://www.hubmerto.com"
        target="_blank"
        rel="noopener"
      >
        Website by Hubmerto
      </a>
    </footer>
  );
}
