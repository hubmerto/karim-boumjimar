"use client";

import {
  ARTIST_NAME,
  BIO_PARAGRAPHS,
  CONTACT,
  PUBLIC_COLLECTIONS,
  RECOGNITION,
  REPRESENTATION,
} from "@/data/bio";
import { TextView } from "@/components/views/TextView";

export function BioView() {
  return (
    <TextView title="Bio">
      <h2 className="text-2xl font-medium text-ink leading-tight tracking-tight">
        {ARTIST_NAME}
      </h2>
      <div className="mt-8 space-y-4 text-[15px] leading-[1.6] text-ink">
        {BIO_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <Block label="Education">
          <ul className="space-y-1">
            <li>
              MFA, Royal Danish Academy of Fine Arts, Copenhagen{" "}
              <span className="text-mute">- 2025</span>
            </li>
            <li>BFA, Central Saint Martins, London</li>
          </ul>
        </Block>
        <Block label="Collective">
          <p>Young Boy Dancing Group, since 2016.</p>
        </Block>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <Block label="Representation">
          <ul className="space-y-1">
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
        </Block>
        <Block label="Contact">
          <a
            href={`mailto:${CONTACT.email}`}
            className="block text-ink hover:text-mute"
          >
            {CONTACT.email}
          </a>
          <a
            href={CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-ink hover:text-mute"
          >
            {CONTACT.instagram}
          </a>
        </Block>
      </section>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <Block label="Recognition">
          <ul className="space-y-1">
            {RECOGNITION.map((r, i) => (
              <li key={i}>
                {r.text}
                <span className="text-mute"> - {r.year}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block label="Public collections">
          <ul className="space-y-1">
            {PUBLIC_COLLECTIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Block>
      </section>
    </TextView>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-line pt-4">
      <h3 className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
        {label}
      </h3>
      <div className="text-[14px] leading-[1.55]">{children}</div>
    </div>
  );
}
