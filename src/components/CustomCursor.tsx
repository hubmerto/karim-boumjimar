"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Black-ball cursor that tracks the mouse on devices with a fine
 * pointer (mouse / trackpad). On touch the OS cursor doesn't exist,
 * so this whole thing renders nothing — guard via `pointer: fine`
 * media query at mount + `md:block` on the element.
 *
 * The cursor grows when hovering a clickable element so the user
 * still gets the affordance feedback that the OS pointer normally
 * provides. We hide the native cursor in `globals.css` (with
 * !important to beat Tailwind's `cursor-pointer` on buttons).
 *
 * Mouse position is written via `transform: translate3d(...)` per
 * frame — direct DOM mutation, no React state writes per pixel.
 * The hover state IS React state because it transitions a few
 * times per second at most.
 */
export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  // Skip rendering when a /showcase/* demo route has marked the
  // body with .demo-mode (set by <DemoFrame />). Recordings should
  // be free of UI affordances; the production cursor would otherwise
  // sit centred over the canvas the moment the user moves their
  // mouse.
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () =>
      setDemoMode(document.body.classList.contains("demo-mode"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Don't initialize on touch-only devices.
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    function move(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!visibleRef.current) {
        setVisible(true);
        visibleRef.current = true;
      }
    }
    function over(e: MouseEvent) {
      const t = e.target as Element | null;
      if (!t) return;
      const interactive = !!t.closest(
        'a, button, [role="button"], [data-work-id], input, textarea, select, label[for]',
      );
      setHovering(interactive);
    }
    function leave() {
      setVisible(false);
      visibleRef.current = false;
    }

    const visibleRef = { current: false };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    document.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  if (demoMode) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] hidden rounded-full bg-ink md:block"
      style={{
        width: hovering ? 28 : 10,
        height: hovering ? 28 : 10,
        marginLeft: hovering ? -14 : -5,
        marginTop: hovering ? -14 : -5,
        opacity: visible ? 1 : 0,
        transition:
          "width 180ms cubic-bezier(0.32, 0.72, 0, 1), height 180ms cubic-bezier(0.32, 0.72, 0, 1), margin 180ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms",
        // mix-blend-mode keeps the ball visible on dark images too
        // — black on light areas reads black, on dark images it
        // inverts to grey/white.
        mixBlendMode: "difference",
        backgroundColor: "white",
      }}
    />
  );
}
