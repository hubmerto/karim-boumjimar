"use client";

import { NEWS, type NewsEntry } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function NewsView() {
  return (
    <TextView title="News">
      <ul className="divide-y divide-line border-y border-line">
        {NEWS.map((entry, i) => (
          <li key={i} className="grid grid-cols-[110px_1fr] gap-x-6 py-4">
            <time className="block italic text-xs uppercase tracking-[0.06em] text-mute">
              {entry.date}
            </time>
            <div className="text-caption leading-[1.55] text-ink">
              <NewsBody entry={entry} />
            </div>
          </li>
        ))}
      </ul>
    </TextView>
  );
}

/** Renders one news line. Only `entry.title` is wrapped in the
 * primary anchor; `prefix` and `suffix` render as plain text on
 * either side. Trailing press citations render as their own inline
 * anchors after a "— press:" marker so the venue link and press
 * link never nest. Each anchor gets its own ↗ glyph. */
function NewsBody({ entry: e }: { entry: NewsEntry }) {
  const titleNode = e.url ? (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink hover:text-mute"
    >
      {e.title}
      <span aria-hidden className="ml-1 text-xs text-mute">
        ↗
      </span>
    </a>
  ) : (
    <span className="text-ink">{e.title}</span>
  );

  return (
    <>
      {e.prefix ? <>{e.prefix} </> : null}
      {titleNode}
      {e.suffix ? <>{e.suffix}</> : null}
      {e.press && e.press.length > 0 ? (
        <span className="text-mute">
          {" — press: "}
          {e.press.map((p, i) => (
            <span key={p.url}>
              {i > 0 ? ", " : null}
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-mute"
              >
                {p.label}
                <span aria-hidden className="ml-1 text-xs text-mute">
                  ↗
                </span>
              </a>
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}
