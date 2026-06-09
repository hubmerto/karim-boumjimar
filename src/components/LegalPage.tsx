"use client";

import { CrashOverlay } from "@/components/CrashOverlay";
import { LeftToolbar } from "@/components/LeftToolbar";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";

/**
 * Shared chrome for the static legal pages (imprint, privacy).
 * Mounts the same TopBar + LeftToolbar + Splash + CrashOverlay as
 * TextRouteShell. No <Index> drawer: the index is a canvas feature, so
 * the LeftToolbar's Index button routes to the overview (/) and opens it
 * there rather than covering the legal text.
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
  return (
    <>
      <TopBar />
      <LeftToolbar />
      {/* Body has overflow:hidden + height:100dvh (the canvas
          lockdown). The legal page is a fixed pane below the TopBar
          with its own internal vertical scroll — same pattern as
          BioView / ContactView / NewsView. The desktop `md:left-[200px]`
          clears the LeftToolbar so the article doesn't sit under it. */}
      <main className="route-fade fixed inset-0 top-16 z-0 overflow-y-auto bg-canvas text-ink md:top-12 md:left-[200px]">
        {/* Left-aligned (no mx-auto) to match the other text pages, which
            start their content at the left padding rather than centering. */}
        <article className="max-w-[680px] px-6 py-12 text-caption leading-relaxed text-pretty break-words text-ink md:px-10 md:py-14">
          <h1 className="mb-10 italic text-meta uppercase tracking-[0.1em] text-mute">
            {title}
          </h1>
          <div className="space-y-6">{children}</div>
        </article>
      </main>
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
