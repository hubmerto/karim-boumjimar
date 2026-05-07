"use client";

if (typeof window !== "undefined") {
  (window as { __FORCE_MOBILE__?: boolean }).__FORCE_MOBILE__ = true;
  (window as { __FAST_INTRO__?: boolean }).__FAST_INTRO__ = true;
}

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

const PROJECT_KEY = "Symbiosis (MFA)|2025";

export default function ShowcaseMobileSheetPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const setInspectorSheetSnap = useSelection((s) => s.setInspectorSheetSnap);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(4000);

    await wait(800);

    navigateToGroup(PROJECT_KEY);
    await wait(5000);

    setInspectorSheetSnap("peek");
    await wait(1000);

    setInspectorSheetSnap("full");
    await wait(2500);

    setInspectorSheetSnap("peek");
    await wait(1500);

    setInspectorSheetSnap(null);
    resetToOverview();
    await wait(5000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <InspectorSheet />
    </DemoFrame>
  );
}
