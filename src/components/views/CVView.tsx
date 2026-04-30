"use client";

import { ARTIST_NAME } from "@/data/bio";
import {
  CV_BIO,
  CV_COLLECTIONS,
  CV_EDUCATION,
  CV_GRANTS,
  CV_GROUP,
  CV_PERFORMANCES,
  CV_PRESS,
  CV_RESIDENCIES,
  CV_SOLO,
  type CvEntry,
} from "@/data/cv";
import { TextView } from "@/components/views/TextView";
import { asset } from "@/lib/paths";

export function CVView() {
  return (
    <TextView title="CV">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h2 className="text-2xl font-medium text-ink leading-tight tracking-tight">
            {ARTIST_NAME}
          </h2>
          <div className="mt-2 text-[13px] text-mute">
            b. {CV_BIO.born}, {CV_BIO.nationality}. Based in {CV_BIO.location}.
          </div>
        </div>
        <a
          href={asset("/cv.pdf")}
          download="Karim_Boumjimar_CV.pdf"
          className="inline-flex items-center gap-2 border border-ink px-4 py-2 text-[12px] italic font-bold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-canvas"
        >
          Download CV
          <span aria-hidden>↓</span>
        </a>
      </header>

      <Section label="Education">
        <EntryList entries={CV_EDUCATION} />
      </Section>

      <Section label="Solo Exhibitions">
        <EntryList entries={CV_SOLO} />
      </Section>

      <Section label="Group Exhibitions">
        <EntryList entries={CV_GROUP} />
      </Section>

      <Section label="Performances">
        <EntryList entries={CV_PERFORMANCES} />
      </Section>

      <Section label="Residencies">
        <EntryList entries={CV_RESIDENCIES} />
      </Section>

      <Section label="Grants & Prizes">
        <EntryList entries={CV_GRANTS} />
      </Section>

      <Section label="Public Collections">
        <ul className="space-y-1 text-[14px]">
          {CV_COLLECTIONS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <Section label="Press">
        <EntryList entries={CV_PRESS} />
      </Section>

      <Section label="Contact">
        <ul className="space-y-1 text-[14px]">
          <li>
            <a
              href={`mailto:${CV_BIO.email}`}
              className="text-ink hover:text-mute"
            >
              {CV_BIO.email}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${CV_BIO.studioEmail}`}
              className="text-ink hover:text-mute"
            >
              {CV_BIO.studioEmail}
              <span className="text-mute"> (studio)</span>
            </a>
          </li>
        </ul>
      </Section>
    </TextView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-line pt-5">
      <h3 className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
        {label}
      </h3>
      <div className="mt-3 text-[14px] leading-[1.55] text-ink">{children}</div>
    </section>
  );
}

function EntryList({ entries }: { entries: CvEntry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={i}
          className="grid grid-cols-[64px_1fr] items-baseline gap-x-3"
        >
          <span className="text-mute text-[13px] tabular-nums">{e.year}</span>
          <span>
            <span className="text-ink">{e.title}</span>
            {e.venue ? <span className="text-ink">, {e.venue}</span> : null}
            {e.city ? (
              <span className="text-mute">
                , {e.city}
                {e.country ? `, ${e.country}` : ""}
              </span>
            ) : null}
            {e.note ? (
              <span className="italic text-mute"> ({e.note})</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
