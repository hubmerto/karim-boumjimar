"use client";

import { useEffect } from "react";
import { AutoPilot } from "@/components/AutoPilot";
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
 * Hidden showcase route. Mirrors the home page (TopBar +
 * LeftToolbar + Canvas + ProjectPanel + Gallery) but with two
 * differences:
 *
 *   1. No <Splash />. The auto-pilot manually flips splashGone
 *      so the canvas's intro reveal animation still fires; we
 *      just don't want the recording to start with a black logo.
 *   2. <AutoPilot /> drives the canvas through a looping demo
 *      sequence — selectGroup → expandGroup → collapseGroup →
 *      resetToOverview, repeating across a curated project list.
 *
 * Designed for screen-recording into a video loop. Park the
 * cursor off-screen, hit record, capture one full cycle (~17s
 * per project, ~24s for the first cycle that includes the
 * intro reveal), and you have a seamless ambient demo of the
 * site's motion language.
 */
export default function ShowcasePage() {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const setView = useSelection((s) => s.setView);

  // Same view-reset hook as the home page — guarantees the
  // canvas surface is mounted regardless of whatever view the
  // store was left on by a previous navigation.
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
      {/* forcePlay so the logo intro fires on every showcase visit
          regardless of the per-tab sessionStorage gate. */}
      <Splash forcePlay />
      <PreloadGalleryImages />
      <AutoPilot />
    </>
  );
}
