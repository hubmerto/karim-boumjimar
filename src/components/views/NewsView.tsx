"use client";

import { NEWS } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function NewsView() {
  return (
    <TextView title="News">
      <ul className="divide-y divide-line border-y border-line">
        {NEWS.map((entry, i) => {
          const Inner = (
            <>
              <time className="block italic text-[12px] uppercase tracking-[0.06em] text-mute">
                {entry.date}
              </time>
              <div className="text-[14px] leading-[1.55] text-ink">
                {entry.text}
                {entry.url ? (
                  <span className="ml-1 italic text-[12px] text-mute">
                    →
                  </span>
                ) : null}
              </div>
            </>
          );
          return (
            <li key={i} className="grid grid-cols-[110px_1fr] gap-x-6 py-4">
              {entry.url ? (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contents hover:[&_.text-ink]:text-mute"
                >
                  {Inner}
                </a>
              ) : (
                Inner
              )}
            </li>
          );
        })}
      </ul>
    </TextView>
  );
}
