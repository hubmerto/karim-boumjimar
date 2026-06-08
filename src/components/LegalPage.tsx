"use client";

import { CrashOverlay } from "@/components/CrashOverlay";
import { Index } from "@/components/Index";
import { LeftToolbar } from "@/components/LeftToolbar";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { useSelection } from "@/lib/store";

/**
 * Shared chrome for the static legal pages (imprint, privacy).
 * Mounts the same TopBar + LeftToolbar + Index + Splash + CrashOverlay
 * as TextRouteShell so the "Index" button works from these routes too.
 * Previously the page had its own minimal header (logo only) and no
 * Index drawer mounted — clicking the LeftToolbar's Index button was
 * impossible because the LeftToolbar wasn't there.
 *
 * Doesn't call setView() — the legal links live in the LeftToolbar's
 * FOOTER, not the main nav list, so no list item should be marked
 * `aria-current`. Whatever view was set on the previous route stays
 * in the store; the most-recent main-list item keeps its highlight.
 * Imperfect but consistent with the spec ("Imprint" / "Privacy" are
 * legal disclaimers, not part of the artist's section nav).
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const indexOpen = useSelection((s) => s.indexOpen);
  const setIndexOpen = useSelection((s) => s.setIndexOpen);

  return (
    <>
      <TopBar />
      <LeftToolbar />
      {/* Body has overflow:hidden + height:100dvh (the canvas
          lockdown). The legal page is a fixed pane below the TopBar
          with its own internal vertical scroll — same pattern as
          BioView / ContactView / NewsView. The desktop `md:left-[200px]`
          clears the LeftToolbar so the article doesn't sit under it. */}
      <main className="fixed inset-0 top-16 z-0 overflow-y-auto bg-canvas text-ink md:top-12 md:left-[200px]">
        <article className="mx-auto max-w-[640px] px-4 pt-12 pb-24 text-caption leading-relaxed text-pretty break-words text-ink">
          <h1 className="mb-10 italic text-meta uppercase tracking-[0.1em] text-mute">
            {title}
          </h1>
          <div className="space-y-6">{children}</div>
        </article>
      </main>
      <Index open={indexOpen} onClose={() => setIndexOpen(false)} />
      <Splash />
      <CrashOverlay />
    </>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="italic text-meta uppercase tracking-[0.1em] text-mute">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
