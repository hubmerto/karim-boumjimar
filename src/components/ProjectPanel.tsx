"use client";

import { useMemo } from "react";
import { MEDIUM_LABEL } from "@/components/InspectorContent";
import { WORKS } from "@/data/works";
import { descriptionFor } from "@/data/descriptions";
import { useSelection } from "@/lib/store";

type ProjectContentProps = {
  showClose?: boolean;
  /**
   * When provided, renders an arrow that mirrors the sheet snap
   * state (↓ open / ↑ peek) and tapping toggles the sheet. Used
   * by the mobile InspectorSheet. Takes precedence over showClose.
   */
  sheetToggle?: { isOpen: boolean; onToggle: () => void };
};

/**
 * Single right-side panel covering BOTH the previous Work-only Inspector
 * and the project description. The structured fields (TITLE / YEAR /
 * MEDIUM / MATERIALS / DIMENSIONS / EXHIBITION / VENUE / CITY / DATE /
 * PHOTO / COLLECTION) live at the top — same layout as the old Inspector
 * — followed by the long-form description body and any credits. One bar
 * instead of two so the canvas isn't competing with two parallel stacks
 * of metadata.
 *
 * If a specific work is selected (selectedId), its full field list is
 * shown. Falling back to the first work in the group when only the
 * outline was clicked, so the panel still has structured info to
 * display.
 */
export function ProjectContent({
  showClose = false,
  sheetToggle,
}: ProjectContentProps) {
  const selectedId = useSelection((s) => s.selectedId);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const closeProject = useSelection((s) => s.closeProject);

  const work = useMemo(() => {
    if (selectedId) {
      return WORKS.find((w) => w.id === selectedId) ?? null;
    }
    if (selectedGroupKey) {
      const [title, yearRaw] = selectedGroupKey.split("|");
      return (
        WORKS.find(
          (w) => w.title === title && String(w.year) === yearRaw,
        ) ?? null
      );
    }
    return null;
  }, [selectedId, selectedGroupKey]);

  const description = useMemo(() => {
    if (!selectedGroupKey) return null;
    const [title, yearRaw] = selectedGroupKey.split("|");
    const year = Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : yearRaw;
    return descriptionFor(title, year) ?? null;
  }, [selectedGroupKey]);

  if (!work) return null;

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
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[76px_1fr] gap-x-3">
            <dt className="italic text-meta uppercase tracking-[0.1em] text-mute leading-[1.55]">
              {row.label}
            </dt>
            <dd className="text-ui leading-[1.55] text-ink break-words">
              {row.label === "YEAR" || row.label === "DATE" ? (
                <time>{row.value}</time>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {description ? (
        <div className="space-y-3 whitespace-pre-line border-t border-line pt-4 text-ui leading-[1.6] text-pretty break-words text-ink">
          {description.body}
        </div>
      ) : null}
      {description && description.credits.length > 0 ? (
        <div className="border-t border-line pt-4">
          <div className="italic text-meta uppercase tracking-[0.1em] text-mute">
            Credits
          </div>
          <div className="mt-2 space-y-1 text-ui leading-[1.55] text-ink">
            {description.credits.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectPanel() {
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const selectedId = useSelection((s) => s.selectedId);
  if (!selectedGroupKey && !selectedId) return null;
  return (
    <aside
      className="h-full w-[420px] overflow-y-auto border-l border-line bg-canvas"
      aria-label="Project description"
    >
      <div className="p-6">
        <ProjectContent showClose />
      </div>
    </aside>
  );
}
