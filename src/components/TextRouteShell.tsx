"use client";

import { useEffect, type ReactNode } from "react";
import { CrashOverlay } from "@/components/CrashOverlay";
import { Index } from "@/components/Index";
import { LeftToolbar } from "@/components/LeftToolbar";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { useSelection, type View } from "@/lib/store";

/**
 * Shared chrome for the text-only routes (/about, /bio, /news,
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
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);

  useEffect(() => {
    setView(view);
  }, [view, setView]);

  return (
    <>
      <TopBar />
      <LeftToolbar />
      {children}
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
      <Splash />
      <CrashOverlay />
    </>
  );
}
