"use client";

import Link from "next/link";
import { ABOUT_PARAGRAPHS, ARTIST_NAME, CONTACT } from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function AboutView() {
  return (
    <TextView title="About the practice">
      <h2 className="text-2xl text-ink leading-tight tracking-tight">
        Bodies, myths, environments - merging.
      </h2>
      <div className="mt-8 space-y-5 text-body leading-[1.65] text-pretty break-words text-ink">
        {ABOUT_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Contact + legal at the end of About. Mirrors the desktop
          LeftToolbar footer, but reachable from the body of the page
          on mobile (where there is no left rail). */}
      <div className="mt-14 border-t border-line pt-6 text-xs leading-[1.6] text-mute">
        <div className="text-ink">{ARTIST_NAME}</div>
        <a
          href={`mailto:${CONTACT.email}`}
          className="block hover:text-ink"
        >
          {CONTACT.email}
        </a>
        <a
          href={CONTACT.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:text-ink"
        >
          {CONTACT.instagram}
        </a>
        <div className="mt-3 flex gap-4">
          <Link href="/imprint" className="hover:text-ink">
            Imprint
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </TextView>
  );
}
