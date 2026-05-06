"use client";

import { useEffect, useState } from "react";
import { CanvasPixi } from "@/components/CanvasPixi";
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
 * Three modes:
 *  - "pixi": WebGL canvas (mobile default; the DOM canvas crashed
 *    iOS Safari, the Pixi version doesn't).
 *  - "canvas": DOM canvas + full desktop chrome (TopBar, LeftToolbar
 *    etc.). Desktop default.
 *  - "simple": vertical-scroll fallback (kept around as an escape
 *    hatch via ?simple=1 — mostly for accessibility / WebGL-disabled
 *    browsers).
 *
 * Query params override the auto-detect: ?pixi=1, ?canvas=1, ?simple=1.
 */
type Mode = "loading" | "simple" | "canvas" | "pixi";

function detectMode(): Mode {
  if (typeof window === "undefined") return "loading";
  const params = new URLSearchParams(window.location.search);
  if (params.get("simple") === "1") return "simple";
  if (params.get("canvas") === "1") return "canvas";
  if (params.get("pixi") === "1") return "pixi";
  return window.matchMedia("(max-width: 767px)").matches ? "pixi" : "canvas";
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
  // first useEffect tick (which decides which mode to render).
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

  if (mode === "pixi") {
    return (
      <>
        <CanvasPixi />
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
