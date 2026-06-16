import type { Metadata } from "next";

// The page itself is a client component and can't export metadata, so the
// canonical + per-route title live here in the (server) layout. The
// canonical folds tracking-param variants (e.g. /about?ref=artshelp.com)
// into the clean URL, which clears the Search Console duplicate warning.
export const metadata: Metadata = {
  title: "About, Karim Boumjimar",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
