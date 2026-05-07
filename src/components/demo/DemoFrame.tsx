"use client";

import { useEffect } from "react";

/**
 * Wrapper for any /showcase/* demo route. Strips the chrome a
 * recording shouldn't see:
 *
 *   - native cursor (already off via globals.css `pointer: fine`)
 *   - custom black-ball cursor (CustomCursor checks for the
 *     `.demo-mode` body class and skips rendering)
 *   - scrollbars (overflow:hidden on body)
 *   - browser focus rings (outline:none on the wrapper)
 *
 * Sets `data-demo` on the body so any other component (e.g. a
 * future debug overlay) can opt out by checking for that flag.
 *
 * Site chrome (TopBar, LeftToolbar) is NOT removed here — each
 * demo page composes whatever subset it wants. Most won't render
 * those components at all.
 */
export function DemoFrame({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const body = document.body;
    body.classList.add("demo-mode");
    body.dataset.demo = "true";
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.classList.remove("demo-mode");
      delete body.dataset.demo;
      body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        outline: "none",
        background: "var(--color-canvas, #fff)",
      }}
    >
      {children}
    </div>
  );
}
