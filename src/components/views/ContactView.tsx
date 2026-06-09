"use client";

import { ARTIST_NAME, BIO_LEAD, CONTACT } from "@/data/bio";
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
      {/* Two short paragraphs. The first is BIO_LEAD verbatim — it must
          stay byte-for-byte identical to the Person JSON-LD description
          (see src/data/bio.ts) so the entity snippet and visible text
          agree. The second condenses the practice statement. */}
      <div className="mt-8 space-y-5 text-body leading-[1.65] text-pretty break-words text-ink">
        <p>{BIO_LEAD}</p>
        <p>
          His figures appear hybrid and unstable — at once human, animal, and
          mythological — shaped by desire, power, and vulnerability, refusing
          the categories that try to fix them. Ceramics sits at the centre of
          the work, treated as something between object, body, and residue: at
          once contemporary and archaeological.
        </p>
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

      {/* Direct contact + colophon. Imprint / Privacy are intentionally
          NOT repeated here — they live in the side nav (desktop) and the
          mobile menu, so duplicating them on the page is redundant. */}
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
        <p className="mt-4">
          Website by{" "}
          <a
            href="https://hubmerto.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            Humberto Gesser ↗
          </a>
        </p>
      </div>
    </TextView>
  );
}
