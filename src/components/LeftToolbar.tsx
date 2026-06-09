"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSelection, type View } from "@/lib/store";

const ITEMS: { key: View; label: string; href: string }[] = [
  { key: "exhibitions", label: "Exhibitions", href: "/" },
  { key: "news", label: "News", href: "/news" },
  { key: "bio", label: "Bio", href: "/bio" },
  { key: "contact", label: "Contact", href: "/contact" },
  { key: "grant", label: "Grant", href: "/grant" },
];

// Routes that render no canvas. The Index is a canvas-navigation feature,
// so opening it from one of these should take the user to the overview
// (where the index belongs) rather than floating the drawer over the text.
const TEXT_ROUTES = new Set([
  "/bio",
  "/contact",
  "/news",
  "/grant",
  "/imprint",
  "/privacy",
]);

export function LeftToolbar() {
  const view = useSelection((s) => s.view);
  // Hide the toolbar based on the user-controlled flag, not the raw
  // selection state. Closing the right-side panels (×, Esc, zoom-out,
  // canvas bg click) keeps the toolbar slid off until the user
  // explicitly opens it via the › handle. On non-canvas routes the
  // flag is forcibly ignored: there's nothing to "select" there, so
  // the nav should always be visible.
  const toolbarHidden = useSelection((s) => s.toolbarHidden);
  const hidden = view === "exhibitions" && toolbarHidden;
  const showToolbar = useSelection((s) => s.showToolbar);
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* Re-open handle, only visible when the toolbar is slid off.
          Clicking brings the nav back. The strip itself is transparent
          (no bg / border) so it never reads as a white bar over the
          edge-to-edge canvas — only the small chevron chip is visible.
          Full height keeps it an easy target; the chip is centered for
          legibility over any image behind it. */}
      <button
        type="button"
        onClick={showToolbar}
        aria-label="Show sections"
        title="Show sections"
        className={`fixed left-0 top-12 bottom-0 z-30 hidden w-6 items-center justify-center md:flex ${
          hidden ? "opacity-100" : "pointer-events-none opacity-0"
        } transition-opacity duration-200`}
      >
        <span className="flex h-12 w-5 items-center justify-center rounded-r-md border border-l-0 border-line bg-canvas/85 text-caption text-mute shadow-sm backdrop-blur-sm">
          ›
        </span>
      </button>

      <nav
        aria-label="Sections"
        className={`fixed left-0 top-12 bottom-0 z-20 hidden w-[200px] flex-col justify-between border-r border-line bg-canvas transition-transform duration-[2000ms] ease-[cubic-bezier(0.32,0.72,0,1)] md:flex ${
          hidden ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => {
              const p = pathname.replace(/\/+$/, "") || "/";
              if (TEXT_ROUTES.has(p)) {
                // No canvas on text routes — go to the overview and open
                // the Index there instead of covering the text.
                router.push("/");
                setIndexOpen(true);
              } else {
                setIndexOpen(!indexOpen);
              }
            }}
            aria-haspopup="dialog"
            aria-expanded={indexOpen}
            className="flex w-full items-center border-b border-line px-6 py-3 text-left text-ui text-ink hover:text-mute"
          >
            <span>Index</span>
          </button>
          <ul className="py-4">
            {ITEMS.map((item) => {
              const active = view === item.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 px-6 py-3 text-left text-ui ${
                      active ? "text-ink" : "text-mute hover:text-ink"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-px w-3 ${active ? "bg-ink" : "bg-transparent"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="px-6 py-5 text-label text-mute">
          <div className="flex gap-3">
            <Link href="/imprint" className="hover:text-ink">
              Imprint
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
