"use client";

import { useSelection } from "@/lib/store";
import { Canvas } from "@/components/Canvas";
import { RightStack } from "@/components/RightStack";
import { BioView } from "@/components/views/BioView";
import { AboutView } from "@/components/views/AboutView";
import { NewsView } from "@/components/views/NewsView";
import { GrantView } from "@/components/views/GrantView";

export function ViewSwitcher() {
  const view = useSelection((s) => s.view);

  if (view === "exhibitions") {
    return (
      <>
        <Canvas />
        <RightStack />
      </>
    );
  }
  if (view === "bio") return <BioView />;
  if (view === "about") return <AboutView />;
  if (view === "news") return <NewsView />;
  if (view === "grant") return <GrantView />;
  return null;
}
