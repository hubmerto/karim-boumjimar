"use client";

import Link from "next/link";
import { useSelection, type View } from "@/lib/store";

const ITEMS: { key: View; label: string; href: string }[] = [
  { key: "exhibitions", label: "Exhibitions", href: "/" },
  { key: "news", label: "News", href: "/news" },
  { key: "bio", label: "Bio", href: "/bio" },
  { key: "about", label: "About", href: "/about" },
  { key: "grant", label: "Grant", href: "/grant" },
];

export function LeftToolbar() {
  const view = useSelection((s) => s.view);
  const condensed = useSelection((s) => !!(s.selectedId || s.selectedGroupKey));
  const deselect = useSelection((s) => s.deselect);
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);

  return (
    <>
      {/* Re-open handle, only visible when condensed. Clicking expands the toolbar. */}
      <button
        type="button"
        onClick={deselect}
        aria-label="Show sections"
        title="Show sections"
        className={`fixed left-0 top-12 bottom-0 z-30 hidden w-6 items-center justify-center border-r border-line bg-canvas text-mute hover:text-ink md:flex ${
          condensed ? "opacity-100" : "pointer-events-none opacity-0"
        } transition-opacity duration-200`}
      >
        <span className="text-[14px]">›</span>
      </button>

      <nav
        aria-label="Sections"
        className={`fixed left-0 top-12 bottom-0 z-20 hidden w-[200px] flex-col justify-between border-r border-line bg-canvas transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] md:flex ${
          condensed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => setIndexOpen(!indexOpen)}
            aria-haspopup="dialog"
            aria-expanded={indexOpen}
            className="flex w-full items-center border-b border-line px-6 py-3 text-left text-[13px] text-ink hover:text-mute"
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
                    className={`flex w-full items-center gap-3 px-6 py-3 text-left text-[13px] ${
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
        <div className="px-6 py-5 text-[11px] text-mute">
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
