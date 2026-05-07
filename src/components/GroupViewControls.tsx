"use client";

import { useSelection } from "@/lib/store";

/**
 * Floating control cluster shown only while the canvas is in group
 * view (a project is pinned but the gallery isn't open). Provides
 * an explicit way to leave the group or expand to gallery without
 * relying on Esc / pinch / background-tap, which aren't always
 * discoverable.
 *
 * Hidden during the gallery itself — ExpandedGroup has its own ×.
 */
export function GroupViewControls() {
  const view = useSelection((s) => s.view);
  const selectedGroupKey = useSelection((s) => s.selectedGroupKey);
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  const deselect = useSelection((s) => s.deselect);
  const expandGroup = useSelection((s) => s.expandGroup);

  if (view !== "exhibitions") return null;
  if (!selectedGroupKey || expandedGroupKey) return null;

  // Sit just inside the canvas viewport's right edge so the buttons
  // never fall behind the merged ProjectPanel (360 px) on desktop.
  // Mobile has no side panel — the buttons hug the viewport edge.
  return (
    <div
      className="fixed top-16 right-4 z-30 flex items-center gap-1 md:right-[376px]"
      role="toolbar"
      aria-label="Group view controls"
    >
      <button
        type="button"
        onClick={() => expandGroup(selectedGroupKey)}
        aria-label="Open gallery view"
        title="Open gallery"
        className="flex h-8 w-8 items-center justify-center border border-line bg-canvas text-mute hover:text-ink"
      >
        {/* Four corner brackets pulled outward — universal "expand" glyph */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="square"
          aria-hidden
        >
          <path d="M1 4V1H4M8 1H11V4M11 8V11H8M4 11H1V8" />
        </svg>
      </button>
      <button
        type="button"
        onClick={deselect}
        aria-label="Close group view"
        title="Close"
        className="flex h-8 w-8 items-center justify-center border border-line bg-canvas text-mute hover:text-ink"
      >
        <span aria-hidden className="text-caption leading-none">
          ×
        </span>
      </button>
    </div>
  );
}
