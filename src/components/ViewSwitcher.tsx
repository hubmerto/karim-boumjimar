"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@/components/Canvas";
import { CanvasPixi } from "@/components/CanvasPixi";
import { RightStack } from "@/components/RightStack";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { GrantView } from "@/components/views/GrantView";
import { NewsView } from "@/components/views/NewsView";
import { useSelection } from "@/lib/store";

export function ViewSwitcher() {
  const view = useSelection((s) => s.view);
  // Mobile gets the WebGL canvas (Pixi) — the DOM canvas with 123
  // tiles + transforms crashes iOS Safari's compositor. Desktop
  // keeps the DOM canvas because its dispersion / hover / outline
  // affordances are tuned to that implementation.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (view === "exhibitions") {
    return mobile ? (
      <CanvasPixi />
    ) : (
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
