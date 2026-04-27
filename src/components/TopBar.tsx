"use client";

import { useState } from "react";
import { ARTIST_NAME } from "@/data/bio";
import { MobileMenu } from "@/components/MobileMenu";
import { useSelection } from "@/lib/store";

export function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const setView = useSelection((s) => s.setView);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between border-b border-line bg-canvas px-4">
      <button
        type="button"
        onClick={() => setView("exhibitions")}
        className="text-[13px] text-ink hover:text-mute"
        aria-label="Reset to exhibitions"
      >
        {ARTIST_NAME}
      </button>
      <button
        type="button"
        aria-expanded={mobileMenuOpen}
        aria-haspopup="menu"
        onClick={() => setMobileMenuOpen((v) => !v)}
        className="text-[13px] text-ink hover:text-mute md:hidden"
      >
        {mobileMenuOpen ? "Close" : "Menu"}
      </button>
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
}
