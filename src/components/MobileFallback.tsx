"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME, BIO_PARAGRAPHS, ABOUT_PARAGRAPHS } from "@/data/bio";
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
import { WORKS } from "@/data/works";
import { asset } from "@/lib/paths";

/**
 * Mobile-safe fallback. The pan/zoom canvas was crashing iOS Safari on
 * mount; this renders the same works as a normal vertical-scroll grid
 * with no compositor tricks. Tap a tile to open it fullscreen, tap to
 * dismiss. Bio / CV / About sections live in a tab strip.
 */
type Tab = "works" | "about" | "bio" | "cv";

export function MobileFallback() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("works");
  const open = openId ? WORKS.find((w) => w.id === openId) : null;

  // Lock body scroll when the fullscreen viewer is open.
  useEffect(() => {
    if (!openId) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openId]);

  return (
    <div
      className="fixed inset-0 overflow-y-auto bg-canvas"
      style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-canvas px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset("/logo.svg")} alt={ARTIST_NAME} className="h-5 w-auto" draggable={false} />
        <nav className="flex gap-3 text-[11px] italic font-bold uppercase tracking-[0.1em] text-mute">
          {(["works", "bio", "cv", "about"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={tab === t ? "text-ink" : "hover:text-ink"}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === "works" ? (
        <WorksGrid onOpen={(id) => setOpenId(id)} />
      ) : tab === "about" ? (
        <Prose paragraphs={ABOUT_PARAGRAPHS} />
      ) : tab === "bio" ? (
        <Prose paragraphs={BIO_PARAGRAPHS} />
      ) : (
        <CVPanel />
      )}

      {open ? <FullscreenViewer work={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function WorksGrid({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-6 p-3 pb-12">
      {WORKS.map((w) => {
        const img = w.images[0];
        if (!img) return null;
        return (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => onOpen(w.id)}
              className="block w-full text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset(img.src)}
                alt={img.alt}
                width={img.width}
                height={img.height}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="block w-full h-auto bg-line"
              />
              <div className="mt-2 flex items-baseline justify-between px-1 text-[11px]">
                <span className="text-ink">{w.title}</span>
                <span className="italic text-mute">{w.year}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <article className="space-y-4 px-5 py-6 pb-12 text-[14px] leading-relaxed text-ink">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </article>
  );
}

function CVPanel() {
  return (
    <div className="px-5 py-6 pb-12 text-ink">
      <header className="flex items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="text-[15px] font-medium">{ARTIST_NAME}</div>
          <div className="mt-1 text-[12px] text-mute">
            b. {CV_BIO.born}, {CV_BIO.nationality}.
          </div>
        </div>
        <a
          href={asset("/cv.pdf")}
          download="Karim_Boumjimar_CV.pdf"
          className="inline-flex items-center gap-1 border border-ink px-3 py-1.5 text-[10px] italic font-bold uppercase tracking-[0.1em] text-ink hover:bg-ink hover:text-canvas"
        >
          Download CV <span aria-hidden>↓</span>
        </a>
      </header>
      <CvSection label="Education" entries={CV_EDUCATION} />
      <CvSection label="Solo Exhibitions" entries={CV_SOLO} />
      <CvSection label="Group Exhibitions" entries={CV_GROUP} />
      <CvSection label="Performances" entries={CV_PERFORMANCES} />
      <CvSection label="Residencies" entries={CV_RESIDENCIES} />
      <CvSection label="Grants & Prizes" entries={CV_GRANTS} />
      <section className="mt-6 border-t border-line pt-4">
        <h3 className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
          Public Collections
        </h3>
        <ul className="mt-2 space-y-1 text-[13px]">
          {CV_COLLECTIONS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <CvSection label="Press" entries={CV_PRESS} />
    </div>
  );
}

function CvSection({ label, entries }: { label: string; entries: CvEntry[] }) {
  return (
    <section className="mt-6 border-t border-line pt-4">
      <h3 className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
        {label}
      </h3>
      <ul className="mt-2 space-y-2 text-[13px] leading-[1.45]">
        {entries.map((e, i) => (
          <li key={i} className="grid grid-cols-[56px_1fr] items-baseline gap-x-2">
            <span className="text-mute tabular-nums">{e.year}</span>
            <span>
              <span>{e.title}</span>
              {e.venue ? <span>, {e.venue}</span> : null}
              {e.city ? (
                <span className="text-mute">
                  , {e.city}
                  {e.country ? `, ${e.country}` : ""}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FullscreenViewer({
  work,
  onClose,
}: {
  work: (typeof WORKS)[number];
  onClose: () => void;
}) {
  const img = work.images[0];
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-canvas"
      onClick={onClose}
      role="dialog"
      aria-label={`${work.title}, ${work.year}`}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="text-[12px]">
          <div className="text-ink">{work.title}</div>
          <div className="italic text-mute">{work.year}</div>
        </div>
        <button
          type="button"
          aria-label="Close"
          className="text-[14px] text-mute hover:text-ink"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset(img.src)}
            alt={img.alt}
            width={img.width}
            height={img.height}
            draggable={false}
            className="mx-auto block max-h-full w-auto max-w-full"
          />
        ) : null}
      </div>
    </div>
  );
}
