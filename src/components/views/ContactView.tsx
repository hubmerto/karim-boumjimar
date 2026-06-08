"use client";

import Link from "next/link";
import { ABOUT_PARAGRAPHS, ARTIST_NAME, CONTACT } from "@/data/bio";
import { NewsletterForm } from "@/components/NewsletterForm";
import { TextView } from "@/components/views/TextView";

/**
 * The /contact route. Replaced what used to be the /about page —
 * same artist statement at the top so the entity-home bio surface
 * survived the rename (Person.description = BIO_LEAD = the first
 * paragraph here, byte-for-byte), with a Newsletter signup and the
 * direct-contact block stacked underneath.
 */
export function ContactView() {
  return (
    <TextView title="Contact">
      <h2 className="text-2xl text-ink leading-tight tracking-tight">
        Bodies, myths, environments — merging.
      </h2>
      <div className="mt-8 space-y-5 text-body leading-[1.65] text-pretty break-words text-ink">
        {ABOUT_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <section
        aria-labelledby="newsletter-heading"
        className="mt-14 border-t border-line pt-10"
      >
        <h2
          id="newsletter-heading"
          className="italic text-meta uppercase tracking-[0.1em] text-mute"
        >
          Newsletter
        </h2>
        <p className="mt-3 text-body leading-[1.65] text-ink">
          Occasional notes on new work, exhibitions, and the grant. A few times
          a year. Never more.
        </p>
        <NewsletterForm />
      </section>

      {/* Direct contact + legal at the foot of the page. Mirrors the
          desktop LeftToolbar footer, but reachable from the body of
          the page on mobile (where there is no left rail). */}
      <div className="mt-14 border-t border-line pt-6 text-xs leading-[1.6] text-mute">
        <div className="text-ink">{ARTIST_NAME}</div>
        <a href={`mailto:${CONTACT.email}`} className="block hover:text-ink">
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
