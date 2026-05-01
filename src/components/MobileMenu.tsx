"use client";

import { useEffect } from "react";
import { ARTIST_NAME, CONTACT } from "@/data/bio";
import { useSelection, type View } from "@/lib/store";

const ITEMS: { key: View; label: string }[] = [
  { key: "exhibitions", label: "Exhibitions" },
  { key: "news", label: "News" },
  { key: "bio", label: "Bio" },
  { key: "about", label: "About" },
  { key: "grant", label: "Grant" },
];

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 top-12 z-40 bg-canvas md:hidden"
      role="dialog"
      aria-label="Sections"
    >
      <div className="flex h-full flex-col">
        <ul className="flex-1 overflow-y-auto py-4">
          <li>
            <button
              type="button"
              onClick={() => {
                setIndexOpen(true);
                onClose();
              }}
              className="flex w-full items-center justify-between border-b border-line px-6 py-4 text-left text-[18px] text-ink"
            >
              <span>Index</span>
            </button>
          </li>
          {ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => {
                    setView(item.key);
                    onClose();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center justify-between px-6 py-4 text-left text-[18px] ${
                    active ? "text-ink" : "text-ink"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="italic text-[10px] uppercase tracking-[0.1em] text-mute">
                      current
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1 border-t border-line px-6 py-5 text-[12px] text-mute">
          <div>{ARTIST_NAME}</div>
          <a href={`mailto:${CONTACT.email}`} className="block hover:text-ink">
            {CONTACT.email}
          </a>
          <a
            href={CONTACT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-ink"
          >
            {CONTACT.instagram}
          </a>
        </div>
      </div>
    </div>
  );
}
