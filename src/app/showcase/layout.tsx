import type { Metadata } from "next";

// Apply noindex to every /showcase/* route at the layout level so
// individual route layouts don't have to repeat it. Per-route
// layouts can still set their own title; this one only contributes
// the robots field.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
