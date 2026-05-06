"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ARTIST_NAME, CONTACT } from "@/data/bio";
import { WORKS } from "@/data/works";
import { useSelection, type View } from "@/lib/store";

const ITEMS: { key: View; label: string; href: string }[] = [
  { key: "exhibitions", label: "Exhibitions", href: "/" },
  { key: "news", label: "News", href: "/news" },
  { key: "bio", label: "Bio", href: "/bio" },
  { key: "about", label: "About", href: "/about" },
  { key: "grant", label: "Grant", href: "/grant" },
];

type IndexEntry = {
  groupKey: string;
  title: string;
  year: number | string;
  venue?: string;
  city?: string;
};

function buildIndexEntries(): IndexEntry[] {
  const seen = new Map<string, IndexEntry>();
  for (const w of WORKS) {
    const groupKey = `${w.title}|${w.year}`;
    if (seen.has(groupKey)) continue;
    seen.set(groupKey, {
      groupKey,
      title: w.title,
      year: w.year,
      venue: w.venue,
      city: w.city,
    });
  }
  // Reverse-chronological by year (matches the desktop Index default).
  return Array.from(seen.values()).sort((a, b) => {
    const ay = typeof a.year === "number" ? a.year : parseInt(String(a.year), 10) || 0;
    const by = typeof b.year === "number" ? b.year : parseInt(String(b.year), 10) || 0;
    return by - ay;
  });
}

type Mode = "sections" | "index";

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const view = useSelection((s) => s.view);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const [mode, setMode] = useState<Mode>("sections");

  // Reset to sections every time the menu re-opens, so previous "looked
  // at index" state doesn't surprise the user on the next open.
  useEffect(() => {
    if (open) setMode("sections");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (mode === "index") setMode("sections");
      else onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, mode, onClose]);

  const entries = useMemo(() => buildIndexEntries(), []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 top-12 z-40 flex flex-col bg-canvas md:hidden"
      role="dialog"
      aria-label={mode === "index" ? "Works index" : "Sections"}
    >
      {mode === "sections" ? (
        <>
          <ul className="flex-1 overflow-y-auto py-4">
            <li>
              <button
                type="button"
                onClick={() => setMode("index")}
                className="flex w-full items-center justify-between border-b border-line px-6 py-4 text-left text-lede text-ink"
              >
                <span>Index</span>
                <span aria-hidden className="italic text-xs text-mute">
                  →
                </span>
              </button>
            </li>
            {ITEMS.map((item) => {
              const active = view === item.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => onClose()}
                    aria-current={active ? "page" : undefined}
                    className="flex w-full items-center justify-between px-6 py-4 text-left text-lede text-ink"
                  >
                    <span>{item.label}</span>
                    {active ? (
                      <span className="italic text-meta uppercase tracking-[0.1em] text-mute">
                        current
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 border-t border-line px-6 py-5 text-xs text-mute">
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
            <div className="flex gap-4 pt-2">
              <Link href="/imprint" className="hover:text-ink">
                Imprint
              </Link>
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Index mode: show the list of all projects right inside
              the menu. Tap one to fly the camera there + close the
              menu. Back button returns to the section list. */}
          <div className="flex items-center justify-between border-b border-line px-6 py-3">
            <button
              type="button"
              onClick={() => setMode("sections")}
              className="flex items-center gap-2 text-caption text-ink"
            >
              <span aria-hidden className="italic text-xs text-mute">
                ←
              </span>
              <span>Back</span>
            </button>
            <span className="italic text-meta uppercase tracking-[0.1em] text-mute">
              Index · {entries.length}
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto py-2">
            {entries.map((e) => (
              <li key={e.groupKey}>
                <button
                  type="button"
                  onClick={() => {
                    navigateToGroup(e.groupKey);
                    onClose();
                  }}
                  className="grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 px-6 py-3 text-left text-caption text-ink"
                >
                  <span className="truncate">
                    {e.title}
                    {e.venue ? (
                      <span className="text-mute"> · {e.venue}</span>
                    ) : null}
                  </span>
                  <time className="tabular-nums text-mute">{e.year}</time>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
