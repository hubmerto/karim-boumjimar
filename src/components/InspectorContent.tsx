"use client";

import { ARTIST_NAME, BIO_LONG, CONTACT, REPRESENTATION } from "@/data/bio";
import { useSelection } from "@/lib/store";
import type { Work, Medium } from "@/types/work";

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
      <h1 className="text-base font-medium text-ink">{ARTIST_NAME}</h1>
      <div className="space-y-3 text-[13px] leading-[1.55] text-ink">
        {BIO_LONG.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <Section label="REPRESENTATION">
        <ul className="space-y-1 text-[13px]">
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
          className="text-[13px] text-ink hover:text-mute"
        >
          {CONTACT.email}
        </a>
      </Section>
      <Section label="SOCIAL">
        <a
          href={CONTACT.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-ink hover:text-mute"
        >
          {CONTACT.instagram}
        </a>
      </Section>
    </div>
  );
}

export function SelectedView({ work }: { work: Work }) {
  const deselect = useSelection((s) => s.deselect);
  const rows: { label: string; value: string | undefined }[] = [
    { label: "TITLE", value: work.title },
    { label: "YEAR", value: String(work.year) },
    { label: "MEDIUM", value: MEDIUM_LABEL[work.medium] },
    { label: "MATERIALS", value: work.materials },
    { label: "DIMENSIONS", value: work.dimensions },
    { label: "EXHIBITION", value: work.exhibition },
    { label: "VENUE", value: work.venue },
    { label: "CITY", value: work.city },
    { label: "DATE", value: work.date },
    { label: "PHOTO", value: work.photoCredit },
    { label: "COLLECTION", value: work.collection },
  ].filter((r): r is { label: string; value: string } => Boolean(r.value));

  return (
    <div className="space-y-6">
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[76px_1fr] gap-x-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.06em] text-mute leading-[1.55]">
              {row.label}
            </dt>
            <dd className="text-[13px] leading-[1.55] text-ink break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-line pt-4">
        <button
          type="button"
          onClick={deselect}
          className="text-[12px] text-mute hover:text-ink"
        >
          ← all works
        </button>
      </div>
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
      <h2 className="font-mono text-[10px] uppercase tracking-[0.06em] text-mute">
        {label}
      </h2>
      {children}
    </section>
  );
}
