"use client";

import { useEffect } from "react";
import { AutoPilotTornado } from "@/components/AutoPilotTornado";
import { GroupViewControls } from "@/components/GroupViewControls";
import { Index } from "@/components/Index";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Hidden showcase route that loops a tornado-style swirl of every
 * canvas tile. Cycle: diamond at rest (2 s) → swirl (3 s, ending
 * exactly back at the diamond) → loop. The loop is naturally
 * seamless because swirl translate / rotate both reach 0 at the
 * end, so frame N+1 of the recording matches frame 0.
 *
 * Desktop only — the swirl manipulates DOM tile transforms via
 * the individual `translate` / `rotate` CSS properties, which the
 * mobile WebGL Pixi canvas doesn't expose.
 */
export default function ShowcaseTornadoPage() {
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
      <AutoPilotTornado />
    </>
  );
}
