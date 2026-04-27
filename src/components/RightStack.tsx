"use client";

import { Inspector } from "@/components/Inspector";
import { ProjectPanel } from "@/components/ProjectPanel";

/**
 * Right-side panel stack on the exhibitions view. Inspector (TITLE/YEAR
 * metadata) sits first, closer to the canvas. ProjectPanel (longer
 * description) sits second, on the far right, and only renders when a
 * project description exists for the current selection.
 */
export function RightStack() {
  return (
    <div className="fixed right-0 top-12 bottom-0 z-10 hidden md:flex">
      <Inspector />
      <ProjectPanel />
    </div>
  );
}
