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
 * Mobile gets a vertical-scroll fallback because the canvas was
 * crashing iOS Safari on mount. ?canvas=1 in the URL forces the canvas
 * on mobile too, for testing.
 */
type Mode = "loading" | "mobile" | "desktop";

function detectMode(): Mode {
  if (typeof window === "undefined") return "loading";
  const force = new URLSearchParams(window.location.search).get("canvas");
  if (force === "1") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
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

  // Loading shell: just the splash + crash overlay until we know which
  // mode to render. Avoids mounting the heavy canvas on a phone where it
  // would crash before we get a chance to swap to the fallback.
  if (mode === "loading") {
    return (
      <>
        <Splash />
        <CrashOverlay />
      </>
    );
  }

  if (mode === "mobile") {
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
