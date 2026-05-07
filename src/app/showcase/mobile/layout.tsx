import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase · Mobile — Karim Boumjimar",
  robots: { index: false, follow: false },
};

export default function ShowcaseMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
