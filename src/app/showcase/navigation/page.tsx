"use client";

import { useEffect } from "react";
import { AutoPilotNav } from "@/components/AutoPilotNav";
import { GroupViewControls } from "@/components/GroupViewControls";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Hidden showcase route demoing the works-index drawer + camera
 * navigation. Mirrors the home page chrome but mounts AutoPilotNav,
 * which opens the index, parks the camera at Beauty is the Best
 * Defense, and cycles through three projects on a continuous loop.
 *
 * Recording target: capture from one peak Beauty linger to the
 * next for a seamless ~22 s ambient demo of the index nav.
 */
export default function ShowcaseNavigationPage() {
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
      <AutoPilotNav />
    </>
  );
}
