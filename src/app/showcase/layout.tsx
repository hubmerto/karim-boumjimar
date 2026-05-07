import type { Metadata } from "next";

// Hidden recording surface for screen-capturing the site's
// animations. Excluded from search indexing so it doesn't pollute
// SEO results — there's no public link to it from the main site
// nav, the URL is intended to be shared by hand only.
export const metadata: Metadata = {
  title: "Showcase — Karim Boumjimar",
  robots: { index: false, follow: false },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
