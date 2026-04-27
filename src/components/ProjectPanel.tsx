"use client";

import { useMemo } from "react";
import { WORKS } from "@/data/works";
import { descriptionFor } from "@/data/descriptions";
import { useSelection } from "@/lib/store";



export function ProjectPanel() {
  const activeKey = useSelection((s) => s.selectedGroupKey);
  const closeProject = useSelection((s) => s.closeProject);

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
        <div className="flex items-center justify-between">
          <span className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
            About
          </span>
          <button
            type="button"
            onClick={closeProject}
            aria-label="Close project description"
            className="text-[16px] leading-none text-mute hover:text-ink"
          >
            →
          </button>
        </div>
        <div className="space-y-1">
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
            <div className="italic font-bold text-[10px] uppercase tracking-[0.1em] text-mute">
              Photography
            </div>
            <div className="text-[13px] text-ink">{data.photoCredit}</div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
