"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { useAutopilot } from "@/components/demo/useAutopilot";
import { asset } from "@/lib/paths";

/**
 * Loops the wordmark treatment in isolation. Mirrors the
 * production splash logic (logo holds, fades out with a subtle
 * scale dissolve forward) but on a continuous loop with no
 * surrounding canvas — useful for branded social posts.
 *
 * If you want a different treatment (stroke-in, mask reveal,
 * etc.) the keyframes live entirely in this component — modify
 * here without touching <Splash /> in production.
 */

const FADE_IN_MS = 900;
const HOLD_MS = 2000;
const FADE_OUT_MS = 700;
const PAUSE_MS = 400; // blank between cycles for a clean loop seam

type Phase = "in" | "hold" | "out" | "blank";

export default function ShowcaseWordmarkPage() {
  const [phase, setPhase] = useState<Phase>("blank");

  useAutopilot(async ({ wait }) => {
    // 1. Fade in.
    setPhase("in");
    await wait(FADE_IN_MS);

    // 2. Hold solid.
    setPhase("hold");
    await wait(HOLD_MS);

    // 3. Fade out (slight scale forward).
    setPhase("out");
    await wait(FADE_OUT_MS);

    // 4. Blank between iterations — the loop seam.
    setPhase("blank");
    await wait(PAUSE_MS);
  });

  // Phase → opacity + transform mapping. Transitions are CSS so
  // the autopilot just bumps `phase`; the browser eases between.
  const opacity = phase === "hold" ? 1 : phase === "in" ? 1 : 0;
  const scale = phase === "out" ? 1.04 : 1;
  const transitionMs =
    phase === "in"
      ? FADE_IN_MS
      : phase === "out"
        ? FADE_OUT_MS
        : 0;

  // Disable the cursor + mark the body for the demo via DemoFrame.
  // Use the splash file directly — same SVG <Splash /> renders in
  // production, so the wordmark on the recording matches the live
  // brand exactly.
  useEffect(() => {
    document.body.style.background = "var(--color-canvas, #fff)";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  return (
    <DemoFrame>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-canvas, #fff)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/logo.svg")}
          alt={ARTIST_NAME}
          draggable={false}
          style={{
            display: "block",
            height: "min(56px, 8vw)",
            width: "auto",
            maxWidth: "70vw",
            opacity,
            transform: `scale(${scale})`,
            transition: `opacity ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${transitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            willChange: "transform, opacity",
          }}
        />
      </div>
    </DemoFrame>
  );
}
