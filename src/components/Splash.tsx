"use client";

import { useEffect, useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { asset } from "@/lib/paths";
import { useSelection } from "@/lib/store";

// Longer hold than the bare minimum: the canvas is still mounting +
// loading textures behind the splash. A fuller 2.2s preload window
// means by the time the splash fades, sprites are textured and
// ready to start their staggered fade-in alongside the camera zoom
// (matched to the ~6s reveal — see tileFadeTiming + initial-zoom
// in CanvasPixi).
const HOLD_MS = 2200;
const FADE_MS = 1000;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const SESSION_KEY = "kbz_splash_seen";

export function Splash({ forcePlay = false }: { forcePlay?: boolean } = {}) {
  // Skip the splash on any reload within the same tab. Mobile browsers
  // sometimes reload the page (back-forward cache, address-bar gesture,
  // memory pressure); replaying the splash mid-session is jarring.
  // The /showcase routes pass forcePlay so the splash always animates
  // — recording demos need the logo intro on every reload.
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const setSplashGone = useSelection((s) => s.setSplashGone);

  useEffect(() => {
    if (
      !forcePlay &&
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY)
    ) {
      setPhase("gone");
      setSplashGone(true);
      return;
    }
    const t1 = setTimeout(() => setPhase("out"), HOLD_MS);
    const t2 = setTimeout(() => {
      setPhase("gone");
      setSplashGone(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Private mode or quota; the next reload will just replay the splash.
      }
    }, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [setSplashGone, forcePlay]);

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
