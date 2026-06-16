import type { Metadata } from "next";

// Client page can't export metadata; canonical + title live in the layout.
export const metadata: Metadata = {
  title: "News, Karim Boumjimar",
  alternates: { canonical: "/news" },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
