"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { CanvasPixi } from "@/components/CanvasPixi";
import { ExpandedGroup } from "@/components/ExpandedGroup";
import { ProjectPanel } from "@/components/ProjectPanel";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { GrantView } from "@/components/views/GrantView";
import { NewsView } from "@/components/views/NewsView";
import { useSelection } from "@/lib/store";

// Must outlive ExpandedGroup's TRANSITION_MS (1500) + close timeout
// (40) + a comfort buffer so the FLIP-close finishes before the
// shell unmounts the gallery underneath it.
const MOBILE_GALLERY_UNMOUNT_DELAY_MS = 1700;

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
        {/* Single right-side panel — work fields + project description
            in one stack. Replaces the previous Inspector + ProjectPanel
            split. */}
        <div className="fixed right-0 top-12 bottom-0 z-10 hidden md:flex">
          <ProjectPanel />
        </div>
      </>
    );
  }
  if (view === "bio") return <BioView />;
  if (view === "about") return <AboutView />;
  if (view === "news") return <NewsView />;
  if (view === "grant") return <GrantView />;
  return null;
}

/** Mobile-only positioning shell for ExpandedGroup. The shell sits
 * below the TopBar (top-12) and gives ExpandedGroup (which uses
 * absolute inset-0) a positioning context. Explicit touchAction
 * lets the strip's native horizontal scroll through.
 *
 * Mounting is gated on `expandedGroupKey` so the wrapper isn't
 * sitting over the canvas with `touchAction: pan-x` when idle —
 * that would block native pinch / pan on the Pixi canvas behind
 * it. But unmounting has to LAG the close: ExpandedGroup runs a
 * 1.5 s FLIP-close animation in its `phase: "closing"` state and
 * relies on staying mounted until that finishes. Tearing it down
 * the moment the store flips would skip the animation entirely
 * (and used to cause the gallery to just disappear into a white
 * frame on mobile). */
function MobileExpandedGroupShell() {
  const expandedGroupKey = useSelection((s) => s.expandedGroupKey);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (expandedGroupKey) {
      // Open: mount immediately, cancel any pending unmount from a
      // recent close.
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      return;
    }
    // Close: only schedule unmount if currently mounted.
    if (!mounted) return;
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, MOBILE_GALLERY_UNMOUNT_DELAY_MS);
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [expandedGroupKey, mounted]);

  if (!mounted) return null;
  return (
    <div
      className="fixed inset-0 top-12 z-20"
      style={{ touchAction: "pan-x" }}
    >
      <ExpandedGroup />
    </div>
  );
}
