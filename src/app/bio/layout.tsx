import type { Metadata } from "next";

// Client page can't export metadata; canonical + title live in the layout.
export const metadata: Metadata = {
  title: "Bio, Karim Boumjimar",
  alternates: { canonical: "/bio" },
};

export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
