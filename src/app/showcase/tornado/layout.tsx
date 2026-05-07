import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase · Tornado — Karim Boumjimar",
  robots: { index: false, follow: false },
};

export default function ShowcaseTornadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
