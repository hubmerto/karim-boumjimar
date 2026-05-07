"use client";

import { GRANT_INFO } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function GrantView() {
  const mailto = `mailto:${GRANT_INFO.applyEmail}?subject=${encodeURIComponent(
    GRANT_INFO.applySubject,
  )}`;
  return (
    <TextView title="Working-Class Creative Grant">
      <h2 className="text-2xl text-ink leading-tight tracking-tight">
        {GRANT_INFO.title}
      </h2>
      <p className="mt-6 text-body leading-[1.6] text-pretty break-words text-ink">
        {GRANT_INFO.intro}
      </p>
      <div className="mt-6 space-y-4 text-body leading-[1.6] text-pretty break-words text-ink">
        {GRANT_INFO.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <section className="mt-10 space-y-3 border-t border-line pt-6">
        <h3 className="italic text-meta uppercase tracking-[0.1em] text-mute">
          How to apply
        </h3>
        <p className="text-caption leading-[1.6] text-ink">
          Email{" "}
          <a
            href={mailto}
            className="underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            {GRANT_INFO.applyEmail}
          </a>{" "}
          with subject line &ldquo;{GRANT_INFO.applySubject}&rdquo;. Please
          include:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-caption leading-[1.6] text-ink">
          {GRANT_INFO.applyChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </TextView>
  );
}
