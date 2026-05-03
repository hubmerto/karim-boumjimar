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
 * Mobile defaults to the simple vertical-scroll fallback — the canvas
 * crashes mobile browsers shortly after mount (observed on iOS Safari
 * and Android Chrome). Desktop gets the canvas. ?canvas=1 forces the
 * canvas on mobile for testing fixes; ?simple=1 forces the fallback
 * on desktop.
 */
type Mode = "loading" | "simple" | "canvas";

function detectMode(): Mode {
  if (typeof window === "undefined") return "loading";
  const params = new URLSearchParams(window.location.search);
  if (params.get("simple") === "1") return "simple";
  if (params.get("canvas") === "1") return "canvas";
  return window.matchMedia("(max-width: 767px)").matches
    ? "simple"
    : "canvas";
}

export default function Home() {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const [mode, setMode] = useState<Mode>("loading");

  useEffect(() => {
    setMode(detectMode());
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setMode(detectMode());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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
