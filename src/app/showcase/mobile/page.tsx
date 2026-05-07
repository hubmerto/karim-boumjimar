"use client";

// Set the fast-intro flag synchronously at module-load time so it's
// in place before any client component effects fire. CanvasPixi
// reads this lazily for both the camera reveal duration and the
// per-tile fade-in stagger; setting it after mount would be too
// late and the canvas would tween at production speed.
//
// The flag is per-tab. Navigating away leaves it set, but the
// production splash + intro reveal only fire once per session
// (gated on splashGone going false → true), so the leftover flag
// has no observable effect on / or any other route.
if (typeof window !== "undefined") {
  const w = window as {
    __FAST_INTRO__?: boolean;
    __FORCE_MOBILE__?: boolean;
  };
  w.__FAST_INTRO__ = true;
  // ViewSwitcher reads this and unconditionally renders the mobile
  // branch — WebGL Pixi canvas + InspectorSheet — so we don't have
  // to resize the browser to a phone width to record the mobile UX.
  w.__FORCE_MOBILE__ = true;
}

import { useEffect } from "react";
import { AutoPilotMobile } from "@/components/AutoPilotMobile";
import { GroupViewControls } from "@/components/GroupViewControls";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Hidden showcase surface for mobile screen-recording. Open at a
 * phone-width viewport (≤ 767 px or via Chrome DevTools mobile
 * emulation) so ViewSwitcher mounts the WebGL Pixi canvas — the
 * desktop DOM canvas is what loads at wider widths and won't
 * surface the InspectorSheet (it's md:hidden) or the mobile
 * compact tile layout.
 *
 * AutoPilotMobile drives the loop: fast diamond appearing
 * animation → tap Symbiosis → pull info tab up + down → open
 * gallery → scroll to end → close → tiles settle → reset to
 * diamond. White fades in at the very end so a recorded clip
 * loops cleanly when played back.
 */
export default function ShowcaseMobilePage() {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const setView = useSelection((s) => s.setView);

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
      <PreloadGalleryImages />
      <AutoPilotMobile />
    </>
  );
}
