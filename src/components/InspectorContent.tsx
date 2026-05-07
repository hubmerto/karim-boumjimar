"use client";

import { ARTIST_NAME, BIO_LONG, CONTACT, REPRESENTATION } from "@/data/bio";
import type { Medium } from "@/types/work";

export const MEDIUM_LABEL: Record<Medium, string> = {
  ceramic: "Ceramic",
  drawing: "Drawing",
  mixed: "Mixed media",
  publication: "Publication",
  performance: "Performance",
};

export function DefaultView() {
  return (
    <div className="space-y-6">
      <h1 className="text-base text-ink">{ARTIST_NAME}</h1>
      <div className="space-y-3 text-ui leading-[1.55] text-ink">
        {BIO_LONG.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <Section label="REPRESENTATION">
        <ul className="space-y-1 text-ui">
          {REPRESENTATION.map((rep) => (
            <li key={rep.name}>
              <a
                href={rep.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-mute"
              >
                {rep.name}
                <span className="text-mute">, {rep.city}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>
      <Section label="CONTACT">
        <a
          href={`mailto:${CONTACT.email}`}
          className="text-ui text-ink hover:text-mute"
        >
          {CONTACT.email}
        </a>
      </Section>
      <Section label="SOCIAL">
        <a
          href={CONTACT.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ui text-ink hover:text-mute"
        >
          {CONTACT.instagram}
        </a>
      </Section>
    </div>
  );
}

export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-line pt-4">
      <h2 className="italic text-meta uppercase tracking-[0.1em] text-mute">
        {label}
      </h2>
      {children}
    </section>
  );
}
