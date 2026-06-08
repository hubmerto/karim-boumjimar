import { useEffect, useRef, type RefObject } from "react";

/**
 * Hand-rolled focus trap for modal dialogs/overlays (no dependency).
 *
 * When `active` becomes true:
 *   - captures the currently-focused element (the trigger),
 *   - moves focus into the container (first focusable, else the
 *     container itself with a temporary tabindex),
 *   - traps Tab / Shift+Tab so focus cycles within the container.
 * When `active` becomes false (or the component unmounts):
 *   - restores focus to the captured trigger.
 *
 * Pass a ref to the dialog's outer element and a boolean that is true
 * only while the dialog is genuinely MODAL (blocking the background).
 * For non-modal states (e.g. a peek bottom-sheet that leaves the
 * canvas interactive), pass `active = false` so focus is NOT trapped.
 *
 * Tab handling is bound on the document in the CAPTURE phase so it
 * runs regardless of where focus currently sits (including if focus
 * has escaped to the background, which we then pull back in).
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
].join(",");

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember what to restore focus to on close.
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        // visible + actually focusable (skip display:none / detached)
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === container,
      );

    // Move focus in. If the dialog has no focusable children, make the
    // container itself focusable so SR focus lands inside it.
    let addedTabIndex = false;
    const first = getFocusable()[0];
    if (first) {
      first.focus({ preventScroll: true });
    } else {
      if (!container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
        addedTabIndex = true;
      }
      container.focus({ preventScroll: true });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const c = containerRef.current;
      if (!c) return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        c.focus({ preventScroll: true });
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      const inside = activeEl ? c.contains(activeEl) : false;
      if (e.shiftKey) {
        if (!inside || activeEl === firstEl) {
          e.preventDefault();
          lastEl.focus({ preventScroll: true });
        }
      } else {
        if (!inside || activeEl === lastEl) {
          e.preventDefault();
          firstEl.focus({ preventScroll: true });
        }
      }
    }

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (addedTabIndex) container.removeAttribute("tabindex");
      const trigger = triggerRef.current;
      triggerRef.current = null;
      // Restore focus only if the trigger is still in the DOM.
      if (trigger && document.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}
