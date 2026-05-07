"use client";

import { useMemo } from "react";
import { WORKS } from "@/data/works";
import { descriptionFor } from "@/data/descriptions";
import { useSelection } from "@/lib/store";

type ProjectData = {
  title: string;
  year: number | string;
  body: string;
  credits: string[];
  venue?: string;
  city?: string;
  photoCredit?: string;
};

function useProjectData(): ProjectData | null {
  const activeKey = useSelection((s) => s.selectedGroupKey);
  return useMemo(() => {
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
      body: description.body,
      credits: description.credits,
      venue: sample?.venue,
      city: sample?.city,
      photoCredit: sample?.photoCredit,
    };
  }, [activeKey]);
}

type ProjectContentProps = {
  showClose?: boolean;
  /**
   * When provided, renders an arrow that mirrors the sheet snap
   * state (↓ open / ↑ peek) and tapping toggles the sheet. Used
   * by the mobile InspectorSheet. Takes precedence over showClose.
   */
  sheetToggle?: { isOpen: boolean; onToggle: () => void };
};

/** Reusable body of the project description, used by the desktop side
 * panel and the mobile bottom sheet. */
export function ProjectContent({
  showClose = false,
  sheetToggle,
}: ProjectContentProps) {
  const data = useProjectData();
  const closeProject = useSelection((s) => s.closeProject);
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="italic text-meta uppercase tracking-[0.1em] text-mute">
          About
        </span>
        {sheetToggle ? (
          <button
            type="button"
            onClick={sheetToggle.onToggle}
            aria-label={
              sheetToggle.isOpen
                ? "Close project description"
                : "Open project description"
            }
            className="text-base leading-none text-mute hover:text-ink"
          >
            {sheetToggle.isOpen ? "↓" : "↑"}
          </button>
        ) : showClose ? (
          <button
            type="button"
            onClick={closeProject}
            aria-label="Close project description"
            className="text-base leading-none text-mute hover:text-ink"
          >
            →
          </button>
        ) : null}
      </div>
      <div className="space-y-1">
        <h2 className="text-base text-ink">{data.title}</h2>
        <div className="text-xs text-mute">
          <time>{data.year}</time>
          {data.venue ? ` · ${data.venue}` : ""}
          {data.city ? `, ${data.city}` : ""}
        </div>
      </div>
      <div className="space-y-3 whitespace-pre-line text-ui leading-[1.6] text-pretty break-words text-ink">
        {data.body}
      </div>
      {data.credits.length > 0 ? (
        <div className="border-t border-line pt-4">
          <div className="italic text-meta uppercase tracking-[0.1em] text-mute">
            Credits
          </div>
          <div className="mt-2 space-y-1 text-ui leading-[1.55] text-ink">
            {data.credits.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : data.photoCredit ? (
        <div className="border-t border-line pt-4">
          <div className="italic text-meta uppercase tracking-[0.1em] text-mute">
            Photography
          </div>
          <div className="text-ui text-ink">{data.photoCredit}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectPanel() {
  const data = useProjectData();
  if (!data) return null;
  return (
    <aside
      className="h-full w-[360px] overflow-y-auto border-l border-line bg-canvas"
      aria-label="Project description"
    >
      <div className="p-6">
        <ProjectContent showClose />
      </div>
    </aside>
  );
}
