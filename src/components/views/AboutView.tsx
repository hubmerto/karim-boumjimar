"use client";

import { ABOUT_PARAGRAPHS } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function AboutView() {
  return (
    <TextView title="About the practice">
      <h2 className="text-2xl font-medium text-ink leading-tight tracking-tight">
        Bodies, myths, environments — merging.
      </h2>
      <div className="mt-8 space-y-5 text-[15px] leading-[1.65] text-ink">
        {ABOUT_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </TextView>
  );
}
