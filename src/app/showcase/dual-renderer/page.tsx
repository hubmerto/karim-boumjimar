"use client";

import { useEffect, useState } from "react";
import { DemoFrame } from "@/components/demo/DemoFrame";

/**
 * Side-by-side comparison of the two production renderers — DOM
 * canvas (left, 1280 × 800) and WebGL Pixi (right, 393 × 852).
 *
 * Both iframes load /showcase/dispersion. ViewSwitcher inside each
 * iframe reads the iframe's own viewport via matchMedia and picks
 * the right branch — no flag plumbing needed; the iframe size IS
 * the signal.
 *
 * Synchronisation is approximate. Each iframe runs its own
 * autopilot loop with the same timing, so they drift by a few
 * dozen ms over a cycle. Acceptable for a comparison recording —
 * if exact phase-lock is needed, plumb BroadcastChannel between
 * the parent and each iframe.
 *
 * Labels: pass `?labels=1` to render small "DOM" and "WEBGL"
 * captions under each iframe. Default no labels — recordings
 * intended to be unannotated.
 */
export default function ShowcaseDualRendererPage() {
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowLabels(
      new URLSearchParams(window.location.search).get("labels") === "1",
    );
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
          gap: 32,
          background: "#000",
          padding: 24,
        }}
      >
        <RendererFrame
          src="/showcase/dispersion"
          width={1280}
          height={800}
          label={showLabels ? "DOM" : null}
        />
        <RendererFrame
          src="/showcase/dispersion"
          width={393}
          height={852}
          label={showLabels ? "WEBGL" : null}
        />
      </div>
    </DemoFrame>
  );
}

function RendererFrame({
  src,
  width,
  height,
  label,
}: {
  src: string;
  width: number;
  height: number;
  label: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <iframe
        src={src}
        width={width}
        height={height}
        style={{
          border: "none",
          display: "block",
          background: "#fff",
        }}
        // Sandboxing isn't needed (same origin) but the iframe
        // doesn't need to navigate or run plugins.
        sandbox="allow-scripts allow-same-origin"
      />
      {label ? (
        <div
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "#888",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
