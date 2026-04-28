"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { asset } from "@/lib/paths";

const HOLD_MS = 700;
const FADE_MS = 900;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), HOLD_MS);
    const t2 = setTimeout(() => setPhase("gone"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  const out = phase === "out";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas"
      style={{
        opacity: out ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ${EASE}`,
        pointerEvents: out ? "none" : "auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("/logo.svg")}
        alt={ARTIST_NAME}
        draggable={false}
        className="block h-10 w-auto max-w-[70vw] select-none md:h-14"
        style={{
          // Subtle dissolve forward as the splash fades.
          transform: out ? "scale(1.04)" : "scale(1)",
          transition: `transform ${FADE_MS}ms ${EASE}`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
