"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WORKS } from "@/data/works";
import { useSelection } from "@/lib/store";

type Sort = "chronological" | "alphabetical";

type Entry = {
  groupKey: string;
  title: string;
  year: number | string;
  venue?: string;
  city?: string;
  count: number;
};

function buildEntries(): Entry[] {
  const seen = new Map<string, Entry>();
  for (const w of WORKS) {
    const groupKey = `${w.title}|${w.year}`;
    const existing = seen.get(groupKey);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(groupKey, {
        groupKey,
        title: w.title,
        year: w.year,
        venue: w.venue,
        city: w.city,
        count: 1,
      });
    }
  }
  return Array.from(seen.values());
}

function yearNum(y: number | string) {
  const n = typeof y === "number" ? y : parseInt(String(y), 10);
  return Number.isFinite(n) ? n : 0;
}

export function Index({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  const [sort, setSort] = useState<Sort>("chronological");
  const [activeIdx, setActiveIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close the index when the gallery opens — having both stacked is
  // visually noisy and the gallery wants the full width. Picking
  // another project from the index keeps it open so the user can
  // hop between projects without re-opening.
  useEffect(() => {
    if (open && expandedGroupKey) onClose();
  }, [open, expandedGroupKey, onClose]);

  const entries = useMemo(() => {
    const list = buildEntries();
    if (sort === "alphabetical") {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list.sort((a, b) => yearNum(b.year) - yearNum(a.year));
  }, [sort]);

  useEffect(() => {
    if (open) setActiveIdx(0);
  }, [open, sort]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(entries.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIdx(entries.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = entries[activeIdx];
        if (target) navigateToGroup(target.groupKey);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, entries, activeIdx, navigateToGroup, onClose]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  if (!open) return null;

  return (
    <>
      {/* Click-outside backdrop. Hairline only, no dim - keeps the clinical aesthetic. */}
      <button
        type="button"
        aria-label="Close index"
        onClick={onClose}
        className="fixed inset-0 top-12 z-30 cursor-default md:left-[420px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Works index"
        className="fixed top-12 bottom-0 left-0 z-40 flex w-[420px] max-w-[90vw] flex-col border-r border-line bg-canvas"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <span className="italic text-meta uppercase tracking-[0.1em] text-mute">
            Index · {entries.length}
          </span>
          <div className="flex items-center gap-4">
            <SortButton
              label="Year"
              active={sort === "chronological"}
              onClick={() => setSort("chronological")}
            />
            <SortButton
              label="A-Z"
              active={sort === "alphabetical"}
              onClick={() => setSort("alphabetical")}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="italic text-caption text-mute hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>
        <ul
          role="listbox"
          aria-label="Exhibitions"
          className="flex-1 overflow-y-auto py-4"
        >
          {entries.map((e, i) => (
            <li key={e.groupKey}>
              <button
                type="button"
                data-idx={i}
                role="option"
                aria-selected={i === activeIdx}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => navigateToGroup(e.groupKey)}
                className={`grid w-full grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-3 text-left text-ui ${
                  i === activeIdx
                    ? "bg-line text-ink"
                    : "text-ink hover:bg-line"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink">{e.title}</span>
                  {e.venue ? (
                    <span className="block truncate text-xs text-mute">
                      {e.venue}
                    </span>
                  ) : null}
                </span>
                <time className="italic text-xs text-mute">{e.year}</time>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`italic text-meta uppercase tracking-[0.1em] ${
        active ? "text-ink" : "text-mute hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
