"use client";

import { useMemo } from "react";
import { WORKS } from "@/data/works";
import { descriptionFor } from "@/data/descriptions";
import { useSelection } from "@/lib/store";

/**
 * Returns the active group key based on the current selection — either the
 * explicitly-selected group or the group of the currently-selected tile.
 */
function useActiveGroupKey(): string | null {
  const selectedId = useSelection((s) => s.selectedId);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  return useMemo(() => {
    if (selectedGroupKey) return selectedGroupKey;
    if (!selectedId) return null;
    const w = WORKS.find((w) => w.id === selectedId);
    return w ? `${w.title}|${w.year}` : null;
  }, [selectedGroupKey, selectedId]);
}

export function ProjectPanel() {
  const activeKey = useActiveGroupKey();
  const deselect = useSelection((s) => s.deselect);

  const data = useMemo(() => {
    if (!activeKey) return null;
    const [title, yearRaw] = activeKey.split("|");
    const year = Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : yearRaw;
    const description = descriptionFor(title, year);
    if (!description) return null;
    const sample = WORKS.find(
      (w) => w.title === title && String(w.year) === String(year),
    );
    return {
      title,
      year,
      description,
      venue: sample?.venue,
      city: sample?.city,
      photoCredit: sample?.photoCredit,
    };
  }, [activeKey]);

  if (!data) return null;

  return (
    <aside
      className="h-full w-[360px] overflow-y-auto border-l border-line bg-canvas"
      aria-label="Project description"
    >
      <div className="space-y-6 p-6">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-mute">
            About this project
          </div>
          <h2 className="text-base font-medium text-ink">{data.title}</h2>
          <div className="text-[12px] text-mute">
            {data.year}
            {data.venue ? ` · ${data.venue}` : ""}
            {data.city ? `, ${data.city}` : ""}
          </div>
        </div>
        <div className="space-y-3 whitespace-pre-line text-[13px] leading-[1.6] text-ink">
          {data.description}
        </div>
        {data.photoCredit ? (
          <div className="border-t border-line pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-mute">
              Photography
            </div>
            <div className="text-[13px] text-ink">{data.photoCredit}</div>
          </div>
        ) : null}
        <div className="border-t border-line pt-4">
          <button
            type="button"
            onClick={deselect}
            className="text-[12px] text-mute hover:text-ink"
          >
            ← clear
          </button>
        </div>
      </div>
    </aside>
  );
}
