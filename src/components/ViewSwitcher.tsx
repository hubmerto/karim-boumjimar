"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { CanvasPixi } from "@/components/CanvasPixi";
import { ExpandedGroup } from "@/components/ExpandedGroup";
import { RightStack } from "@/components/RightStack";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { GrantView } from "@/components/views/GrantView";
import { NewsView } from "@/components/views/NewsView";
import { useSelection } from "@/lib/store";

export function ViewSwitcher() {
  const view = useSelection((s) => s.view);
  // Mobile gets the WebGL canvas (Pixi) — the DOM canvas with 123
  // tiles + transforms crashes iOS Safari's compositor. Desktop
  // keeps the DOM canvas because its dispersion / hover / outline
  // affordances are tuned to that implementation.
  //
  // Lazy-init from matchMedia: we MUST NOT briefly mount Canvas
  // (DOM) on a mobile client, because even a few hundred ms of
  // it can crash iOS Safari before useEffect runs.
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (view === "exhibitions") {
    return mobile ? (
      <>
        <CanvasPixi />
        {/* ExpandedGroup is rendered inside Canvas on desktop. On
            mobile the Pixi canvas takes that slot, so we mount it
            here instead. Only mount the positioning shell when the
            overlay is actually open — otherwise pointer-events on
            the wrapper would intercept touches even with
            pointer-events:none, and (more importantly) the canvas
            wrapper's touch-action:none would propagate up the
            event chain and block native horizontal scroll inside
            the strip. */}
        <MobileExpandedGroupShell />
      </>
    ) : (
      <>
        <Canvas />
        <RightStack />
      </>
    );
  }
  if (view === "bio") return <BioView />;
  if (view === "about") return <AboutView />;
  if (view === "news") return <NewsView />;
  if (view === "grant") return <GrantView />;
  return null;
}

/** Mobile-only positioning shell for ExpandedGroup. Mounted only
 * when the store says a group is expanded so it doesn't sit on
 * top of the canvas with pointer-events traps when idle. The
 * shell sits below the TopBar (top-12) and gives ExpandedGroup
 * (which uses absolute inset-0) a positioning context. Explicit
 * touchAction lets the strip's native horizontal scroll through. */
function MobileExpandedGroupShell() {
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  if (!expandedGroupKey) return null;
  return (
    <div
      className="fixed inset-0 top-12 z-20"
      style={{ touchAction: "pan-x" }}
    >
      <ExpandedGroup />
    </div>
  );
}
