"use client";

import { useEffect, type ReactNode } from "react";
import { CrashOverlay } from "@/components/CrashOverlay";
import { LeftToolbar } from "@/components/LeftToolbar";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { useSelection, type View } from "@/lib/store";

/**
 * Shared chrome for the text-only routes (/contact, /bio, /news,
 * /grant). Renders the same TopBar / LeftToolbar / Splash /
 * CrashOverlay as the home page, but skips the canvas / inspector
 * sheet — those are exhibitions-only. Sets the store's `view` so
 * the LeftToolbar highlights the right item and so an in-SPA
 * navigation back to `/` returns the user to the canvas.
 */
export function TextRouteShell({
  view,
  children,
}: {
  view: View;
  children: ReactNode;
}) {
  const setView = useSelection((s) => s.setView);

  useEffect(() => {
    setView(view);
  }, [view, setView]);

  return (
    <>
      <TopBar />
      <LeftToolbar />
      {children}
      {/* No <Index> here: the index is a canvas feature. The LeftToolbar's
          Index button routes back to the overview (/) and opens it there,
          so it never floats a drawer over the text. */}
      <Splash />
      <CrashOverlay />
    </>
  );
}
