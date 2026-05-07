import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase · Index navigation — Karim Boumjimar",
  robots: { index: false, follow: false },
};

export default function ShowcaseNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
