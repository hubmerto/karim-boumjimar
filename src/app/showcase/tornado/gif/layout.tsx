import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase · Tornado GIF — Karim Boumjimar",
  robots: { index: false, follow: false },
};

export default function ShowcaseTornadoGifLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
