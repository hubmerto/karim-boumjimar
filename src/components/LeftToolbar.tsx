"use client";

import { useState } from "react";
import { ARTIST_NAME, CONTACT } from "@/data/bio";
import { useSelection, type View } from "@/lib/store";
import { Index } from "@/components/Index";

const ITEMS: { key: View; label: string }[] = [
  { key: "exhibitions", label: "Exhibitions" },
  { key: "news", label: "News" },
  { key: "bio", label: "Bio" },
  { key: "about", label: "About" },
  { key: "grant", label: "Grant" },
];

export function LeftToolbar() {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const [indexOpen, setIndexOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Sections"
        className="fixed left-0 top-12 bottom-0 z-20 hidden w-[200px] flex-col justify-between border-r border-line bg-canvas md:flex"
      >
        <div>
          <button
            type="button"
            onClick={() => setIndexOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={indexOpen}
            className="flex w-full items-center gap-3 border-b border-line px-6 py-3 text-left text-[13px] text-ink hover:text-mute"
          >
            <HamburgerIcon />
            <span>Index</span>
          </button>
          <ul className="py-3">
            {ITEMS.map((item) => {
              const active = view === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setView(item.key)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 px-6 py-2 text-left text-[13px] ${
                      active ? "text-ink" : "text-mute hover:text-ink"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-px w-3 ${active ? "bg-ink" : "bg-transparent"}`}
                    />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-2 px-6 py-5 text-[11px] text-mute">
          <div>{ARTIST_NAME}</div>
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
        </div>
      </nav>
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <line x1="0" y1="3" x2="14" y2="3" stroke="currentColor" />
      <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" />
      <line x1="0" y1="11" x2="14" y2="11" stroke="currentColor" />
    </svg>
  );
}
