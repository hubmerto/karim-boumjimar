"use client";

import { useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { MobileMenu } from "@/components/MobileMenu";
import { useSelection } from "@/lib/store";
import { asset } from "@/lib/paths";

export function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const setView = useSelection((s) => s.setView);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-line bg-canvas px-4">
      <button
        type="button"
        onClick={() => setView("exhibitions")}
        className="flex h-full items-center text-ink hover:opacity-60"
        aria-label={`${ARTIST_NAME}, reset to exhibitions`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/logo.svg")}
          alt={ARTIST_NAME}
          draggable={false}
          className="block h-5 w-auto select-none"
        />
      </button>
      <button
        type="button"
        aria-expanded={mobileMenuOpen}
        aria-haspopup="menu"
        onClick={() => setMobileMenuOpen((v) => !v)}
        className="text-ui text-ink hover:text-mute md:hidden"
      >
        {mobileMenuOpen ? "Close" : "Menu"}
      </button>
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </header>
  );
}
