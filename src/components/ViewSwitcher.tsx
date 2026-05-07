"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { CanvasPixi } from "@/components/CanvasPixi";
import { ExpandedGroup } from "@/components/ExpandedGroup";
import { ProjectPanel } from "@/components/ProjectPanel";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { GrantView } from "@/components/views/GrantView";
import { NewsView } from "@/components/views/NewsView";
import { useSelection } from "@/lib/store";

// Must outlive ExpandedGroup's TRANSITION_MS (2400) + close timeout
// (80) + a comfort buffer so the FLIP-close finishes before the
// shell unmounts the gallery underneath it. Bumped from 1700 to
// 2600 when TRANSITION_MS was raised — at the old value the mobile
// shell tore down ~1 s before the genie effect finished, causing
// photos to vanish into white frames mid-animation.
const MOBILE_GALLERY_UNMOUNT_DELAY_MS = 2600;

export function ViewSwitcher() {
  const view = useSelection((s) => s.view);
  // Mobile gets the WebGL canvas (Pixi) — the DOM canvas with 123
  // tiles + transforms crashes iOS Safari's compositor. Desktop
  // keeps the DOM canvas because its dispersion / hover / outline
  // affordances are tuned to that implementation.
  //
  // We MUST NOT briefly mount Canvas (DOM) on a mobile client —
  // even a few hundred ms of it can crash iOS Safari before useEffect
  // runs. We ALSO can't lazy-init from matchMedia in useState because
  // that produces different initial state on server (false) vs client
  // (true on a mobile viewport), which surfaces as a hydration
  // mismatch and forces React to regenerate the tree (visible without
  // a splash to mask it, as on /showcase/mobile).
  //
  // Solution: start with `null` on both server and client (matching
  // initial render), then resolve the viewport in useLayoutEffect
  // before paint. The window between hydration and the layout effect
  // is one render cycle — Canvas is never mounted on a mobile client
  // because we render `null` until the viewport is known.
  const [mobile, setMobile] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Render nothing until the viewport is resolved on the client
  // (one render cycle after hydration). Avoids the hydration
  // mismatch that would otherwise fire on mobile clients.
  if (mobile === null) return null;

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
