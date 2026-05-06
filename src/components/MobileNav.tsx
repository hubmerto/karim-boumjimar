"use client";

import { useEffect } from "react";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { NewsView } from "@/components/views/NewsView";
import { useSelection, type View } from "@/lib/store";

/**
 * Mobile-only nav. Three small italic text links in the top-right
 * (Bio, About, News) over the Pixi canvas. Tapping one swaps the
 * `view` in the store from "exhibitions" → that view, which makes
 * the corresponding TextView scaffold cover the canvas. A close X
 * appears top-right to return to the canvas.
 *
 * The links are hidden whenever a view is open (the X handles
 * navigation in that case), so we never show two competing nav
 * affordances at the same time.
 */
const LINKS: ReadonlyArray<{
  label: string;
  view: Exclude<View, "exhibitions" | "grant">;
}> = [
  { label: "Bio", view: "bio" },
  { label: "About", view: "about" },
  { label: "News", view: "news" },
];

export function MobileNav() {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const open = view !== "exhibitions";

  // Esc key closes the overlay (mostly for desktop ?pixi=1 testing —
  // mobile users hit the X).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setView("exhibitions");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setView]);

  return (
    <>
      {/* Tab links — visible over the canvas, hidden when a view is open. */}
      <nav
        aria-label="Sections"
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          zIndex: 30,
          display: open ? "none" : "flex",
          gap: 16,
          fontSize: 10,
          fontStyle: "italic",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#111",
          // Subtle white wash so the links stay readable when a tile
          // happens to sit underneath them.
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          padding: "6px 10px",
          borderRadius: 4,
        }}
      >
        {LINKS.map((link) => (
          <button
            key={link.view}
            type="button"
            onClick={() => setView(link.view)}
            style={{
              appearance: "none",
              background: "transparent",
              border: 0,
              padding: 0,
              color: "inherit",
              cursor: "pointer",
              font: "inherit",
              letterSpacing: "inherit",
              textTransform: "inherit",
              fontStyle: "inherit",
            }}
          >
            {link.label}
          </button>
        ))}
      </nav>

      {/* Overlay: full-screen view + close button. */}
      {open ? (
        <>
          {view === "bio" ? <BioView /> : null}
          {view === "about" ? <AboutView /> : null}
          {view === "news" ? <NewsView /> : null}
          <button
            type="button"
            onClick={() => setView("exhibitions")}
            aria-label="Close"
            style={{
              position: "fixed",
              top: 8,
              right: 12,
              zIndex: 60,
              background: "transparent",
              border: 0,
              fontSize: 26,
              lineHeight: 1,
              color: "#111",
              cursor: "pointer",
              padding: "6px 8px",
            }}
          >
            ×
          </button>
        </>
      ) : null}
    </>
  );
}
