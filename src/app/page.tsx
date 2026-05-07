"use client";

import { useEffect } from "react";
import { CrashOverlay } from "@/components/CrashOverlay";
import { GroupViewControls } from "@/components/GroupViewControls";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Single render path for desktop and mobile. The chrome adapts:
 *  - TopBar shows the hamburger menu on phone widths (< md)
 *  - LeftToolbar is hidden on mobile via Tailwind's `md:`
 *  - InspectorSheet is the mobile-only bottom sheet
 *  - ViewSwitcher swaps Canvas (DOM, desktop) for CanvasPixi (WebGL,
 *    mobile) inside its own component, so the surrounding tree
 *    doesn't have to care which renderer is in use.
 */
export default function Home() {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const setView = useSelection((s) => s.setView);

  // Reset the store's view to "exhibitions" whenever the home
  // page mounts. Without this, navigating from /about (or any
  // other text route) back to "/" via the LeftToolbar's
  // Exhibitions link would land here with view still set to
  // whatever it was before, and ViewSwitcher would keep showing
  // the text view instead of the canvas.
  useEffect(() => {
    setView("exhibitions");
  }, [setView]);

  return (
    <>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <GroupViewControls />
      <InspectorSheet />
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
      <Splash />
      <CrashOverlay />
      {/* Side-effect: warms the gallery image cache as soon as a
          group is pinned, so the FLIP open is smooth instead of
          waiting on a network fetch. */}
      <PreloadGalleryImages />
    </>
  );
}
