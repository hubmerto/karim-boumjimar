"use client";

import { useEffect } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { ProjectPanel } from "@/components/ProjectPanel";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useSelection } from "@/lib/store";

/**
 * Single gesture: select cluster → panel slides in → close →
 * panel slides out. Camera stays put (showProjectPanel skips
 * the nav). End state matches start.
 *
 * Pre-positioned by flying once to the cluster on first cycle,
 * then loops indefinitely with the panel toggling.
 */

const PROJECT_KEY = "Bodies Under Construction|2026";

export default function ShowcaseSelectPage() {
  const setSplashGone = useSelection((s) => s.setSplashGone);
  const setView = useSelection((s) => s.setView);
  const navigateToGroup = useSelection((s) => s.navigateToGroup);
  const showProjectPanel = useSelection((s) => s.showProjectPanel);
  const closeProject = useSelection((s) => s.closeProject);

  useEffect(() => {
    setSplashGone(true);
    setView("exhibitions");
  }, [setSplashGone, setView]);

  useAutopilot(async ({ wait, isInitial }) => {
    if (isInitial) {
      // Pre-position: fly to cluster once. Wait through the
      // intro reveal first so the camera trajectory plays clean.
      await wait(6500);
      navigateToGroup(PROJECT_KEY);
      await wait(5000);
      // After the nav, selection is set + panel is in. Close it
      // so the loop's start state is "cluster, no panel".
      closeProject();
      await wait(700);
    }

    // 0.0s — hold spread (no panel).
    await wait(500);

    // 0.5s — show panel (slides in over ~400 ms).
    showProjectPanel(PROJECT_KEY);
    await wait(500);

    // 1.0s — hold with panel.
    await wait(2500);

    // 3.5s — close panel (slides out).
    closeProject();
    await wait(500);

    // 4.0s — hold spread (no panel) until 6.0s.
    await wait(2000);
  });

  return (
    <DemoFrame>
      <ViewSwitcher />
      <div className="fixed right-0 top-0 bottom-0 z-10 flex">
        <ProjectPanel />
      </div>
    </DemoFrame>
  );
}
