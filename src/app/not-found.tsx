import Link from "next/link";
import { TopBar } from "@/components/TopBar";

/**
 * Branded 404. Next renders this for notFound() (e.g. an unknown
 * /works/<slug>) and for any unmatched route, inside the root layout.
 * Without this file the bare Next default 404 (unstyled black-on-white)
 * would show — a brand seam on a polished art site.
 *
 * Reuses the real TopBar (logo → back to overview) so the page keeps
 * the site chrome, and provides an explicit "back to overview" link in
 * the body. The <main> here is this route's single landmark (TopBar is
 * a <header>, not a landmark conflict).
 */
export default function NotFound() {
  return (
    <>
      <TopBar />
      <main className="fixed inset-0 top-16 z-0 flex flex-col items-center justify-center gap-6 bg-canvas px-6 text-center text-ink md:top-12">
        <p className="italic text-meta uppercase tracking-[0.1em] text-mute">
          404
        </p>
        <h1 className="max-w-[26ch] text-2xl leading-tight tracking-tight text-ink">
          This page doesn’t exist.
        </h1>
        <Link
          href="/"
          className="text-ui text-mute underline underline-offset-4 hover:text-ink"
        >
          ← Back to overview
        </Link>
      </main>
    </>
  );
}
