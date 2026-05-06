import Link from "next/link";
import { ARTIST_NAME } from "@/data/bio";
import { asset } from "@/lib/paths";

/**
 * Shared chrome for the static legal pages (imprint, privacy). Mirrors the
 * TopBar so the click target on the logo still goes back to the canvas.
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
      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-line bg-canvas px-4">
        <Link
          href="/"
          aria-label={`${ARTIST_NAME}, back to home`}
          className="flex h-full items-center hover:opacity-60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/logo.svg")}
            alt={ARTIST_NAME}
            draggable={false}
            className="block h-5 w-auto select-none"
          />
        </Link>
      </header>
      {/* Body has overflow:hidden + height:100dvh (the canvas
          lockdown). The legal page is a fixed pane below the TopBar
          with its own internal vertical scroll — same pattern as
          BioView / AboutView / NewsView. Without it the article was
          clipped at viewport bottom and couldn't scroll. */}
      <main className="fixed inset-0 top-12 z-0 overflow-y-auto bg-canvas text-ink">
        <article className="mx-auto max-w-[640px] px-4 pt-12 pb-24 text-caption leading-relaxed text-pretty break-words text-ink">
          <h1 className="mb-10 italic text-meta uppercase tracking-[0.1em] text-mute">
            {title}
          </h1>
          <div className="space-y-6">{children}</div>
        </article>
      </main>
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
