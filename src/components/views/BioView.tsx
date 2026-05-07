"use client";

import {
  ARTIST_NAME,
  BIO_PARAGRAPHS,
  CONTACT,
  PUBLIC_COLLECTIONS,
  RECOGNITION,
  REPRESENTATION,
} from "@/data/bio";
import {
  CV_BIO,
  CV_EDUCATION,
  CV_GRANTS,
  CV_GROUP,
  CV_PERFORMANCES,
  CV_PRESS,
  CV_RESIDENCIES,
  CV_SOLO,
  type CvEntry,
} from "@/data/cv";
import { asset } from "@/lib/paths";

/**
 * Bio + CV side-by-side. Bio (artist statement, education, contact,
 * collections, recognition, representation) on the left; structured CV
 * on the right with a Download CV button.
 *
 * On viewports narrower than `lg` (1024px) the two stack vertically:
 * Bio first, then CV.
 */
export function BioView() {
  return (
    <main className="fixed inset-0 top-12 right-0 z-0 overflow-y-auto bg-canvas md:left-[200px]">
      <div className="max-w-[1280px] px-6 py-10 md:px-10 md:py-14">
        <h1 className="italic text-meta uppercase tracking-[0.1em] text-mute mb-6">
          Bio
        </h1>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <BioSide />
          <CVSide />
        </div>
      </div>
    </main>
  );
}

function BioSide() {
  return (
    <section>
      <h2 className="text-2xl text-ink leading-tight tracking-tight">
        {ARTIST_NAME}
      </h2>
      <div className="mt-6 space-y-4 text-body leading-[1.6] text-pretty break-words text-ink">
        {BIO_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
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
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
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
        <Block label="Recognition">
          <ul className="space-y-1.5 text-ui leading-[1.5]">
            {RECOGNITION.map((r, i) => (
              <li
                key={i}
                className="grid grid-cols-[64px_1fr] items-baseline gap-x-3"
              >
                <time className="text-mute tabular-nums">{r.year}</time>
                <span className="text-ink">{r.text}</span>
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <div className="mt-6">
        <Block label="Public collections">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {PUBLIC_COLLECTIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Block>
      </div>
    </section>
  );
}

function CVSide() {
  return (
    <section>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-base text-ink">Curriculum Vitae</h2>
          <div className="mt-1 text-xs text-mute">
            b. {CV_BIO.born}, {CV_BIO.nationality}
          </div>
        </div>
        <a
          href={asset("/cv.pdf")}
          download="Karim_Boumjimar_CV.pdf"
          className="inline-flex items-center gap-2 border border-ink px-3 py-1.5 text-label italic uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-canvas"
        >
          Download CV <span aria-hidden>↓</span>
        </a>
      </header>

      <CvBlock label="Education" entries={CV_EDUCATION} />
      <CvBlock label="Solo Exhibitions" entries={CV_SOLO} />
      <CvBlock label="Group Exhibitions" entries={CV_GROUP} />
      <CvBlock label="Performances" entries={CV_PERFORMANCES} />
      <CvBlock label="Residencies" entries={CV_RESIDENCIES} />
      <CvBlock label="Grants & Prizes" entries={CV_GRANTS} />
      <CvBlock label="Press" entries={CV_PRESS} />
    </section>
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
      <h3 className="italic text-meta uppercase tracking-[0.1em] text-mute">
        {label}
      </h3>
      <div className="text-caption leading-[1.55]">{children}</div>
    </div>
  );
}

function CvBlock({ label, entries }: { label: string; entries: CvEntry[] }) {
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="italic text-meta uppercase tracking-[0.1em] text-mute">
        {label}
      </h3>
      <ul className="mt-2 space-y-1.5 text-ui leading-[1.5]">
        {entries.map((e, i) => (
          <li
            key={i}
            className="grid grid-cols-[64px_1fr] items-baseline gap-x-3"
          >
            <span className="text-mute tabular-nums">{e.year}</span>
            <CvEntryBody entry={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renders one CV row. Only the entry's title is wrapped in the
 * primary anchor — venue / city / country / note render as plain
 * text. Trailing press citations (if any) render as their own
 * inline anchors after a "— press:" marker, so the venue link and
 * press link never nest or fight for the same span. */
function CvEntryBody({ entry: e }: { entry: CvEntry }) {
  const titleNode = e.url ? (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink hover:text-mute"
    >
      {e.title}
      <span aria-hidden className="ml-1 text-xs text-mute">
        ↗
      </span>
    </a>
  ) : (
    <span className="text-ink">{e.title}</span>
  );

  return (
    <span>
      {titleNode}
      {e.venue ? <span className="text-ink">, {e.venue}</span> : null}
      {e.city ? (
        <span className="text-mute">
          , {e.city}
          {e.country ? `, ${e.country}` : ""}
        </span>
      ) : null}
      {e.note ? <span className="italic text-mute"> ({e.note})</span> : null}
      {e.press && e.press.length > 0 ? (
        <span className="text-mute">
          {" — press: "}
          {e.press.map((p, i) => (
            <span key={p.url}>
              {i > 0 ? ", " : null}
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-mute"
              >
                {p.label}
                <span aria-hidden className="ml-1 text-xs text-mute">
                  ↗
                </span>
              </a>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
