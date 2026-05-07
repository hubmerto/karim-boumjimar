"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { LeftToolbar } from "@/components/LeftToolbar";
import { ProjectPanel } from "@/components/ProjectPanel";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Diamond → fly to cluster (panel slides in alongside camera) →
 * panel toggles out + back in → fly back to diamond. Each cycle
 * round-trips to the same diamond rest state.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcaseSelectPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const showProjectPanel = useSelection((s) => s.showProjectPanel);
  const closeProject = useSelection((s) => s.closeProject);
  const resetToOverview = useSelection((s) => s.resetToOverview);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) await wait(6500); // intro reveal

    // 1. Diamond at rest.
    await wait(800);

    // 2. Fly to cluster (camera tween + panel slides in).
    navigateToGroup(PROJECT_KEY);
    await wait(5000);

    // 3. Hold panel in.
    await wait(2000);

    // 4. Close panel.
    closeProject();
    await wait(800);

    // 5. Hold cluster, no panel.
    await wait(1200);

    // 6. Re-open panel (no camera nav this time — just the slide).
    showProjectPanel(PROJECT_KEY);
    await wait(800);

    // 7. Hold panel in.
    await wait(1500);

    // 8. Close panel one more time before flying back.
    closeProject();
    await wait(800);

    // 9. Reset to diamond — camera flies back AND tiles re-pack.
    //    1.5 s camera + 2.8 s tile re-bento = 4.3 s; wait 5 s.
    resetToOverview();
    await wait(5000);
  });

  return (
    <DemoFrame>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <div className="fixed right-0 top-12 bottom-0 z-10 flex">
        <ProjectPanel />
      </div>
    </DemoFrame>
  );
}
