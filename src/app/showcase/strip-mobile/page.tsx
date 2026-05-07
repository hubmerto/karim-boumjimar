"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { InspectorSheet } from "@/components/InspectorSheet";
import { PreloadGalleryImages } from "@/components/PreloadGalleryImages";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Same gesture as /showcase/strip-desktop, mobile renderer +
 * InspectorSheet visible.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";
const WORK_ID = "bodies-04";

export default function ShowcaseStripMobilePage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const selectWork = useSelection((s) => s.selectWork);
  const expandGroup = useSelection((s) => s.expandGroup);
  const collapseGroup = useSelection((s) => s.collapseGroup);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      await wait(4000);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
      selectWork(WORK_ID, PROJECT_KEY);
    }

    await wait(500);
    expandGroup(PROJECT_KEY);
    await wait(800);
    await wait(4000);
    collapseGroup();
    await wait(800);
    await wait(2900);
  });

  return (
    <DemoFrame>
      <ViewSwitcher />
      <InspectorSheet />
      <PreloadGalleryImages />
    </DemoFrame>
  );
}
