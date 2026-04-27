"use client";

import { NEWS } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function NewsView() {
  return (
    <TextView title="News">
      <ul className="divide-y divide-line border-y border-line">
        {NEWS.map((entry, i) => (
          <li key={i} className="grid grid-cols-[110px_1fr] gap-x-6 py-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-mute">
              {entry.date}
            </div>
            <div className="text-[14px] leading-[1.55] text-ink">
              {entry.text}
            </div>
          </li>
        ))}
      </ul>
    </TextView>
  );
}
