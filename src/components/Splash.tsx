"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { asset } from "@/lib/paths";

const HOLD_MS = 1100;
const FADE_MS = 400;

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

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset("/logo.svg")}
        alt={ARTIST_NAME}
        draggable={false}
        className="block h-10 w-auto max-w-[70vw] select-none md:h-14"
      />
    </div>
  );
}
