import type { Metadata } from "next";

// Client page can't export metadata; canonical + title live in the layout.
export const metadata: Metadata = {
  title: "Grant, Karim Boumjimar",
  alternates: { canonical: "/grant" },
};

export default function GrantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
