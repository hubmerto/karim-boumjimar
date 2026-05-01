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
    <main className="min-h-screen bg-canvas text-ink">
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
      <article className="mx-auto max-w-[640px] px-4 pt-24 pb-24 text-[14px] leading-relaxed text-ink">
        <h1 className="mb-10 italic text-[10px] uppercase tracking-[0.1em] text-mute">
          {title}
        </h1>
        <div className="space-y-6">{children}</div>
      </article>
    </main>
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
      <h2 className="italic text-[10px] uppercase tracking-[0.1em] text-mute">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
