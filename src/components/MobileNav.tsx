"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AboutView } from "@/components/views/AboutView";
import { BioView } from "@/components/views/BioView";
import { GrantView } from "@/components/views/GrantView";
import { Index } from "@/components/Index";
import { NewsView } from "@/components/views/NewsView";
import { ARTIST_NAME, CONTACT } from "@/data/bio";
import { asset } from "@/lib/paths";
import { useSelection, type View } from "@/lib/store";

/**
 * Mobile-only chrome:
 *  - Top header bar (fixed, full-width): logo centered, two-line
 *    menu icon in the right corner.
 *  - Tap menu icon -> full-screen menu overlay (centered, bold,
 *    same items as the desktop LeftToolbar plus Index, plus the
 *    desktop's footer info pinned at the bottom).
 *  - Selecting Exhibitions returns to the canvas.
 *  - Selecting Index opens the works-index drawer.
 *  - Selecting any other item shows that TextView.
 *
 * The header is hidden whenever a project gallery is open (the
 * gallery has its own header) or a text view is up (the X handles
 * closing it).
 */
type MenuItem = { key: View | "index"; label: string };

// Match the desktop LeftToolbar order, with Index pinned to the top
// (mirrors the desktop layout where Index is its own button above the
// section list).
const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  { key: "index", label: "Index" },
  { key: "exhibitions", label: "Exhibitions" },
  { key: "news", label: "News" },
  { key: "bio", label: "Bio" },
  { key: "about", label: "About" },
  { key: "grant", label: "Grant" },
];

export function MobileNav() {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const galleryOpen = useSelection((s) => s.openProjectKey != null);
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const [menuOpen, setMenuOpen] = useState(false);

  const viewOpen = view !== "exhibitions";
  // Hide the entire top bar when a gallery, a text view, OR the
  // works index is up. Each of those has its own controls.
  const headerHidden = viewOpen || galleryOpen || indexOpen;

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

  function pickItem(key: View | "index") {
    setMenuOpen(false);
    if (key === "index") {
      // Index opens its own drawer instead of swapping the view.
      setIndexOpen(true);
      return;
    }
    setView(key);
  }

  return (
    <>
      {/* Fixed top header bar — logo centered, menu button right. */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
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
              height: 32,
              width: "auto",
              maxWidth: "70vw",
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
            top: 14,
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
          {/* Same header layout as the canvas but with X instead of menu. */}
          <header
            style={{
              height: 64,
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
                height: 32,
                width: "auto",
                maxWidth: "70vw",
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
                top: 14,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                appearance: "none",
                background: "transparent",
                border: 0,
                color: "#111",
                fontSize: 26,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </header>

          {/* Menu items — centered, bold, big tap targets. */}
          <nav
            aria-label="Sections"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              gap: 4,
            }}
          >
            {MENU_ITEMS.map((item) => (
              <MenuLink
                key={item.key}
                label={item.label}
                onClick={() => pickItem(item.key)}
              />
            ))}
          </nav>

          {/* Footer — artist info + contact + legal. */}
          <footer
            style={{
              padding: "20px 24px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#999",
              lineHeight: 1.5,
              flexShrink: 0,
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ color: "#111" }}>{ARTIST_NAME}</div>
            <a
              href={`mailto:${CONTACT.email}`}
              style={{ color: "#999", textDecoration: "none" }}
            >
              {CONTACT.email}
            </a>
            <a
              href={CONTACT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#999", textDecoration: "none" }}
            >
              {CONTACT.instagram}
            </a>
            <div style={{ display: "flex", gap: 16, paddingTop: 6 }}>
              <Link
                href="/imprint"
                onClick={() => setMenuOpen(false)}
                style={{ color: "#999", textDecoration: "none" }}
              >
                Imprint
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMenuOpen(false)}
                style={{ color: "#999", textDecoration: "none" }}
              >
                Privacy
              </Link>
            </div>
          </footer>
        </div>
      ) : null}

      {/* Active text view + close button. */}
      {viewOpen ? (
        <>
          {view === "bio" ? <BioView /> : null}
          {view === "about" ? <AboutView /> : null}
          {view === "news" ? <NewsView /> : null}
          {view === "grant" ? <GrantView /> : null}
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

      {/* Works index drawer (shared with desktop). */}
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
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
        padding: "10px 0",
        textAlign: "center",
        fontSize: 36,
        lineHeight: 1.1,
        color: "#111",
        cursor: "pointer",
        font: "inherit",
        fontWeight: 700,
        letterSpacing: "-0.01em",
      }}
    >
      {label}
    </button>
  );
}
