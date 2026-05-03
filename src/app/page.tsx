"use client";

import { useEffect, useState } from "react";
import { CrashOverlay } from "@/components/CrashOverlay";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { MobileFallback } from "@/components/MobileFallback";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Both mobile and desktop default to the spatial canvas. On mobile the
 * Canvas curates down to 3 tiles per project (full set is fetched on
 * tap via ExpandedGroup), Inspector + ProjectPanel render as a bottom
 * sheet (InspectorSheet), and the LeftToolbar collapses into MobileMenu.
 * ?simple=1 forces the simple vertical-scroll fallback as an escape
 * hatch — this previously shipped as the mobile default while iOS
 * Safari was crashing on canvas mount.
 */
type Mode = "loading" | "simple" | "canvas";

function detectMode(): Mode {
  if (typeof window === "undefined") return "loading";
  const params = new URLSearchParams(window.location.search);
  if (params.get("simple") === "1") return "simple";
  return "canvas";
}

export default function Home() {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const [mode, setMode] = useState<Mode>("loading");

  useEffect(() => {
    setMode(detectMode());
  }, []);

  // Loading shell: just the splash + crash overlay between SSR and the
  // first useEffect tick (which decides simple vs canvas).
  if (mode === "loading") {
    return (
      <>
        <Splash />
        <CrashOverlay />
      </>
    );
  }

  if (mode === "simple") {
    return (
      <>
        <MobileFallback />
        <Splash />
        <CrashOverlay />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <InspectorSheet />
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
      <Splash />
      <CrashOverlay />
    </>
  );
}
