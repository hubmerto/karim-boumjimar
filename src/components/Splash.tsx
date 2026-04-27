"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";

const FILL_MS = 1400;
const FADE_MS = 400;

export function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), FILL_MS);
    const t2 = setTimeout(() => setPhase("gone"), FILL_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      <div className="text-[15px] text-ink">{ARTIST_NAME}</div>
      <div
        className="mt-4 h-px w-[160px] overflow-hidden bg-line"
        role="progressbar"
        aria-label="Loading"
      >
        <div
          className="h-full bg-ink"
          style={{
            width: "100%",
            transformOrigin: "left center",
            animation: `splash-fill ${FILL_MS}ms cubic-bezier(0.32, 0.72, 0, 1) forwards`,
          }}
        />
      </div>
    </div>
  );
}
