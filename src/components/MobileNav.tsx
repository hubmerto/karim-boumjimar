"use client";

import { useEffect, useState } from "react";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { NewsView } from "@/components/views/NewsView";
import { asset } from "@/lib/paths";
import { useSelection, type View } from "@/lib/store";

/**
 * Mobile-only chrome:
 *  - Top header bar (fixed, full-width): logo centered, menu icon
 *    in the right corner.
 *  - Tap the menu → full-screen menu overlay with the navigation
 *    items (Bio / About / News).
 *  - Pick a menu item → corresponding TextView covers everything.
 *  - Each text view has a close X to return to the canvas.
 *
 * The whole header is hidden when a project gallery is open (the
 * gallery has its own header) and when a text view is up (the X
 * handles closing it).
 */
type MenuItem = {
  label: string;
  view: Exclude<View, "exhibitions" | "grant">;
};

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  { label: "Bio", view: "bio" },
  { label: "About", view: "about" },
  { label: "News", view: "news" },
];

export function MobileNav() {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const galleryOpen = useSelection((s) => s.openProjectKey != null);
  const [menuOpen, setMenuOpen] = useState(false);

  const viewOpen = view !== "exhibitions";
  // Hide the entire top bar when a gallery or a text view is up.
  // The gallery has its own controls; the text view has its own X.
  const headerHidden = viewOpen || galleryOpen;

  // Esc closes both the menu overlay and any open text view.
  useEffect(() => {
    if (!menuOpen && !viewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else if (viewOpen) setView("exhibitions");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, viewOpen, setView]);

  // Lock body scroll while the menu is up.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      {/* Fixed top header bar — logo centered, menu button right. */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 52,
          zIndex: 30,
          display: headerHidden ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 12px",
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0))",
          pointerEvents: "none",
        }}
      >
        {/* Logo centered. Tappable, returns to canvas if a view is open. */}
        <button
          type="button"
          aria-label="Karim Boumjimar"
          onClick={() => setView("exhibitions")}
          style={{
            appearance: "none",
            background: "transparent",
            border: 0,
            padding: "8px 12px",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/logo.svg")}
            alt="Karim Boumjimar"
            draggable={false}
            style={{
              display: "block",
              height: 18,
              width: "auto",
              maxWidth: "60vw",
              userSelect: "none",
            }}
          />
        </button>

        {/* Menu icon in the right corner. */}
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            width: 36,
            height: 36,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            appearance: "none",
            background: "transparent",
            border: 0,
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          {/* Two-line minimalist hamburger (matches the brutalist
              hairline aesthetic). */}
          <span
            aria-hidden
            style={{ display: "block", width: 22, height: 1, background: "#111" }}
          />
          <span
            aria-hidden
            style={{ display: "block", width: 22, height: 1, background: "#111" }}
          />
        </button>
      </header>

      {/* Full-screen menu overlay. */}
      {menuOpen ? (
        <div
          role="dialog"
          aria-label="Menu"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Same header layout as the canvas, but with an X close
              button instead of the menu icon. */}
          <header
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 12px",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/logo.svg")}
              alt="Karim Boumjimar"
              draggable={false}
              style={{
                display: "block",
                height: 18,
                width: "auto",
                maxWidth: "60vw",
                userSelect: "none",
              }}
            />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                appearance: "none",
                background: "transparent",
                border: 0,
                color: "#111",
                fontSize: 22,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </header>

          {/* Menu items. Stacked vertically, big tap targets. */}
          <nav
            aria-label="Sections"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "0 32px",
              gap: 8,
            }}
          >
            {/* Works = back to the canvas. */}
            <MenuLink
              label="Works"
              onClick={() => {
                setView("exhibitions");
                setMenuOpen(false);
              }}
            />
            {MENU_ITEMS.map((item) => (
              <MenuLink
                key={item.view}
                label={item.label}
                onClick={() => {
                  setView(item.view);
                  setMenuOpen(false);
                }}
              />
            ))}
          </nav>
        </div>
      ) : null}

      {/* Active text view + close button. */}
      {viewOpen ? (
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
              right: 8,
              zIndex: 60,
              background: "transparent",
              border: 0,
              fontSize: 26,
              lineHeight: 1,
              color: "#111",
              cursor: "pointer",
              padding: "6px 10px",
            }}
          >
            ×
          </button>
        </>
      ) : null}
    </>
  );
}

function MenuLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        background: "transparent",
        border: 0,
        padding: "12px 0",
        textAlign: "left",
        fontSize: 32,
        lineHeight: 1.1,
        color: "#111",
        cursor: "pointer",
        font: "inherit",
        fontWeight: 400,
      }}
    >
      {label}
    </button>
  );
}
